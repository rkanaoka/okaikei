import { OrdersRepositoryPort } from '@/modules/orders/domain/repositories/orders-repository.port';
import { ComandaEventPublisherPort } from '@/modules/orders/application/contracts/comanda-event-publisher.port';
import { WebSocketPublisherPort } from '@/shared/application/contracts/websocket-publisher.port';
import { RedisService } from '@/shared/infrastructure/cache/redis.service';
import { SyncService } from '@/modules/sync/application/use-cases/sync.service';
import { PrintingService } from '@/modules/printing/application/use-cases/printing.service';
import { ComandaStatus, PaymentMethod } from '@prisma/client';
export declare class OrdersService {
    private readonly repo;
    private readonly natsPublisher;
    private readonly wsPublisher;
    private readonly redis;
    private readonly sync;
    private readonly printing;
    private readonly logger;
    constructor(repo: OrdersRepositoryPort, natsPublisher: ComandaEventPublisherPort, wsPublisher: WebSocketPublisherPort, redis: RedisService, sync: SyncService, printing: PrintingService);
    listComandas(status?: ComandaStatus): Promise<any[]>;
    getComanda(id: string): Promise<any>;
    openComanda(dto: {
        tableId?: string;
        customerName?: string;
        userId?: string;
        notes?: string;
    }): Promise<any>;
    addItems(comandaId: string, dto: {
        items: Array<{
            menuItemId: string;
            quantity: number;
            notes?: string;
        }>;
        print?: boolean;
    }): Promise<{
        comanda: any;
        items: any[];
    }>;
    removeItem(comandaId: string, itemId: string, dto: {
        reasonId: string;
        password: string;
    }): Promise<any>;
    transferItems(sourceComandaId: string, dto: {
        itemIds: string[];
        targetComandaId: string;
    }): Promise<{
        source: any;
        target: any;
    }>;
    changeTable(comandaId: string, dto: {
        tableId: string;
    }): Promise<any>;
    printSummary(comandaId: string): Promise<{
        ok: boolean;
    }>;
    mergeTableComandas(tableId: string): Promise<any>;
    closeComanda(comandaId: string, dto: {
        surchargeType?: string;
        surchargeValue?: number;
        discountType?: string;
        discountValue?: number;
        voucherId?: string;
        payments: Array<{
            method: PaymentMethod;
            amount: number;
            notes?: string;
        }>;
        printReceipt?: boolean;
    }): Promise<{
        comanda: any;
        payments: any[];
        subtotal: any;
        total: any;
    }>;
    private serviceFeeBase;
    private enrichComanda;
}
