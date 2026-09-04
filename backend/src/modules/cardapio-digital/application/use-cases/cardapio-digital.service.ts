import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { uuidv7 } from 'uuidv7';

const OPTION_GROUPS_INCLUDE = {
  optionGroups: {
    where:   { active: true },
    include: { options: { where: { active: true }, orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }] } },
  },
};

// A relação M2M não preserva ordem customizada — reordena pelos ids em optionGroupOrder (mesma lógica de MenuService).
function orderGroups(groups: any[], order: string[]): any[] {
  if (!order?.length) return groups;
  const byId    = new Map(groups.map((g) => [g.id, g]));
  const ordered = order.filter((id) => byId.has(id)).map((id) => byId.get(id));
  const rest    = groups.filter((g) => !order.includes(g.id));
  return [...ordered, ...rest];
}

@Injectable()
export class CardapioDigitalService {
  constructor(private readonly prisma: PrismaService) {}

  // ── GET /cardapio/menu ────────────────────────────────────────────────────

  async getMenu() {
    const [items, categories] = await Promise.all([
      this.prisma.menuItem.findMany({
        where: { available: true },
        include: { menuCategory: true, ...OPTION_GROUPS_INCLUDE },
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
        optionGroups: orderGroups(item.optionGroups as any[], item.optionGroupOrder).map((g: any) => ({
          id: g.id,
          name: g.name,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          options: g.options.map((o: any) => ({ id: o.id, name: o.name, price: Number(o.price) })),
        })),
      })),
    };
  }

  // Soma ao preço base do item o valor das opções selecionadas — a fonte da
  // verdade do preço é sempre o servidor (nunca o total calculado no
  // cliente), validando que cada opção pertence de fato a um grupo
  // vinculado ao item (evita id de opção de outro item/grupo).
  private async computeUnitPrice(menuItemId: string, selectedOptionIds?: string[]): Promise<{ menuItem: any; unitPrice: number }> {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: OPTION_GROUPS_INCLUDE,
    });
    if (!menuItem) throw new BadRequestException(`Item ${menuItemId} não encontrado`);
    if (!menuItem.available) throw new BadRequestException(`Item "${menuItem.name}" não disponível`);

    const base = Number(menuItem.price);
    if (!selectedOptionIds?.length) return { menuItem, unitPrice: base };

    const priceByOptionId = new Map<string, number>();
    for (const g of (menuItem as any).optionGroups ?? []) {
      for (const o of g.options ?? []) priceByOptionId.set(o.id, Number(o.price));
    }

    let extra = 0;
    for (const optionId of selectedOptionIds) {
      const price = priceByOptionId.get(optionId);
      if (price === undefined) {
        throw new BadRequestException(`Opção inválida para o item "${menuItem.name}"`);
      }
      extra += price;
    }
    return { menuItem, unitPrice: base + extra };
  }

  // ── POST /cardapio/pedido ─────────────────────────────────────────────────

  async createPedido(dto: {
    customerName: string;
    tableId?: string;
    tableNumber?: string;
    items: Array<{ menuItemId: string; qty: number; notes?: string; selectedOptionIds?: string[] }>;
  }) {
    // tableId vem do QR Code (identifica mesa/balcão/mesa externa sem ambiguidade).
    // tableNumber é o fallback manual legado — assume tipo "MESA".
    const table = dto.tableId
      ? await this.prisma.table.findUnique({ where: { id: dto.tableId } })
      : dto.tableNumber
        ? await this.prisma.table.findFirst({ where: { type: 'MESA' as any, number: Number(dto.tableNumber) } })
        : null;

    // Validate items and snapshot prices
    const enrichedItems: Array<{
      id: string;
      menuItemId: string;
      quantity: number;
      unitPrice: number;
      notes: string | null;
    }> = [];

    for (const it of dto.items) {
      const { unitPrice } = await this.computeUnitPrice(it.menuItemId, it.selectedOptionIds);
      enrichedItems.push({
        id: uuidv7(),
        menuItemId: it.menuItemId,
        quantity: it.qty ?? 1,
        unitPrice,
        notes: it.notes ?? null,
      });
    }

    const comandaId = uuidv7();

    await this.prisma.comanda.create({
      data: {
        id: comandaId,
        tableId: table?.id ?? null,
        customerName: dto.customerName ?? null,
        notes: !table ? `Mesa: ${dto.tableNumber ?? dto.tableId ?? '?'}` : null,
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
    dto: { items: Array<{ menuItemId: string; qty: number; notes?: string; selectedOptionIds?: string[] }> },
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
      const { unitPrice } = await this.computeUnitPrice(it.menuItemId, it.selectedOptionIds);
      toInsert.push({
        id: uuidv7(),
        menuItemId: it.menuItemId,
        quantity: it.qty ?? 1,
        unitPrice,
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
      comanda.table?.label ??
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
