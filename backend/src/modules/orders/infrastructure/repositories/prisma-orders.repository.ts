import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { OrdersRepositoryPort } from '@/modules/orders/domain/repositories/orders-repository.port';
import { ComandaStatus } from '@prisma/client';
import { uuidv7 } from 'uuidv7';

const COMANDA_INCLUDE = {
  table:    true,
  user:     { select: { id: true, name: true } },
  items:    { include: { menuItem: true } },
  payments: true,
};

@Injectable()
export class PrismaOrdersRepository implements OrdersRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filter?: { status?: ComandaStatus }) {
    return this.prisma.comanda.findMany({
      where:   filter?.status ? { status: filter.status } : {},
      include: COMANDA_INCLUDE,
      orderBy: { openedAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.comanda.findUnique({ where: { id }, include: COMANDA_INCLUDE });
  }

  async findByTableAndStatus(tableId: string, statuses: string[]) {
    return this.prisma.comanda.findMany({
      where:   { tableId, status: { in: statuses as ComandaStatus[] } },
      include: { items: { include: { menuItem: true } }, table: true },
      orderBy: { openedAt: 'asc' },
    });
  }

  async countActiveByTable(tableId: string) {
    return this.prisma.comanda.count({
      where: { tableId, status: { in: ['OPEN', 'PREPARING'] } },
    });
  }

  async createComanda(data: {
    id: string; tableId?: string | null; customerName?: string | null;
    userId?: string | null; notes?: string | null;
  }) {
    return this.prisma.comanda.create({
      data,
      include: { table: true, items: true, payments: true },
    });
  }

  async updateComanda(id: string, data: Record<string, any>) {
    return this.prisma.comanda.update({ where: { id }, data, include: COMANDA_INCLUDE });
  }

  async setTableStatus(tableId: string, status: string) {
    await this.prisma.table.update({ where: { id: tableId }, data: { status: status as any } });
  }

  async findTableById(tableId: string) {
    return this.prisma.table.findUnique({ where: { id: tableId } });
  }

  async findMenuItemById(menuItemId: string) {
    return this.prisma.menuItem.findUnique({ where: { id: menuItemId } });
  }

  async addItems(comandaId: string, items: Array<{
    id: string; menuItemId: string; quantity: number; unitPrice: number; notes?: string;
  }>) {
    await this.prisma.comandaItem.createMany({
      data: items.map((i) => ({ ...i, comandaId })),
    });
    return this.prisma.comandaItem.findMany({
      where:   { id: { in: items.map((i) => i.id) } },
      include: { menuItem: true },
    });
  }

  async markItemsSent(ids: string[]) {
    await this.prisma.comandaItem.updateMany({
      where: { id: { in: ids } },
      data:  { status: 'SENT', sentAt: new Date() },
    });
  }

  async getItemsWithMenu(comandaId: string) {
    return this.prisma.comandaItem.findMany({
      where:   { comandaId, status: { not: 'CANCELLED' as any } },
      include: { menuItem: true },
    });
  }

  async findItemById(itemId: string) {
    return this.prisma.comandaItem.findUnique({ where: { id: itemId }, include: { menuItem: true } });
  }

  async updateItemQuantity(itemId: string, quantity: number) {
    return this.prisma.comandaItem.update({ where: { id: itemId }, data: { quantity } });
  }

  async transferItems(itemIds: string[], targetComandaId: string) {
    await this.prisma.comandaItem.updateMany({
      where: { id: { in: itemIds } },
      data:  { comandaId: targetComandaId },
    });
  }

  async findCancellationReasonById(reasonId: string) {
    return this.prisma.cancellationReason.findUnique({ where: { id: reasonId } });
  }

  async cancelItemWithRecord(data: {
    itemId: string; comandaId: string; reasonId: string; itemName: string;
    quantity: number; amount: number;
  }) {
    await this.prisma.$transaction([
      this.prisma.cancellation.create({
        data: {
          id:        uuidv7(),
          reasonId:  data.reasonId,
          comandaId: data.comandaId,
          itemName:  data.itemName,
          quantity:  data.quantity,
          amount:    data.amount,
        },
      }),
      this.prisma.comandaItem.delete({ where: { id: data.itemId } }),
    ]);
  }

  async createCancellationRecord(data: {
    id: string; comandaId: string; reasonId: string; note?: string; cancelledAt: Date;
  }) {
    await this.prisma.cancellation.create({ data: data as any });
  }

  async findOpenCashSession() {
    return this.prisma.cashSession.findFirst({
      where:   { status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
  }

  async closeComandaWithPayments(comandaId: string, data: {
    closureData: Record<string, any>;
    payments: Array<{ id: string; method: string; amount: number; notes?: string | null; cashSessionId?: string | null }>;
    voucherId?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const txAny = tx as any;
      if (data.voucherId) {
        const consumed = await txAny.voucher.updateMany({
          where: { id: data.voucherId, status: 'PAID' },
          data:  { status: 'USED', comandaId },
        });
        if (consumed.count === 0) throw new Error('Voucher não está mais disponível para uso');
      }

      const closed = await tx.comanda.update({
        where:   { id: comandaId },
        data:    data.closureData,
        include: COMANDA_INCLUDE,
      });

      const payments = await Promise.all(
        data.payments.map((p) => tx.payment.create({ data: { ...p, comandaId } as any })),
      );

      return { comanda: closed, payments };
    });
  }

  async findVoucherById(id: string) {
    return (this.prisma as any).voucher.findUnique({ where: { id } });
  }

  async findVoucherByCode(code: string) {
    return (this.prisma as any).voucher.findFirst({ where: { code } });
  }

  async mergeComandas(targetId: string, sourceIds: string[], notes: string) {
    return this.prisma.$transaction(async (tx) => {
      for (const sourceId of sourceIds) {
        await tx.comandaItem.updateMany({
          where: { comandaId: sourceId },
          data:  { comandaId: targetId },
        });
        await tx.comanda.update({
          where: { id: sourceId },
          data:  { status: 'CANCELLED' as ComandaStatus, notes },
        });
      }
      return tx.comanda.findUnique({ where: { id: targetId }, include: COMANDA_INCLUDE });
    });
  }
}
