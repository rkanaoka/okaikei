import { Inject, Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ORDERS_REPOSITORY_PORT, OrdersRepositoryPort }              from '@/modules/ponto-de-venda/domain/repositories/orders-repository.port';
import { COMANDA_EVENT_PUBLISHER_PORT, ComandaEventPublisherPort }   from '@/modules/ponto-de-venda/application/contracts/comanda-event-publisher.port';
import { WEBSOCKET_PUBLISHER_PORT, WebSocketPublisherPort }          from '@/shared/application/contracts/websocket-publisher.port';
import { RedisService }  from '@/shared/infrastructure/cache/redis.service';
import { SyncService }   from '@/modules/sync/application/use-cases/sync.service';
import { PrintingService } from '@/modules/ponto-de-venda/application/use-cases/printing.service';
import { ComandaStatus, PaymentMethod } from '@prisma/client';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(ORDERS_REPOSITORY_PORT)          private readonly repo:        OrdersRepositoryPort,
    @Inject(COMANDA_EVENT_PUBLISHER_PORT)    private readonly natsPublisher: ComandaEventPublisherPort,
    @Inject(WEBSOCKET_PUBLISHER_PORT)        private readonly wsPublisher:   WebSocketPublisherPort,
    private readonly redis:    RedisService,
    private readonly sync:     SyncService,
    private readonly printing: PrintingService,
  ) {}

  // ── Comandas ──────────────────────────────────────────────────────────────

  async listComandas(status?: ComandaStatus) {
    const comandas = await this.repo.findMany(status ? { status } : undefined);
    return comandas.map((c) => this.enrichComanda(c));
  }

  async getComanda(id: string) {
    const comanda = await this.repo.findById(id);
    if (!comanda) throw new NotFoundException(`Comanda ${id} não encontrada`);
    return this.enrichComanda(comanda);
  }

  async openComanda(dto: {
    tableId?: string; customerName?: string; userId?: string; notes?: string;
  }) {
    const id      = uuidv7();
    const comanda = await this.repo.createComanda({
      id,
      tableId:      dto.tableId      ?? null,
      customerName: dto.customerName ?? null,
      userId:       dto.userId       ?? null,
      notes:        dto.notes        ?? null,
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

  async addItems(comandaId: string, dto: {
    items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
    print?: boolean;
  }) {
    const comanda = await this.repo.findById(comandaId);
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (comanda.status === 'CLOSED' || comanda.status === 'CANCELLED') {
      throw new BadRequestException('Comanda encerrada');
    }

    const toInsert: Array<{ id: string; menuItemId: string; quantity: number; unitPrice: number; notes?: string }> = [];
    for (const it of dto.items) {
      const menuItem = await this.repo.findMenuItemById(it.menuItemId);
      if (!menuItem || !menuItem.available) {
        throw new BadRequestException(`Item ${it.menuItemId} não disponível`);
      }
      toInsert.push({
        id:        uuidv7(),
        menuItemId: it.menuItemId,
        quantity:   it.quantity ?? 1,
        unitPrice:  menuItem.price,
        notes:      it.notes ?? null,
      });
    }

    const inserted = await this.repo.addItems(comandaId, toInsert);

    const newStatus = comanda.status === 'OPEN' ? 'PREPARING' : comanda.status;
    const updatedComanda = await this.repo.updateComanda(comandaId, { status: newStatus });

    if (dto.print !== false) {
      this.printing.printOrderItems(updatedComanda, inserted).catch((err) =>
        this.logger.warn(`Print failed: ${err.message}`),
      );
      await this.repo.markItemsSent(inserted.map((i) => i.id));
    }

    const enriched = this.enrichComanda(updatedComanda);
    this.natsPublisher.publishComandaItemsAdded({ comanda: enriched, items: inserted });
    this.wsPublisher.emitComandaUpdated(enriched);
    await this.sync.enqueue('comanda.items_added', 'Comanda', comandaId, { items: inserted });
    return { comanda: enriched, items: inserted };
  }

  async removeItem(comandaId: string, itemId: string, dto: { reasonId: string; garcomId: string }) {
    if (!dto.reasonId) throw new BadRequestException('Selecione um motivo de cancelamento');
    if (!dto.garcomId) throw new BadRequestException('Informe o garçom responsável pelo cancelamento');

    const garcom = await this.repo.findGarcomById(dto.garcomId);
    if (!garcom || !garcom.active) throw new BadRequestException('Garçom não encontrado');

    const comanda = await this.repo.findById(comandaId);
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (comanda.status === 'CLOSED' || comanda.status === 'CANCELLED') throw new BadRequestException('Comanda encerrada');

    const item = await this.repo.findItemById(itemId);
    if (!item || item.comandaId !== comandaId) throw new NotFoundException('Item não encontrado nesta comanda');

    const reason = await this.repo.findCancellationReasonById(dto.reasonId);
    if (!reason) throw new NotFoundException('Motivo de cancelamento não encontrado');

    await this.repo.cancelItemWithRecord({
      itemId,
      comandaId,
      reasonId:  dto.reasonId,
      garcomId:  dto.garcomId,
      itemName:  item.menuItem.name,
      quantity:  item.quantity,
      amount:    Number(item.unitPrice) * item.quantity,
    });

    const updatedComanda = await this.repo.findById(comandaId);
    const enriched = this.enrichComanda(updatedComanda);
    this.natsPublisher.publishComandaUpdated(enriched);
    this.wsPublisher.emitComandaUpdated(enriched);
    await this.sync.enqueue('comanda.item_removed', 'Comanda', comandaId, { itemId, reasonId: dto.reasonId });
    return enriched;
  }

  async transferItems(sourceComandaId: string, dto: { itemIds: string[]; targetComandaId: string }) {
    if (!dto.itemIds?.length) throw new BadRequestException('Selecione ao menos um item');
    if (!dto.targetComandaId) throw new BadRequestException('Selecione a comanda de destino');
    if (dto.targetComandaId === sourceComandaId) throw new BadRequestException('A comanda de destino deve ser diferente da atual');

    const [source, target] = await Promise.all([
      this.repo.findById(sourceComandaId),
      this.repo.findById(dto.targetComandaId),
    ]);
    if (!source) throw new NotFoundException('Comanda de origem não encontrada');
    if (!target) throw new NotFoundException('Comanda de destino não encontrada');
    if (source.status === 'CLOSED' || source.status === 'CANCELLED') throw new BadRequestException('Comanda de origem encerrada');
    if (target.status === 'CLOSED' || target.status === 'CANCELLED') throw new BadRequestException('Comanda de destino encerrada');

    const items = source.items.filter((i: any) => dto.itemIds.includes(i.id));
    if (items.length !== dto.itemIds.length) throw new BadRequestException('Um ou mais itens não pertencem à comanda de origem');

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

  async changeTable(comandaId: string, dto: { tableId: string }) {
    if (!dto.tableId) throw new BadRequestException('Selecione a mesa de destino');
    const comanda = await this.repo.findById(comandaId);
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (comanda.status === 'CLOSED' || comanda.status === 'CANCELLED') throw new BadRequestException('Comanda encerrada');

    const newTable = await this.repo.findTableById(dto.tableId);
    if (!newTable) throw new NotFoundException('Mesa não encontrada');

    const oldTableId = comanda.tableId;
    const updatedComanda = await this.repo.updateComanda(comandaId, { tableId: dto.tableId });
    await this.repo.setTableStatus(dto.tableId, 'OCCUPIED');

    if (oldTableId && oldTableId !== dto.tableId) {
      const stillActive = await this.repo.countActiveByTable(oldTableId);
      if (stillActive === 0) await this.repo.setTableStatus(oldTableId, 'FREE');
    }
    await this.redis.invalidateTables();

    const enriched = this.enrichComanda(updatedComanda);
    this.natsPublisher.publishComandaUpdated(enriched);
    this.wsPublisher.emitComandaUpdated(enriched);
    await this.sync.enqueue('comanda.table_changed', 'Comanda', comandaId, dto);
    return enriched;
  }

  async printSummary(comandaId: string) {
    const comanda = await this.repo.findById(comandaId);
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    try {
      await this.printing.printSummary(comanda);
    } catch (e: any) {
      throw new BadRequestException(`Falha ao imprimir resumo: ${e.message}`);
    }
    return { ok: true };
  }

  async mergeTableComandas(tableId: string) {
    if (!tableId) throw new BadRequestException('Informe a mesa');
    const comandas = await this.repo.findByTableAndStatus(tableId, ['OPEN', 'PREPARING']);
    if (comandas.length < 2) throw new BadRequestException('É preciso ao menos 2 comandas ativas na mesa para juntar');

    const [target, ...rest] = comandas;
    const snapshot = comandas.map((c: any) => ({
      number: c.number, customerName: c.customerName,
      items:  c.items.map((i: any) => ({ name: i.menuItem.name, quantity: i.quantity, unitPrice: i.unitPrice, notes: i.notes })),
      subtotal: c.items.reduce((s: number, i: any) => s + Number(i.unitPrice) * i.quantity, 0),
    }));

    const mergeNote = `Itens transferidos para comanda #${target.number} (junção de mesa)`;
    const merged    = await this.repo.mergeComandas(target.id, rest.map((c: any) => c.id), mergeNote);

    // Comprovante (não bloqueia)
    this.printing.printMergeReceipt(target.table, snapshot, this.enrichComanda(merged)).catch((err) =>
      this.logger.warn(`Merge receipt print failed: ${err.message}`),
    );

    const enriched = this.enrichComanda(merged);
    this.natsPublisher.publishComandaUpdated(enriched);
    this.wsPublisher.emitComandaUpdated(enriched);
    for (const c of rest) this.wsPublisher.emitComandaUpdated({ ...c, status: 'CANCELLED' });
    await this.sync.enqueue('comanda.merged', 'Comanda', target.id, { tableId, mergedIds: rest.map((c: any) => c.id) });
    return enriched;
  }

  async closeComanda(comandaId: string, dto: {
    surchargeType?:  string;
    surchargeValue?: number;
    discountType?:   string;
    discountValue?:  number;
    voucherId?:      string;
    partnershipId?:  string;
    closedByGarcomId?: string;
    discountReasonId?: string;
    payments: Array<{ method: PaymentMethod; amount: number; notes?: string }>;
    printReceipt?: boolean;
  }) {
    const comanda = await this.repo.findById(comandaId);
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (comanda.status === 'CLOSED') throw new BadRequestException('Comanda já fechada');

    if (dto.closedByGarcomId) {
      const garcom = await this.repo.findGarcomById(dto.closedByGarcomId);
      if (!garcom || !garcom.active) throw new BadRequestException('Garçom responsável pelo fechamento não encontrado');
    }

    if (dto.discountReasonId) {
      const discountReason = await this.repo.findDiscountReasonById(dto.discountReasonId);
      if (!discountReason) throw new BadRequestException('Motivo de desconto não encontrado');
    }

    const subtotal       = comanda.items.reduce((s: number, i: any) => s + Number(i.unitPrice) * i.quantity, 0);
    const serviceFeeBase = this.serviceFeeBase(comanda.items);

    let voucherDiscount = 0;
    let voucher: any    = null;
    if (dto.voucherId) {
      voucher = await this.repo.findVoucherById(dto.voucherId);
      if (!voucher) throw new BadRequestException('Voucher não encontrado');
      const isRecurringVoucher = voucher.status === 'RECURRING';
      if (!isRecurringVoucher && voucher.status !== 'PAID') {
        throw new BadRequestException('Voucher não está disponível para uso');
      }
      if (isRecurringVoucher && voucher.dueDate && new Date(voucher.dueDate) < new Date()) {
        throw new BadRequestException('Voucher recorrente vencido');
      }
      voucherDiscount = this.computeVoucherDiscount(voucher, comanda.items, subtotal);
    }

    let partnershipDiscount = 0;
    let partnership: any     = null;
    if (dto.partnershipId) {
      partnership = await this.repo.findPartnershipById(dto.partnershipId);
      if (!partnership) throw new BadRequestException('Parceria não encontrada');
      this.assertPartnershipUsable(partnership);
      partnershipDiscount = this.computePartnershipDiscount(partnership, comanda.items, subtotal);
    }

    let total = subtotal;
    const sv = dto.surchargeValue ?? 0;
    const dv = dto.discountValue  ?? 0;
    if (sv > 0 && dto.surchargeType) total += dto.surchargeType === 'percent' ? serviceFeeBase * sv / 100 : sv;
    if (dv > 0 && dto.discountType)  total -= dto.discountType  === 'percent' ? subtotal       * dv / 100 : dv;
    if (voucherDiscount > 0) total -= voucherDiscount;
    if (partnershipDiscount > 0) total -= partnershipDiscount;
    total = Math.max(0, total);

    const paid = dto.payments.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(paid - total) > 0.01) {
      throw new BadRequestException(`Divergência: pago ${paid.toFixed(2)} vs total ${total.toFixed(2)}`);
    }

    const openSession = await this.repo.findOpenCashSession();
    const { comanda: closedComanda, payments: insertedPayments } = await this.repo.closeComandaWithPayments(
      comandaId,
      {
        closureData: {
          status:         'CLOSED',
          closedAt:       new Date(),
          surchargeType:  dto.surchargeType  ?? null,
          surchargeValue: dto.surchargeValue ?? 0,
          discountType:   dto.discountType   ?? null,
          discountValue:  dto.discountValue  ?? 0,
          voucherCode:    voucher?.code       ?? null,
          voucherDiscount,
          partnershipCode:     partnership?.code ?? null,
          partnershipDiscount,
          closedByGarcomId: dto.closedByGarcomId ?? null,
          discountReasonId: dto.discountReasonId ?? null,
        },
        payments: dto.payments.map((p) => ({
          id:            uuidv7(),
          method:        p.method,
          amount:        p.amount,
          notes:         p.notes ?? null,
          cashSessionId: openSession?.id ?? null,
        })),
        voucherId: dto.voucherId,
        voucherDiscount,
      },
    );

    if (comanda.tableId) {
      const stillActive = await this.repo.countActiveByTable(comanda.tableId);
      if (stillActive === 0) await this.repo.setTableStatus(comanda.tableId, 'FREE');
      await this.redis.invalidateTables();
    }

    const enriched = this.enrichComanda({ ...closedComanda, payments: insertedPayments });

    if (dto.printReceipt !== false) {
      this.printing.printReceipt(closedComanda, insertedPayments, total).catch((err) =>
        this.logger.warn(`Receipt print failed: ${err.message}`),
      );
    }

    this.natsPublisher.publishComandaClosed(enriched);
    this.wsPublisher.emitComandaClosed(enriched);
    await this.sync.enqueue('comanda.closed', 'Comanda', comandaId, { ...enriched, payments: insertedPayments, total });
    return { comanda: enriched, payments: insertedPayments, subtotal, total };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Calcula o desconto de um voucher, aplicando suas condições (dia da semana,
   * pedido mínimo, itens específicos) e tipo (percentual ou valor fixo). */
  private computeVoucherDiscount(voucher: any, items: any[], subtotal: number): number {
    if (voucher.minOrderValue != null && subtotal < Number(voucher.minOrderValue)) {
      throw new BadRequestException(
        `Este voucher exige pedido mínimo de ${Number(voucher.minOrderValue).toFixed(2)}`,
      );
    }
    if (voucher.validDaysOfWeek?.length > 0 && !voucher.validDaysOfWeek.includes(new Date().getDay())) {
      throw new BadRequestException('Este voucher não é válido hoje');
    }

    const base = voucher.menuItemIds?.length > 0
      ? items
          .filter((i: any) => voucher.menuItemIds.includes(i.menuItemId))
          .reduce((s: number, i: any) => s + Number(i.unitPrice) * i.quantity, 0)
      : subtotal;

    const raw = voucher.discountType === 'percent'
      ? base * Number(voucher.amount) / 100
      : Math.min(base, Number(voucher.amount));

    return Math.max(0, Math.min(subtotal, raw));
  }

  /** Confere se a parceria pode ser usada agora: ativa, dentro da validade e das condições de uso. */
  private assertPartnershipUsable(p: any) {
    if (!p.active) throw new BadRequestException('Esta parceria está inativa');
    const now = new Date();
    if (p.startDate && now < new Date(p.startDate)) throw new BadRequestException('Esta parceria ainda não iniciou');
    if (p.endDate) {
      const end = new Date(p.endDate);
      end.setHours(23, 59, 59, 999);
      if (now > end) throw new BadRequestException('Esta parceria está expirada');
    }
    if (p.validDaysOfWeek?.length > 0 && !p.validDaysOfWeek.includes(now.getDay())) {
      throw new BadRequestException('Esta parceria não é válida hoje');
    }
    if (p.startTime && p.endTime) {
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (hhmm < p.startTime || hhmm > p.endTime) {
        throw new BadRequestException(`Esta parceria só é válida das ${p.startTime} às ${p.endTime}`);
      }
    }
  }

  /** Soma o desconto de cada cupom ativo da parceria — cada cupom é avaliado
   * independentemente contra os itens do pedido. */
  private computePartnershipDiscount(partnership: any, items: any[], subtotal: number): number {
    let total = 0;
    for (const coupon of partnership.coupons ?? []) {
      if (!coupon.active) continue;
      total += this.computeCouponDiscount(coupon, items, subtotal);
    }
    return Math.max(0, Math.min(subtotal, total));
  }

  // "2 por 1": desconta o valor de 1 unidade quando há 2+ no pedido — uma
  // única vez por pedido, independente da quantidade total (não é por par).
  private computeCouponDiscount(coupon: any, items: any[], subtotal: number): number {
    switch (coupon.type) {
      case 'TWO_FOR_ONE_ITEM': {
        const matching = items.filter((i: any) => i.menuItemId === coupon.menuItemId);
        const qty = matching.reduce((s: number, i: any) => s + i.quantity, 0);
        if (qty < 2) return 0;
        return Number(matching[0]?.unitPrice ?? 0);
      }
      case 'TWO_FOR_ONE_CATEGORY': {
        const matching = items.filter((i: any) => i.menuItem?.categoryId === coupon.categoryId);
        const qty = matching.reduce((s: number, i: any) => s + i.quantity, 0);
        if (qty < 2) return 0;
        return Math.min(...matching.map((i: any) => Number(i.unitPrice)));
      }
      case 'ITEM_DISCOUNT': {
        const found = items.find((i: any) => i.menuItemId === coupon.menuItemId);
        if (!found) return 0;
        const base = Number(found.unitPrice);
        const raw = coupon.discountType === 'percent' ? (base * Number(coupon.amount)) / 100 : Math.min(base, Number(coupon.amount));
        return Math.max(0, raw);
      }
      case 'ORDER_DISCOUNT': {
        if (coupon.minOrderValue != null && subtotal < Number(coupon.minOrderValue)) return 0;
        const raw = coupon.discountType === 'percent' ? (subtotal * Number(coupon.amount)) / 100 : Number(coupon.amount);
        return Math.max(0, raw);
      }
      default:
        return 0;
    }
  }

  private serviceFeeBase(items: any[]): number {
    return (items ?? []).reduce((s: number, i: any) => {
      return (i.menuItem?.chargeServiceFee !== false) ? s + Number(i.unitPrice) * i.quantity : s;
    }, 0);
  }

  private enrichComanda(comanda: any) {
    const subtotal       = (comanda.items ?? []).reduce((s: number, i: any) => s + Number(i.unitPrice) * i.quantity, 0);
    const serviceFeeBase = this.serviceFeeBase(comanda.items);
    let total = subtotal;
    const sv = Number(comanda.surchargeValue ?? 0);
    const dv = Number(comanda.discountValue  ?? 0);
    const vv = Number(comanda.voucherDiscount ?? 0);
    const pv = Number(comanda.partnershipDiscount ?? 0);
    if (sv > 0 && comanda.surchargeType) total += comanda.surchargeType === 'percent' ? serviceFeeBase * sv / 100 : sv;
    if (dv > 0 && comanda.discountType)  total -= comanda.discountType  === 'percent' ? subtotal       * dv / 100 : dv;
    if (vv > 0) total -= vv;
    if (pv > 0) total -= pv;
    return { ...comanda, subtotal, total: Math.max(0, total), serviceFeeBase };
  }
}
