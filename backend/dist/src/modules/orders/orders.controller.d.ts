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
    close(id: string, body: {
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
            amount: import("@prisma/client/runtime/library").Decimal;
            paidAt: Date;
        }[];
        subtotal: number;
        total: number;
    }>;
}
