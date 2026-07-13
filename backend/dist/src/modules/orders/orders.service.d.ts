import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { NatsService } from '@/common/nats/nats.service';
import { EventsGateway } from '@/gateway/events.gateway';
import { SyncService } from '@/modules/sync/sync.service';
import { PrintingService } from '@/modules/printing/printing.service';
import { Prisma, ComandaStatus, PaymentMethod } from '@prisma/client';
export declare class OrdersService {
    private readonly prisma;
    private readonly redis;
    private readonly nats;
    private readonly gateway;
    private readonly sync;
    private readonly printing;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService, nats: NatsService, gateway: EventsGateway, sync: SyncService, printing: PrintingService);
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
    closeComanda(comandaId: string, dto: {
        surchargeType?: string;
        surchargeValue?: number;
        discountType?: string;
        discountValue?: number;
        payments: Array<{
            method: PaymentMethod;
            amount: number;
            notes?: string;
        }>;
        printReceipt?: boolean;
    }): Promise<{
        comanda: any;
        payments: {
            id: string;
            createdAt: Date;
            notes: string | null;
            comandaId: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            amount: Prisma.Decimal;
            paidAt: Date;
            cashSessionId: string | null;
        }[];
        subtotal: number;
        total: number;
    }>;
    private enrichComanda;
}
