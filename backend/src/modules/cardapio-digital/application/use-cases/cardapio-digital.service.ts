import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class CardapioDigitalService {
  constructor(private readonly prisma: PrismaService) {}

  // ── GET /cardapio/menu ────────────────────────────────────────────────────

  async getMenu() {
    const [items, categories] = await Promise.all([
      this.prisma.menuItem.findMany({
        where: { available: true },
        include: { menuCategory: true },
        orderBy: [{ menuCategory: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      }),
      this.prisma.menuCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);

    return {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
      })),
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? null,
        price: Number(item.price),
        category: item.category,
        categoryId: item.categoryId ?? null,
        available: item.available,
        sortOrder: item.sortOrder,
        imageUrl: item.imageUrl ?? null,
      })),
    };
  }

  // ── POST /cardapio/pedido ─────────────────────────────────────────────────

  async createPedido(dto: {
    customerName: string;
    tableNumber: string;
    items: Array<{ menuItemId: string; qty: number; notes?: string }>;
  }) {
    const table = await this.prisma.table.findFirst({
      where: { number: Number(dto.tableNumber) },
    });

    // Validate items and snapshot prices
    const enrichedItems: Array<{
      id: string;
      menuItemId: string;
      quantity: number;
      unitPrice: number;
      notes: string | null;
    }> = [];

    for (const it of dto.items) {
      const menuItem = await this.prisma.menuItem.findUnique({ where: { id: it.menuItemId } });
      if (!menuItem) throw new BadRequestException(`Item ${it.menuItemId} não encontrado`);
      if (!menuItem.available) throw new BadRequestException(`Item "${menuItem.name}" não disponível`);
      enrichedItems.push({
        id: uuidv7(),
        menuItemId: it.menuItemId,
        quantity: it.qty ?? 1,
        unitPrice: Number(menuItem.price),
        notes: it.notes ?? null,
      });
    }

    const comandaId = uuidv7();

    await this.prisma.comanda.create({
      data: {
        id: comandaId,
        tableId: table?.id ?? null,
        customerName: dto.customerName ?? null,
        notes: !table ? `Mesa: ${dto.tableNumber}` : null,
      },
    });

    await this.prisma.comandaItem.createMany({
      data: enrichedItems.map((it) => ({
        id: it.id,
        comandaId,
        menuItemId: it.menuItemId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        notes: it.notes,
        status: 'PENDING' as any,
      })),
    });

    return this.getComanda(comandaId);
  }

  // ── GET /cardapio/comanda/:token ──────────────────────────────────────────

  async getComanda(token: string) {
    const comanda = await this.prisma.comanda.findUnique({
      where: { id: token },
      include: {
        items: { include: { menuItem: true } },
        table: true,
      },
    });

    if (!comanda) throw new NotFoundException(`Comanda ${token} não encontrada`);
    return this.mapComandaToResponse(comanda);
  }

  // ── POST /cardapio/comanda/:token/items ───────────────────────────────────

  async addItems(
    token: string,
    dto: { items: Array<{ menuItemId: string; qty: number; notes?: string }> },
  ) {
    const comanda = await this.prisma.comanda.findUnique({ where: { id: token } });
    if (!comanda) throw new NotFoundException(`Comanda ${token} não encontrada`);
    if (comanda.status !== 'OPEN' && comanda.status !== 'PREPARING') {
      throw new BadRequestException('Comanda não está aberta para receber novos itens');
    }

    const toInsert: Array<{
      id: string;
      menuItemId: string;
      quantity: number;
      unitPrice: number;
      notes: string | null;
    }> = [];

    for (const it of dto.items) {
      const menuItem = await this.prisma.menuItem.findUnique({ where: { id: it.menuItemId } });
      if (!menuItem) throw new BadRequestException(`Item ${it.menuItemId} não encontrado`);
      if (!menuItem.available) throw new BadRequestException(`Item "${menuItem.name}" não disponível`);
      toInsert.push({
        id: uuidv7(),
        menuItemId: it.menuItemId,
        quantity: it.qty ?? 1,
        unitPrice: Number(menuItem.price),
        notes: it.notes ?? null,
      });
    }

    await this.prisma.comandaItem.createMany({
      data: toInsert.map((it) => ({
        id: it.id,
        comandaId: token,
        menuItemId: it.menuItemId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        notes: it.notes,
        status: 'PENDING' as any,
      })),
    });

    return this.getComanda(token);
  }

  // ── Helper ────────────────────────────────────────────────────────────────

  private mapComandaToResponse(comanda: any) {
    const tableNumber =
      comanda.table?.number?.toString() ??
      (comanda.notes?.startsWith('Mesa: ')
        ? comanda.notes.replace('Mesa: ', '')
        : null);

    const total = (comanda.items ?? [])
      .filter((i: any) => i.status !== 'CANCELLED')
      .reduce((s: number, i: any) => s + Number(i.unitPrice) * i.quantity, 0);

    return {
      token: comanda.id,
      customerName: comanda.customerName ?? null,
      tableNumber,
      status: comanda.status,
      items: (comanda.items ?? []).map((i: any) => ({
        id: i.id,
        name: i.menuItem?.name ?? '',
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        status: i.status,
        notes: i.notes ?? null,
      })),
      total: Math.round(total * 100) / 100,
    };
  }
}
