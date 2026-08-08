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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const orders_repository_port_1 = require("../../domain/repositories/orders-repository.port");
const comanda_event_publisher_port_1 = require("../contracts/comanda-event-publisher.port");
const websocket_publisher_port_1 = require("../../../../shared/application/contracts/websocket-publisher.port");
const redis_service_1 = require("../../../../shared/infrastructure/cache/redis.service");
const sync_service_1 = require("../../../sync/application/use-cases/sync.service");
const printing_service_1 = require("../../../printing/application/use-cases/printing.service");
const uuidv7_1 = require("uuidv7");
const CANCEL_PASSWORD = '123';
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(repo, natsPublisher, wsPublisher, redis, sync, printing) {
        this.repo = repo;
        this.natsPublisher = natsPublisher;
        this.wsPublisher = wsPublisher;
        this.redis = redis;
        this.sync = sync;
        this.printing = printing;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async listComandas(status) {
        const comandas = await this.repo.findMany(status ? { status } : undefined);
        return comandas.map((c) => this.enrichComanda(c));
    }
    async getComanda(id) {
        const comanda = await this.repo.findById(id);
        if (!comanda)
            throw new common_1.NotFoundException(`Comanda ${id} não encontrada`);
        return this.enrichComanda(comanda);
    }
    async openComanda(dto) {
        const id = (0, uuidv7_1.uuidv7)();
        const comanda = await this.repo.createComanda({
            id,
            tableId: dto.tableId ?? null,
            customerName: dto.customerName ?? null,
            userId: dto.userId ?? null,
            notes: dto.notes ?? null,
        });
        if (dto.tableId) {
            await this.repo.setTableStatus(dto.tableId, 'OCCUPIED');
            await this.redis.invalidateTables();
        }
        const enriched = this.enrichComanda(comanda);
        this.natsPublisher.publishComandaOpened(enriched);
        this.wsPublisher.emitComandaCreated(enriched);
        await this.sync.enqueue('comanda.created', 'Comanda', id, enriched);
        return enriched;
    }
    async addItems(comandaId, dto) {
        const comanda = await this.repo.findById(comandaId);
        if (!comanda)
            throw new common_1.NotFoundException('Comanda não encontrada');
        if (comanda.status === 'CLOSED' || comanda.status === 'CANCELLED') {
            throw new common_1.BadRequestException('Comanda encerrada');
        }
        const toInsert = [];
        for (const it of dto.items) {
            const menuItem = await this.repo.findMenuItemById(it.menuItemId);
            if (!menuItem || !menuItem.available) {
                throw new common_1.BadRequestException(`Item ${it.menuItemId} não disponível`);
            }
            toInsert.push({
                id: (0, uuidv7_1.uuidv7)(),
                menuItemId: it.menuItemId,
                quantity: it.quantity ?? 1,
                unitPrice: menuItem.price,
                notes: it.notes ?? null,
            });
        }
        const inserted = await this.repo.addItems(comandaId, toInsert);
        const newStatus = comanda.status === 'OPEN' ? 'PREPARING' : comanda.status;
        const updatedComanda = await this.repo.updateComanda(comandaId, { status: newStatus });
        if (dto.print !== false) {
            this.printing.printOrderItems(updatedComanda, inserted).catch((err) => this.logger.warn(`Print failed: ${err.message}`));
            await this.repo.markItemsSent(inserted.map((i) => i.id));
        }
        const enriched = this.enrichComanda(updatedComanda);
        this.natsPublisher.publishComandaItemsAdded({ comanda: enriched, items: inserted });
        this.wsPublisher.emitComandaUpdated(enriched);
        await this.sync.enqueue('comanda.items_added', 'Comanda', comandaId, { items: inserted });
        return { comanda: enriched, items: inserted };
    }
    async removeItem(comandaId, itemId, dto) {
        if (dto.password !== CANCEL_PASSWORD)
            throw new common_1.BadRequestException('Senha de segurança incorreta');
        if (!dto.reasonId)
            throw new common_1.BadRequestException('Selecione um motivo de cancelamento');
        const comanda = await this.repo.findById(comandaId);
        if (!comanda)
            throw new common_1.NotFoundException('Comanda não encontrada');
        if (comanda.status === 'CLOSED' || comanda.status === 'CANCELLED')
            throw new common_1.BadRequestException('Comanda encerrada');
        const item = await this.repo.findItemById(itemId);
        if (!item || item.comandaId !== comandaId)
            throw new common_1.NotFoundException('Item não encontrado nesta comanda');
        const reason = await this.repo.findCancellationReasonById(dto.reasonId);
        if (!reason)
            throw new common_1.NotFoundException('Motivo de cancelamento não encontrado');
        await this.repo.cancelItemWithRecord({
            itemId,
            comandaId,
            reasonId: dto.reasonId,
            itemName: item.menuItem.name,
            quantity: item.quantity,
            amount: Number(item.unitPrice) * item.quantity,
        });
        const updatedComanda = await this.repo.findById(comandaId);
        const enriched = this.enrichComanda(updatedComanda);
        this.natsPublisher.publishComandaUpdated(enriched);
        this.wsPublisher.emitComandaUpdated(enriched);
        await this.sync.enqueue('comanda.item_removed', 'Comanda', comandaId, { itemId, reasonId: dto.reasonId });
        return enriched;
    }
    async transferItems(sourceComandaId, dto) {
        if (!dto.itemIds?.length)
            throw new common_1.BadRequestException('Selecione ao menos um item');
        if (!dto.targetComandaId)
            throw new common_1.BadRequestException('Selecione a comanda de destino');
        if (dto.targetComandaId === sourceComandaId)
            throw new common_1.BadRequestException('A comanda de destino deve ser diferente da atual');
        const [source, target] = await Promise.all([
            this.repo.findById(sourceComandaId),
            this.repo.findById(dto.targetComandaId),
        ]);
        if (!source)
            throw new common_1.NotFoundException('Comanda de origem não encontrada');
        if (!target)
            throw new common_1.NotFoundException('Comanda de destino não encontrada');
        if (source.status === 'CLOSED' || source.status === 'CANCELLED')
            throw new common_1.BadRequestException('Comanda de origem encerrada');
        if (target.status === 'CLOSED' || target.status === 'CANCELLED')
            throw new common_1.BadRequestException('Comanda de destino encerrada');
        const items = source.items.filter((i) => dto.itemIds.includes(i.id));
        if (items.length !== dto.itemIds.length)
            throw new common_1.BadRequestException('Um ou mais itens não pertencem à comanda de origem');
        await this.repo.transferItems(dto.itemIds, dto.targetComandaId);
        const [updatedSource, updatedTarget] = await Promise.all([
            this.repo.findById(sourceComandaId),
            this.repo.findById(dto.targetComandaId),
        ]);
        const enrichedSource = this.enrichComanda(updatedSource);
        const enrichedTarget = this.enrichComanda(updatedTarget);
        this.natsPublisher.publishComandaUpdated(enrichedSource);
        this.wsPublisher.emitComandaUpdated(enrichedSource);
        this.wsPublisher.emitComandaUpdated(enrichedTarget);
        await this.sync.enqueue('comanda.items_transferred', 'Comanda', sourceComandaId, dto);
        return { source: enrichedSource, target: enrichedTarget };
    }
    async changeTable(comandaId, dto) {
        if (!dto.tableId)
            throw new common_1.BadRequestException('Selecione a mesa de destino');
        const comanda = await this.repo.findById(comandaId);
        if (!comanda)
            throw new common_1.NotFoundException('Comanda não encontrada');
        if (comanda.status === 'CLOSED' || comanda.status === 'CANCELLED')
            throw new common_1.BadRequestException('Comanda encerrada');
        const newTable = await this.repo.findTableById(dto.tableId);
        if (!newTable)
            throw new common_1.NotFoundException('Mesa não encontrada');
        const oldTableId = comanda.tableId;
        const updatedComanda = await this.repo.updateComanda(comandaId, { tableId: dto.tableId });
        await this.repo.setTableStatus(dto.tableId, 'OCCUPIED');
        if (oldTableId && oldTableId !== dto.tableId) {
            const stillActive = await this.repo.countActiveByTable(oldTableId);
            if (stillActive === 0)
                await this.repo.setTableStatus(oldTableId, 'FREE');
        }
        await this.redis.invalidateTables();
        const enriched = this.enrichComanda(updatedComanda);
        this.natsPublisher.publishComandaUpdated(enriched);
        this.wsPublisher.emitComandaUpdated(enriched);
        await this.sync.enqueue('comanda.table_changed', 'Comanda', comandaId, dto);
        return enriched;
    }
    async printSummary(comandaId) {
        const comanda = await this.repo.findById(comandaId);
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
        const comandas = await this.repo.findByTableAndStatus(tableId, ['OPEN', 'PREPARING']);
        if (comandas.length < 2)
            throw new common_1.BadRequestException('É preciso ao menos 2 comandas ativas na mesa para juntar');
        const [target, ...rest] = comandas;
        const snapshot = comandas.map((c) => ({
            number: c.number, customerName: c.customerName,
            items: c.items.map((i) => ({ name: i.menuItem.name, quantity: i.quantity, unitPrice: i.unitPrice, notes: i.notes })),
            subtotal: c.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0),
        }));
        const mergeNote = `Itens transferidos para comanda #${target.number} (junção de mesa)`;
        const merged = await this.repo.mergeComandas(target.id, rest.map((c) => c.id), mergeNote);
        this.printing.printMergeReceipt(target.table, snapshot, this.enrichComanda(merged)).catch((err) => this.logger.warn(`Merge receipt print failed: ${err.message}`));
        const enriched = this.enrichComanda(merged);
        this.natsPublisher.publishComandaUpdated(enriched);
        this.wsPublisher.emitComandaUpdated(enriched);
        for (const c of rest)
            this.wsPublisher.emitComandaUpdated({ ...c, status: 'CANCELLED' });
        await this.sync.enqueue('comanda.merged', 'Comanda', target.id, { tableId, mergedIds: rest.map((c) => c.id) });
        return enriched;
    }
    async closeComanda(comandaId, dto) {
        const comanda = await this.repo.findById(comandaId);
        if (!comanda)
            throw new common_1.NotFoundException('Comanda não encontrada');
        if (comanda.status === 'CLOSED')
            throw new common_1.BadRequestException('Comanda já fechada');
        const subtotal = comanda.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
        const serviceFeeBase = this.serviceFeeBase(comanda.items);
        let voucherDiscount = 0;
        let voucher = null;
        if (dto.voucherId) {
            voucher = await this.repo.findVoucherById(dto.voucherId);
            if (!voucher)
                throw new common_1.BadRequestException('Voucher não encontrado');
            if (voucher.status !== 'PAID')
                throw new common_1.BadRequestException('Voucher não está disponível para uso');
            voucherDiscount = Math.min(subtotal, Number(voucher.amount));
        }
        let total = subtotal;
        const sv = dto.surchargeValue ?? 0;
        const dv = dto.discountValue ?? 0;
        if (sv > 0 && dto.surchargeType)
            total += dto.surchargeType === 'percent' ? serviceFeeBase * sv / 100 : sv;
        if (dv > 0 && dto.discountType)
            total -= dto.discountType === 'percent' ? subtotal * dv / 100 : dv;
        if (voucherDiscount > 0)
            total -= voucherDiscount;
        total = Math.max(0, total);
        const paid = dto.payments.reduce((s, p) => s + p.amount, 0);
        if (Math.abs(paid - total) > 0.01) {
            throw new common_1.BadRequestException(`Divergência: pago ${paid.toFixed(2)} vs total ${total.toFixed(2)}`);
        }
        const openSession = await this.repo.findOpenCashSession();
        const { comanda: closedComanda, payments: insertedPayments } = await this.repo.closeComandaWithPayments(comandaId, {
            closureData: {
                status: 'CLOSED',
                closedAt: new Date(),
                surchargeType: dto.surchargeType ?? null,
                surchargeValue: dto.surchargeValue ?? 0,
                discountType: dto.discountType ?? null,
                discountValue: dto.discountValue ?? 0,
                voucherCode: voucher?.code ?? null,
                voucherDiscount,
            },
            payments: dto.payments.map((p) => ({
                id: (0, uuidv7_1.uuidv7)(),
                method: p.method,
                amount: p.amount,
                notes: p.notes ?? null,
                cashSessionId: openSession?.id ?? null,
            })),
            voucherId: dto.voucherId,
        });
        if (comanda.tableId) {
            const stillActive = await this.repo.countActiveByTable(comanda.tableId);
            if (stillActive === 0)
                await this.repo.setTableStatus(comanda.tableId, 'FREE');
            await this.redis.invalidateTables();
        }
        const enriched = this.enrichComanda({ ...closedComanda, payments: insertedPayments });
        if (dto.printReceipt !== false) {
            this.printing.printReceipt(closedComanda, insertedPayments, total).catch((err) => this.logger.warn(`Receipt print failed: ${err.message}`));
        }
        this.natsPublisher.publishComandaClosed(enriched);
        this.wsPublisher.emitComandaClosed(enriched);
        await this.sync.enqueue('comanda.closed', 'Comanda', comandaId, { ...enriched, payments: insertedPayments, total });
        return { comanda: enriched, payments: insertedPayments, subtotal, total };
    }
    serviceFeeBase(items) {
        return (items ?? []).reduce((s, i) => {
            return (i.menuItem?.chargeServiceFee !== false) ? s + Number(i.unitPrice) * i.quantity : s;
        }, 0);
    }
    enrichComanda(comanda) {
        const subtotal = (comanda.items ?? []).reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
        const serviceFeeBase = this.serviceFeeBase(comanda.items);
        let total = subtotal;
        const sv = Number(comanda.surchargeValue ?? 0);
        const dv = Number(comanda.discountValue ?? 0);
        const vv = Number(comanda.voucherDiscount ?? 0);
        if (sv > 0 && comanda.surchargeType)
            total += comanda.surchargeType === 'percent' ? serviceFeeBase * sv / 100 : sv;
        if (dv > 0 && comanda.discountType)
            total -= comanda.discountType === 'percent' ? subtotal * dv / 100 : dv;
        if (vv > 0)
            total -= vv;
        return { ...comanda, subtotal, total: Math.max(0, total), serviceFeeBase };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(orders_repository_port_1.ORDERS_REPOSITORY_PORT)),
    __param(1, (0, common_1.Inject)(comanda_event_publisher_port_1.COMANDA_EVENT_PUBLISHER_PORT)),
    __param(2, (0, common_1.Inject)(websocket_publisher_port_1.WEBSOCKET_PUBLISHER_PORT)),
    __metadata("design:paramtypes", [Object, Object, Object, redis_service_1.RedisService,
        sync_service_1.SyncService,
        printing_service_1.PrintingService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map