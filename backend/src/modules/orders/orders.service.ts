import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService }   from '@/common/prisma/prisma.service';
import { RedisService }    from '@/common/redis/redis.service';
import { NatsService }     from '@/common/nats/nats.service';
import { EventsGateway }   from '@/gateway/events.gateway';
import { SyncService }     from '@/modules/sync/sync.service';
import { PrintingService } from '@/modules/printing/printing.service';
import { uuidv7 }          from 'uuidv7';
import { Prisma, ComandaStatus, PaymentMethod } from '@prisma/client';

const CANCEL_PASSWORD = '123';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma:    PrismaService,
    private readonly redis:     RedisService,
    private readonly nats:      NatsService,
    private readonly gateway:   EventsGateway,
    private readonly sync:      SyncService,
    private readonly printing:  PrintingService,
  ) {}

  // ── Comandas ──────────────────────────────────────────────────────────────

  async listComandas(status?: ComandaStatus) {
    const where: Prisma.ComandaWhereInput = status ? { status } : {};
    const comandas = await this.prisma.comanda.findMany({
      where,
      include: {
        table:    true,
        user:     { select: { id: true, name: true } },
        items:    { include: { menuItem: true } },
        payments: true,
      },
      orderBy: { openedAt: 'desc' },
    });
    return comandas.map((c) => this.enrichComanda(c));
  }

  async getComanda(id: string) {
    const comanda = await this.prisma.comanda.findUnique({
      where:   { id },
      include: {
        table:    true,
        user:     { select: { id: true, name: true } },
        items:    { include: { menuItem: true } },
        payments: true,
      },
    });
    if (!comanda) throw new NotFoundException(`Comanda ${id} não encontrada`);
    return this.enrichComanda(comanda);
  }

  async openComanda(dto: {
    tableId?: string;
    customerName?: string;
    userId?: string;
    notes?: string;
  }) {
    const id = uuidv7();

    // Uma mesa/balcão pode ter várias comandas simultâneas (uma por cliente/grupo)

    const comanda = await this.prisma.comanda.create({
      data: {
        id,
        tableId:      dto.tableId ?? null,
        customerName: dto.customerName ?? null,
        userId:       dto.userId ?? null,
        notes:        dto.notes ?? null,
      },
      include: { table: true, items: true, payments: true },
    });

    // Atualizar status da mesa
    if (dto.tableId) {
      await this.prisma.table.update({
        where: { id: dto.tableId },
        data:  { status: 'OCCUPIED' },
      });
      await this.redis.invalidateTables();
    }

    const enriched = this.enrichComanda(comanda);

    // Propagar
    this.nats.publish('comanda.opened', enriched);
    this.gateway.emitComandaCreated(enriched);
    await this.sync.enqueue('comanda.created', 'Comanda', id, enriched);

    return enriched;
  }

  async addItems(comandaId: string, dto: {
    items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
    print?: boolean;
  }) {
    const comanda = await this.prisma.comanda.findUnique({ where: { id: comandaId } });
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (comanda.status === 'CLOSED' || comanda.status === 'CANCELLED') {
      throw new BadRequestException('Comanda encerrada');
    }

    const inserted = [];
    for (const it of dto.items) {
      const menuItem = await this.prisma.menuItem.findUnique({ where: { id: it.menuItemId } });
      if (!menuItem || !menuItem.available) {
        throw new BadRequestException(`Item ${it.menuItemId} não disponível`);
      }
      const item = await this.prisma.comandaItem.create({
        data: {
          id:        uuidv7(),
          comandaId,
          menuItemId: it.menuItemId,
          quantity:   it.quantity ?? 1,
          unitPrice:  menuItem.price,
          notes:      it.notes ?? null,
        },
        include: { menuItem: true },
      });
      inserted.push(item);
    }

    // Comanda passa a PREPARING
    const updatedComanda = await this.prisma.comanda.update({
      where: { id: comandaId },
      data:  { status: comanda.status === 'OPEN' ? 'PREPARING' : comanda.status },
      include: { table: true, items: { include: { menuItem: true } }, payments: true, user: { select: { id: true, name: true } } },
    });

    // Impressão por categoria (não bloqueia)
    if (dto.print !== false) {
      this.printing.printOrderItems(updatedComanda, inserted).catch((err) =>
        this.logger.warn(`Print failed: ${err.message}`),
      );
      // Marcar como SENT
      await this.prisma.comandaItem.updateMany({
        where: { id: { in: inserted.map((i) => i.id) } },
        data:  { status: 'SENT', sentAt: new Date() },
      });
    }

    const enriched = this.enrichComanda(updatedComanda);
    this.nats.publish('comanda.items_added', { comanda: enriched, items: inserted });
    this.gateway.emitOrderSent(inserted, enriched);
    await this.sync.enqueue('comanda.items_added', 'Comanda', comandaId, { items: inserted });

    return { comanda: enriched, items: inserted };
  }

  async removeItem(comandaId: string, itemId: string, dto: { reasonId: string; password: string }) {
    if (dto.password !== CANCEL_PASSWORD) {
      throw new BadRequestException('Senha de segurança incorreta');
    }
    if (!dto.reasonId) {
      throw new BadRequestException('Selecione um motivo de cancelamento');
    }

    const comanda = await this.prisma.comanda.findUnique({ where: { id: comandaId } });
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (comanda.status === 'CLOSED' || comanda.status === 'CANCELLED') {
      throw new BadRequestException('Comanda encerrada');
    }

    const item = await this.prisma.comandaItem.findUnique({ where: { id: itemId }, include: { menuItem: true } });
    if (!item || item.comandaId !== comandaId) {
      throw new NotFoundException('Item não encontrado nesta comanda');
    }

    const reason = await this.prisma.cancellationReason.findUnique({ where: { id: dto.reasonId } });
    if (!reason) throw new NotFoundException('Motivo de cancelamento não encontrado');

    await this.prisma.$transaction([
      this.prisma.cancellation.create({
        data: {
          id:        uuidv7(),
          reasonId:  dto.reasonId,
          comandaId,
          itemName:  item.menuItem.name,
          quantity:  item.quantity,
          amount:    Number(item.unitPrice) * item.quantity,
        },
      }),
      this.prisma.comandaItem.delete({ where: { id: itemId } }),
    ]);

    const updatedComanda = await this.prisma.comanda.findUnique({
      where:   { id: comandaId },
      include: { table: true, items: { include: { menuItem: true } }, payments: true },
    });

    const enriched = this.enrichComanda(updatedComanda);
    this.nats.publish('comanda.item_removed', { comandaId, itemId, reasonId: dto.reasonId });
    this.gateway.emitComandaUpdated(enriched);
    await this.sync.enqueue('comanda.item_removed', 'Comanda', comandaId, { itemId, reasonId: dto.reasonId });

    return enriched;
  }

  async closeComanda(comandaId: string, dto: {
    surchargeType?:  string;
    surchargeValue?: number;
    discountType?:   string;
    discountValue?:  number;
    payments: Array<{ method: PaymentMethod; amount: number; notes?: string }>;
    printReceipt?: boolean;
  }) {
    const comanda = await this.prisma.comanda.findUnique({
      where:   { id: comandaId },
      include: { items: { include: { menuItem: true } }, payments: true },
    });
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (comanda.status === 'CLOSED') throw new BadRequestException('Comanda já fechada');

    const subtotal = comanda.items.reduce(
      (s, i) => s + Number(i.unitPrice) * i.quantity, 0,
    );

    let total = subtotal;
    const sv = dto.surchargeValue ?? 0;
    const dv = dto.discountValue  ?? 0;
    if (sv > 0 && dto.surchargeType) {
      total += dto.surchargeType === 'percent' ? subtotal * sv / 100 : sv;
    }
    if (dv > 0 && dto.discountType) {
      total -= dto.discountType === 'percent' ? subtotal * dv / 100 : dv;
    }

    const paid = dto.payments.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(paid - total) > 0.01) {
      throw new BadRequestException(
        `Divergência: pago ${paid.toFixed(2)} vs total ${total.toFixed(2)}`,
      );
    }

    // Pagamentos são atribuídos ao caixa aberto no momento, se houver um
    const openCashSession = await this.prisma.cashSession.findFirst({ where: { status: 'OPEN' } });

    // Transação atômica: fechar comanda + inserir pagamentos
    const [closedComanda, insertedPayments] = await this.prisma.$transaction(async (tx) => {
      const closed = await tx.comanda.update({
        where: { id: comandaId },
        data: {
          status:         'CLOSED',
          closedAt:       new Date(),
          surchargeType:  dto.surchargeType  ?? null,
          surchargeValue: dto.surchargeValue ?? 0,
          discountType:   dto.discountType   ?? null,
          discountValue:  dto.discountValue  ?? 0,
        },
        include: { table: true, items: { include: { menuItem: true } }, payments: true },
      });

      const payments = await Promise.all(
        dto.payments.map((p) =>
          tx.payment.create({
            data: {
              id: uuidv7(), comandaId, method: p.method, amount: p.amount, notes: p.notes ?? null,
              cashSessionId: openCashSession?.id ?? null,
            },
          }),
        ),
      );

      return [closed, payments];
    });

    // Liberar mesa apenas se não houver outras comandas ativas nela
    if (comanda.tableId) {
      const stillActive = await this.prisma.comanda.count({
        where: { tableId: comanda.tableId, status: { in: ['OPEN', 'PREPARING'] } },
      });
      if (stillActive === 0) {
        await this.prisma.table.update({
          where: { id: comanda.tableId },
          data:  { status: 'FREE' },
        });
      }
      await this.redis.invalidateTables();
    }

    const enriched = this.enrichComanda({ ...closedComanda, payments: insertedPayments });

    // Impressão (não bloqueia)
    if (dto.printReceipt !== false) {
      this.printing.printReceipt(closedComanda, insertedPayments, total).catch((err) =>
        this.logger.warn(`Receipt print failed: ${err.message}`),
      );
    }

    this.nats.publish('comanda.closed', enriched);
    this.gateway.emitComandaClosed(enriched);
    await this.sync.enqueue('comanda.closed', 'Comanda', comandaId, {
      ...enriched,
      payments: insertedPayments,
      total,
    });

    return { comanda: enriched, payments: insertedPayments, subtotal, total };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private enrichComanda(comanda: any) {
    const subtotal = (comanda.items ?? []).reduce(
      (s: number, i: any) => s + Number(i.unitPrice) * i.quantity, 0,
    );
    let total = subtotal;
    const sv = Number(comanda.surchargeValue ?? 0);
    const dv = Number(comanda.discountValue  ?? 0);
    if (sv > 0 && comanda.surchargeType) {
      total += comanda.surchargeType === 'percent' ? subtotal * sv / 100 : sv;
    }
    if (dv > 0 && comanda.discountType) {
      total -= comanda.discountType === 'percent' ? subtotal * dv / 100 : dv;
    }
    return { ...comanda, subtotal, total };
  }
}
