import { OrdersService } from './orders.service';
import { ComandaStatus, PaymentMethod } from '@prisma/client';
export declare class OrdersController {
    private readonly orders;
    constructor(orders: OrdersService);
    list(status?: ComandaStatus): Promise<any[]>;
    get(id: string): Promise<any>;
    open(body: {
        tableId?: string;
        customerName?: string;
        userId?: string;
        notes?: string;
    }): Promise<any>;
    addItems(id: string, body: {
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
    removeItem(id: string, itemId: string, body: {
        reasonId: string;
        password: string;
    }): Promise<any>;
    transferItems(id: string, body: {
        itemIds: string[];
        targetComandaId: string;
    }): Promise<{
        source: any;
        target: any;
    }>;
    changeTable(id: string, body: {
        tableId: string;
    }): Promise<any>;
    printSummary(id: string): Promise<{
        ok: boolean;
    }>;
    mergeTable(body: {
        tableId: string;
    }): Promise<any>;
    close(id: string, body: {
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
        payments: {
            id: string;
            notes: string | null;
            createdAt: Date;
            comandaId: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            amount: import("@prisma/client/runtime/library").Decimal;
            paidAt: Date;
            cashSessionId: string | null;
        }[];
        subtotal: number;
        total: number;
    }>;
}
