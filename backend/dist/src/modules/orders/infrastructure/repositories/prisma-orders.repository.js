"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaOrdersRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../shared/infrastructure/database/prisma.service");
const uuidv7_1 = require("uuidv7");
const COMANDA_INCLUDE = {
    table: true,
    user: { select: { id: true, name: true } },
    items: { include: { menuItem: true } },
    payments: true,
};
let PrismaOrdersRepository = class PrismaOrdersRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findMany(filter) {
        return this.prisma.comanda.findMany({
            where: filter?.status ? { status: filter.status } : {},
            include: COMANDA_INCLUDE,
            orderBy: { openedAt: 'desc' },
        });
    }
    async findById(id) {
        return this.prisma.comanda.findUnique({ where: { id }, include: COMANDA_INCLUDE });
    }
    async findByTableAndStatus(tableId, statuses) {
        return this.prisma.comanda.findMany({
            where: { tableId, status: { in: statuses } },
            include: { items: { include: { menuItem: true } }, table: true },
            orderBy: { openedAt: 'asc' },
        });
    }
    async countActiveByTable(tableId) {
        return this.prisma.comanda.count({
            where: { tableId, status: { in: ['OPEN', 'PREPARING'] } },
        });
    }
    async createComanda(data) {
        return this.prisma.comanda.create({
            data,
            include: { table: true, items: true, payments: true },
        });
    }
    async updateComanda(id, data) {
        return this.prisma.comanda.update({ where: { id }, data, include: COMANDA_INCLUDE });
    }
    async setTableStatus(tableId, status) {
        await this.prisma.table.update({ where: { id: tableId }, data: { status: status } });
    }
    async findTableById(tableId) {
        return this.prisma.table.findUnique({ where: { id: tableId } });
    }
    async findMenuItemById(menuItemId) {
        return this.prisma.menuItem.findUnique({ where: { id: menuItemId } });
    }
    async addItems(comandaId, items) {
        await this.prisma.comandaItem.createMany({
            data: items.map((i) => ({ ...i, comandaId })),
        });
        return this.prisma.comandaItem.findMany({
            where: { id: { in: items.map((i) => i.id) } },
            include: { menuItem: true },
        });
    }
    async markItemsSent(ids) {
        await this.prisma.comandaItem.updateMany({
            where: { id: { in: ids } },
            data: { status: 'SENT', sentAt: new Date() },
        });
    }
    async getItemsWithMenu(comandaId) {
        return this.prisma.comandaItem.findMany({
            where: { comandaId, status: { not: 'CANCELLED' } },
            include: { menuItem: true },
        });
    }
    async findItemById(itemId) {
        return this.prisma.comandaItem.findUnique({ where: { id: itemId }, include: { menuItem: true } });
    }
    async updateItemQuantity(itemId, quantity) {
        return this.prisma.comandaItem.update({ where: { id: itemId }, data: { quantity } });
    }
    async transferItems(itemIds, targetComandaId) {
        await this.prisma.comandaItem.updateMany({
            where: { id: { in: itemIds } },
            data: { comandaId: targetComandaId },
        });
    }
    async findCancellationReasonById(reasonId) {
        return this.prisma.cancellationReason.findUnique({ where: { id: reasonId } });
    }
    async cancelItemWithRecord(data) {
        await this.prisma.$transaction([
            this.prisma.cancellation.create({
                data: {
                    id: (0, uuidv7_1.uuidv7)(),
                    reasonId: data.reasonId,
                    comandaId: data.comandaId,
                    itemName: data.itemName,
                    quantity: data.quantity,
                    amount: data.amount,
                },
            }),
            this.prisma.comandaItem.delete({ where: { id: data.itemId } }),
        ]);
    }
    async createCancellationRecord(data) {
        await this.prisma.cancellation.create({ data: data });
    }
    async findOpenCashSession() {
        return this.prisma.cashSession.findFirst({
            where: { status: 'OPEN' },
            orderBy: { openedAt: 'desc' },
        });
    }
    async closeComandaWithPayments(comandaId, data) {
        return this.prisma.$transaction(async (tx) => {
            const txAny = tx;
            if (data.voucherId) {
                const consumed = await txAny.voucher.updateMany({
                    where: { id: data.voucherId, status: 'PAID' },
                    data: { status: 'USED', comandaId },
                });
                if (consumed.count === 0)
                    throw new Error('Voucher não está mais disponível para uso');
            }
            const closed = await tx.comanda.update({
                where: { id: comandaId },
                data: data.closureData,
                include: COMANDA_INCLUDE,
            });
            const payments = await Promise.all(data.payments.map((p) => tx.payment.create({ data: { ...p, comandaId } })));
            return { comanda: closed, payments };
        });
    }
    async findVoucherById(id) {
        return this.prisma.voucher.findUnique({ where: { id } });
    }
    async findVoucherByCode(code) {
        return this.prisma.voucher.findFirst({ where: { code } });
    }
    async mergeComandas(targetId, sourceIds, notes) {
        return this.prisma.$transaction(async (tx) => {
            for (const sourceId of sourceIds) {
                await tx.comandaItem.updateMany({
                    where: { comandaId: sourceId },
                    data: { comandaId: targetId },
                });
                await tx.comanda.update({
                    where: { id: sourceId },
                    data: { status: 'CANCELLED', notes },
                });
            }
            return tx.comanda.findUnique({ where: { id: targetId }, include: COMANDA_INCLUDE });
        });
    }
};
exports.PrismaOrdersRepository = PrismaOrdersRepository;
exports.PrismaOrdersRepository = PrismaOrdersRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaOrdersRepository);
//# sourceMappingURL=prisma-orders.repository.js.map