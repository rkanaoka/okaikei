import { ComandaStatus } from '@prisma/client';
export declare const ORDERS_REPOSITORY_PORT: unique symbol;
export interface OrdersRepositoryPort {
    findMany(filter?: {
        status?: ComandaStatus;
    }): Promise<any[]>;
    findById(id: string): Promise<any | null>;
    findByTableAndStatus(tableId: string, statuses: string[]): Promise<any[]>;
    countActiveByTable(tableId: string): Promise<number>;
    createComanda(data: {
        id: string;
        tableId?: string | null;
        customerName?: string | null;
        userId?: string | null;
        notes?: string | null;
    }): Promise<any>;
    updateComanda(id: string, data: Record<string, any>): Promise<any>;
    setTableStatus(tableId: string, status: string): Promise<void>;
    findTableById(tableId: string): Promise<any | null>;
    findMenuItemById(menuItemId: string): Promise<any | null>;
    addItems(comandaId: string, items: Array<{
        id: string;
        menuItemId: string;
        quantity: number;
        unitPrice: number;
        notes?: string;
    }>): Promise<any[]>;
    markItemsSent(ids: string[]): Promise<void>;
    getItemsWithMenu(comandaId: string): Promise<any[]>;
    findItemById(itemId: string): Promise<any | null>;
    updateItemQuantity(itemId: string, quantity: number): Promise<any>;
    transferItems(itemIds: string[], targetComandaId: string): Promise<void>;
    findCancellationReasonById(reasonId: string): Promise<any | null>;
    cancelItemWithRecord(data: {
        itemId: string;
        comandaId: string;
        reasonId: string;
        itemName: string;
        quantity: number;
        amount: number;
    }): Promise<void>;
    createCancellationRecord(data: {
        id: string;
        comandaId: string;
        reasonId: string;
        note?: string;
        cancelledAt: Date;
    }): Promise<void>;
    findOpenCashSession(): Promise<any | null>;
    closeComandaWithPayments(comandaId: string, data: {
        closureData: Record<string, any>;
        payments: Array<{
            id: string;
            method: string;
            amount: number;
            notes?: string | null;
            cashSessionId?: string | null;
        }>;
        voucherId?: string;
    }): Promise<{
        comanda: any;
        payments: any[];
    }>;
    findVoucherById(id: string): Promise<any | null>;
    findVoucherByCode(code: string): Promise<any | null>;
    mergeComandas(targetId: string, sourceIds: string[], notes: string): Promise<any>;
}
