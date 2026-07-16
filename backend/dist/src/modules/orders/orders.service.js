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
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const redis_service_1 = require("../../common/redis/redis.service");
const nats_service_1 = require("../../common/nats/nats.service");
const events_gateway_1 = require("../../gateway/events.gateway");
const sync_service_1 = require("../sync/sync.service");
const printing_service_1 = require("../printing/printing.service");
const uuidv7_1 = require("uuidv7");
const CANCEL_PASSWORD = '123';
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(prisma, redis, nats, gateway, sync, printing) {
        this.prisma = prisma;
        this.redis = redis;
        this.nats = nats;
        this.gateway = gateway;
        this.sync = sync;
        this.printing = printing;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async listComandas(status) {
        const where = status ? { status } : {};
        const comandas = await this.prisma.comanda.findMany({
            where,
            include: {
                table: true,
                user: { select: { id: true, name: true } },
                items: { include: { menuItem: true } },
                payments: true,
            },
            orderBy: { openedAt: 'desc' },
        });
        return comandas.map((c) => this.enrichComanda(c));
    }
    async getComanda(id) {
        const comanda = await this.prisma.comanda.findUnique({
            where: { id },
            include: {
                table: true,
                user: { select: { id: true, name: true } },
                items: { include: { menuItem: true } },
                payments: true,
            },
        });
        if (!comanda)
            throw new common_1.NotFoundException(`Comanda ${id} não encontrada`);
        return this.enrichComanda(comanda);
    }
    async openComanda(dto) {
        const id = (0, uuidv7_1.uuidv7)();
        const comanda = await this.prisma.comanda.create({
            data: {
                id,
                tableId: dto.tableId ?? null,
                customerName: dto.customerName ?? null,
                userId: dto.userId ?? null,
                notes: dto.notes ?? null,
            },
            include: { table: true, items: true, payments: true },
        });
        if (dto.tableId) {
            await this.prisma.table.update({
                where: { id: dto.tableId },
                data: { status: 'OCCUPIED' },
            });
            await this.redis.invalidateTables();
        }
        const enriched = this.enrichComanda(comanda);
        this.nats.publish('comanda.opened', enriched);
        this.gateway.emitComandaCreated(enriched);
        await this.sync.enqueue('comanda.created', 'Comanda', id, enriched);
        return enriched;
    }
    async addItems(comandaId, dto) {
        const comanda = await this.prisma.comanda.findUnique({ where: { id: comandaId } });
        if (!comanda)
            throw new common_1.NotFoundException('Comanda não encontrada');
        if (comanda.status === 'CLOSED' || comanda.status === 'CANCELLED') {
            throw new common_1.BadRequestException('Comanda encerrada');
        }
        const inserted = [];
        for (const it of dto.items) {
            const menuItem = await this.prisma.menuItem.findUnique({ where: { id: it.menuItemId } });
            if (!menuItem || !menuItem.available) {
                throw new common_1.BadRequestException(`Item ${it.menuItemId} não disponível`);
            }
            const item = await this.prisma.comandaItem.create({
                data: {
                    id: (0, uuidv7_1.uuidv7)(),
                    comandaId,
                    menuItemId: it.menuItemId,
                    quantity: it.quantity ?? 1,
                    unitPrice: menuItem.price,
                    notes: it.notes ?? null,
                },
                include: { menuItem: true },
            });
            inserted.push(item);
        }
        const updatedComanda = await this.prisma.comanda.update({
            where: { id: comandaId },
            data: { status: comanda.status === 'OPEN' ? 'PREPARING' : comanda.status },
            include: { table: true, items: { include: { menuItem: true } }, payments: true, user: { select: { id: true, name: true } } },
        });
        if (dto.print !== false) {
            this.printing.printOrderItems(updatedComanda, inserted).catch((err) => this.logger.warn(`Print failed: ${err.message}`));
            await this.prisma.comandaItem.updateMany({
                where: { id: { in: inserted.map((i) => i.id) } },
                data: { status: 'SENT', sentAt: new Date() },
            });
        }
        const enriched = this.enrichComanda(updatedComanda);
        this.nats.publish('comanda.items_added', { comanda: enriched, items: inserted });
        this.gateway.emitOrderSent(inserted, enriched);
        await this.sync.enqueue('comanda.items_added', 'Comanda', comandaId, { items: inserted });
        return { comanda: enriched, items: inserted };
    }
    async removeItem(comandaId, itemId, dto) {
        if (dto.password !== CANCEL_PASSWORD) {
            throw new common_1.BadRequestException('Senha de segurança incorreta');
        }
        if (!dto.reasonId) {
            throw new common_1.BadRequestException('Selecione um motivo de cancelamento');
        }
        const comanda = await this.prisma.comanda.findUnique({ where: { id: comandaId } });
        if (!comanda)
            throw new common_1.NotFoundException('Comanda não encontrada');
        if (comanda.status === 'CLOSED' || comanda.status === 'CANCELLED') {
            throw new common_1.BadRequestException('Comanda encerrada');
        }
        const item = await this.prisma.comandaItem.findUnique({ where: { id: itemId }, include: { menuItem: true } });
        if (!item || item.comandaId !== comandaId) {
            throw new common_1.NotFoundException('Item não encontrado nesta comanda');
        }
        const reason = await this.prisma.cancellationReason.findUnique({ where: { id: dto.reasonId } });
        if (!reason)
            throw new common_1.NotFoundException('Motivo de cancelamento não encontrado');
        await this.prisma.$transaction([
            this.prisma.cancellation.create({
                data: {
                    id: (0, uuidv7_1.uuidv7)(),
                    reasonId: dto.reasonId,
                    comandaId,
                    itemName: item.menuItem.name,
                    quantity: item.quantity,
                    amount: Number(item.unitPrice) * item.quantity,
                },
            }),
            this.prisma.comandaItem.delete({ where: { id: itemId } }),
        ]);
        const updatedComanda = await this.prisma.comanda.findUnique({
            where: { id: comandaId },
            include: { table: true, items: { include: { menuItem: true } }, payments: true },
        });
        const enriched = this.enrichComanda(updatedComanda);
        this.nats.publish('comanda.item_removed', { comandaId, itemId, reasonId: dto.reasonId });
        this.gateway.emitComandaUpdated(enriched);
        await this.sync.enqueue('comanda.item_removed', 'Comanda', comandaId, { itemId, reasonId: dto.reasonId });
        return enriched;
    }
    async transferItems(sourceComandaId, dto) {
        if (!dto.itemIds?.length)
            throw new common_1.BadRequestException('Selecione ao menos um item');
        if (!dto.targetComandaId)
            throw new common_1.BadRequestException('Selecione a comanda de destino');
        if (dto.targetComandaId === sourceComandaId) {
            throw new common_1.BadRequestException('A comanda de destino deve ser diferente da atual');
        }
        const [source, target] = await Promise.all([
            this.prisma.comanda.findUnique({ where: { id: sourceComandaId } }),
            this.prisma.comanda.findUnique({ where: { id: dto.targetComandaId } }),
        ]);
        if (!source)
            throw new common_1.NotFoundException('Comanda de origem não encontrada');
        if (!target)
            throw new common_1.NotFoundException('Comanda de destino não encontrada');
        if (source.status === 'CLOSED' || source.status === 'CANCELLED')
            throw new common_1.BadRequestException('Comanda de origem encerrada');
        if (target.status === 'CLOSED' || target.status === 'CANCELLED')
            throw new common_1.BadRequestException('Comanda de destino encerrada');
        const items = await this.prisma.comandaItem.findMany({ where: { id: { in: dto.itemIds } } });
        if (items.some((i) => i.comandaId !== sourceComandaId)) {
            throw new common_1.BadRequestException('Um ou mais itens não pertencem à comanda de origem');
        }
        await this.prisma.comandaItem.updateMany({
            where: { id: { in: dto.itemIds } },
            data: { comandaId: dto.targetComandaId },
        });
        const [updatedSource, updatedTarget] = await Promise.all([
            this.prisma.comanda.findUnique({
                where: { id: sourceComandaId },
                include: { table: true, items: { include: { menuItem: true } }, payments: true },
            }),
            this.prisma.comanda.findUnique({
                where: { id: dto.targetComandaId },
                include: { table: true, items: { include: { menuItem: true } }, payments: true },
            }),
        ]);
        const enrichedSource = this.enrichComanda(updatedSource);
        const enrichedTarget = this.enrichComanda(updatedTarget);
        this.nats.publish('comanda.items_transferred', { sourceComandaId, targetComandaId: dto.targetComandaId, itemIds: dto.itemIds });
        this.gateway.emitComandaUpdated(enrichedSource);
        this.gateway.emitComandaUpdated(enrichedTarget);
        await this.sync.enqueue('comanda.items_transferred', 'Comanda', sourceComandaId, dto);
        return { source: enrichedSource, target: enrichedTarget };
    }
    async changeTable(comandaId, dto) {
        if (!dto.tableId)
            throw new common_1.BadRequestException('Selecione a mesa de destino');
        const comanda = await this.prisma.comanda.findUnique({ where: { id: comandaId } });
        if (!comanda)
            throw new common_1.NotFoundException('Comanda não encontrada');
        if (comanda.status === 'CLOSED' || comanda.status === 'CANCELLED') {
            throw new common_1.BadRequestException('Comanda encerrada');
        }
        const newTable = await this.prisma.table.findUnique({ where: { id: dto.tableId } });
        if (!newTable)
            throw new common_1.NotFoundException('Mesa não encontrada');
        const oldTableId = comanda.tableId;
        const updatedComanda = await this.prisma.comanda.update({
            where: { id: comandaId },
            data: { tableId: dto.tableId },
            include: { table: true, items: { include: { menuItem: true } }, payments: true },
        });
        await this.prisma.table.update({ where: { id: dto.tableId }, data: { status: 'OCCUPIED' } });
        if (oldTableId && oldTableId !== dto.tableId) {
            const stillActive = await this.prisma.comanda.count({
                where: { tableId: oldTableId, status: { in: ['OPEN', 'PREPARING'] } },
            });
            if (stillActive === 0) {
                await this.prisma.table.update({ where: { id: oldTableId }, data: { status: 'FREE' } });
            }
        }
        await this.redis.invalidateTables();
        const enriched = this.enrichComanda(updatedComanda);
        this.nats.publish('comanda.table_changed', { comandaId, oldTableId, tableId: dto.tableId });
        this.gateway.emitComandaUpdated(enriched);
        await this.sync.enqueue('comanda.table_changed', 'Comanda', comandaId, dto);
        return enriched;
    }
    async printSummary(comandaId) {
        const comanda = await this.prisma.comanda.findUnique({
            where: { id: comandaId },
            include: { table: true, items: { include: { menuItem: true } }, payments: true },
        });
        if (!comanda)
            throw new common_1.NotFoundException('Comanda não encontrada');
        try {
            await this.printing.printSummary(comanda);
        }
        catch (e) {
            throw new common_1.BadRequestException(`Falha ao imprimir resumo: ${e.message}`);
        }
        return { ok: true };
    }
    async mergeTableComandas(tableId) {
        if (!tableId)
            throw new common_1.BadRequestException('Informe a mesa');
        const comandas = await this.prisma.comanda.findMany({
            where: { tableId, status: { in: ['OPEN', 'PREPARING'] } },
            include: { items: { include: { menuItem: true } }, table: true },
            orderBy: { openedAt: 'asc' },
        });
        if (comandas.length < 2) {
            throw new common_1.BadRequestException('É preciso ao menos 2 comandas ativas na mesa para juntar');
        }
        const [target, ...rest] = comandas;
        const snapshot = comandas.map((c) => ({
            number: c.number,
            customerName: c.customerName,
            items: c.items.map((i) => ({ name: i.menuItem.name, quantity: i.quantity, unitPrice: i.unitPrice, notes: i.notes })),
            subtotal: c.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0),
        }));
        await this.prisma.$transaction(async (tx) => {
            for (const source of rest) {
                await tx.comandaItem.updateMany({
                    where: { comandaId: source.id },
                    data: { comandaId: target.id },
                });
                await tx.comanda.update({
                    where: { id: source.id },
                    data: { status: 'CANCELLED', notes: `Itens transferidos para comanda #${target.number} (junção de mesa)` },
                });
            }
            if (!target.customerName) {
                const withName = rest.find((c) => c.customerName);
                if (withName) {
                    await tx.comanda.update({ where: { id: target.id }, data: { customerName: withName.customerName } });
                }
            }
        });
        const merged = await this.prisma.comanda.findUnique({
            where: { id: target.id },
            include: { table: true, items: { include: { menuItem: true } }, payments: true },
        });
        const enriched = this.enrichComanda(merged);
        this.printing.printMergeReceipt(target.table, snapshot, enriched).catch((err) => this.logger.warn(`Merge receipt print failed: ${err.message}`));
        this.nats.publish('comanda.merged', { tableId, targetId: target.id, mergedIds: rest.map((c) => c.id) });
        this.gateway.emitComandaUpdated(enriched);
        for (const c of rest) {
            this.gateway.emitComandaUpdated({ ...c, status: 'CANCELLED' });
        }
        await this.sync.enqueue('comanda.merged', 'Comanda', target.id, { tableId, mergedIds: rest.map((c) => c.id) });
        return enriched;
    }
    async closeComanda(comandaId, dto) {
        const comanda = await this.prisma.comanda.findUnique({
            where: { id: comandaId },
            include: { items: { include: { menuItem: true } }, payments: true },
        });
        if (!comanda)
            throw new common_1.NotFoundException('Comanda não encontrada');
        if (comanda.status === 'CLOSED')
            throw new common_1.BadRequestException('Comanda já fechada');
        const subtotal = comanda.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
        const serviceFeeBase = this.serviceFeeBase(comanda.items);
        let total = subtotal;
        const sv = dto.surchargeValue ?? 0;
        const dv = dto.discountValue ?? 0;
        if (sv > 0 && dto.surchargeType) {
            total += dto.surchargeType === 'percent' ? serviceFeeBase * sv / 100 : sv;
        }
        if (dv > 0 && dto.discountType) {
            total -= dto.discountType === 'percent' ? subtotal * dv / 100 : dv;
        }
        const paid = dto.payments.reduce((s, p) => s + p.amount, 0);
        if (Math.abs(paid - total) > 0.01) {
            throw new common_1.BadRequestException(`Divergência: pago ${paid.toFixed(2)} vs total ${total.toFixed(2)}`);
        }
        const openCashSession = await this.prisma.cashSession.findFirst({ where: { status: 'OPEN' } });
        const [closedComanda, insertedPayments] = await this.prisma.$transaction(async (tx) => {
            const closed = await tx.comanda.update({
                where: { id: comandaId },
                data: {
                    status: 'CLOSED',
                    closedAt: new Date(),
                    surchargeType: dto.surchargeType ?? null,
                    surchargeValue: dto.surchargeValue ?? 0,
                    discountType: dto.discountType ?? null,
                    discountValue: dto.discountValue ?? 0,
                },
                include: { table: true, items: { include: { menuItem: true } }, payments: true },
            });
            const payments = await Promise.all(dto.payments.map((p) => tx.payment.create({
                data: {
                    id: (0, uuidv7_1.uuidv7)(), comandaId, method: p.method, amount: p.amount, notes: p.notes ?? null,
                    cashSessionId: openCashSession?.id ?? null,
                },
            })));
            return [closed, payments];
        });
        if (comanda.tableId) {
            const stillActive = await this.prisma.comanda.count({
                where: { tableId: comanda.tableId, status: { in: ['OPEN', 'PREPARING'] } },
            });
            if (stillActive === 0) {
                await this.prisma.table.update({
                    where: { id: comanda.tableId },
                    data: { status: 'FREE' },
                });
            }
            await this.redis.invalidateTables();
        }
        const enriched = this.enrichComanda({ ...closedComanda, payments: insertedPayments });
        if (dto.printReceipt !== false) {
            this.printing.printReceipt(closedComanda, insertedPayments, total).catch((err) => this.logger.warn(`Receipt print failed: ${err.message}`));
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
    serviceFeeBase(items) {
        return (items ?? []).reduce((s, i) => {
            const eligible = i.menuItem?.chargeServiceFee !== false;
            return eligible ? s + Number(i.unitPrice) * i.quantity : s;
        }, 0);
    }
    enrichComanda(comanda) {
        const subtotal = (comanda.items ?? []).reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
        const serviceFeeBase = this.serviceFeeBase(comanda.items);
        let total = subtotal;
        const sv = Number(comanda.surchargeValue ?? 0);
        const dv = Number(comanda.discountValue ?? 0);
        if (sv > 0 && comanda.surchargeType) {
            total += comanda.surchargeType === 'percent' ? serviceFeeBase * sv / 100 : sv;
        }
        if (dv > 0 && comanda.discountType) {
            total -= comanda.discountType === 'percent' ? subtotal * dv / 100 : dv;
        }
        return { ...comanda, subtotal, total, serviceFeeBase };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        nats_service_1.NatsService,
        events_gateway_1.EventsGateway,
        sync_service_1.SyncService,
        printing_service_1.PrintingService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map