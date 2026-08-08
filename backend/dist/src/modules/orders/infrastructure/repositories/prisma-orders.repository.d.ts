import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { OrdersRepositoryPort } from '@/modules/orders/domain/repositories/orders-repository.port';
import { ComandaStatus } from '@prisma/client';
export declare class PrismaOrdersRepository implements OrdersRepositoryPort {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findMany(filter?: {
        status?: ComandaStatus;
    }): Promise<({
        items: ({
            menuItem: {
                id: string;
                createdAt: Date;
                name: string;
                description: string | null;
                price: import("@prisma/client/runtime/library").Decimal;
                category: string;
                subcategory: string | null;
                categoryId: string | null;
                printCategories: string[];
                imageUrl: string | null;
                available: boolean;
                sortOrder: number;
                chargeServiceFee: boolean;
                availabilitySchedule: import("@prisma/client/runtime/library").JsonValue | null;
                optionGroupOrder: string[];
                updatedAt: Date;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
            createdAt: Date;
            notes: string | null;
            comandaId: string;
            menuItemId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            sentAt: Date | null;
        })[];
        table: {
            number: number;
            id: string;
            status: import(".prisma/client").$Enums.TableStatus;
            createdAt: Date;
            updatedAt: Date;
            label: string;
            capacity: number;
        };
        user: {
            id: string;
            name: string;
        };
        payments: {
            id: string;
            createdAt: Date;
            notes: string | null;
            comandaId: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            amount: import("@prisma/client/runtime/library").Decimal;
            paidAt: Date;
            cashSessionId: string | null;
        }[];
    } & {
        number: number;
        id: string;
        status: import(".prisma/client").$Enums.ComandaStatus;
        createdAt: Date;
        updatedAt: Date;
        tableId: string | null;
        customerName: string | null;
        userId: string | null;
        notes: string | null;
        surchargeType: string | null;
        surchargeValue: import("@prisma/client/runtime/library").Decimal | null;
        discountType: string | null;
        discountValue: import("@prisma/client/runtime/library").Decimal | null;
        voucherCode: string | null;
        voucherDiscount: import("@prisma/client/runtime/library").Decimal;
        openedAt: Date;
        closedAt: Date | null;
    })[]>;
    findById(id: string): Promise<{
        items: ({
            menuItem: {
                id: string;
                createdAt: Date;
                name: string;
                description: string | null;
                price: import("@prisma/client/runtime/library").Decimal;
                category: string;
                subcategory: string | null;
                categoryId: string | null;
                printCategories: string[];
                imageUrl: string | null;
                available: boolean;
                sortOrder: number;
                chargeServiceFee: boolean;
                availabilitySchedule: import("@prisma/client/runtime/library").JsonValue | null;
                optionGroupOrder: string[];
                updatedAt: Date;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
            createdAt: Date;
            notes: string | null;
            comandaId: string;
            menuItemId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            sentAt: Date | null;
        })[];
        table: {
            number: number;
            id: string;
            status: import(".prisma/client").$Enums.TableStatus;
            createdAt: Date;
            updatedAt: Date;
            label: string;
            capacity: number;
        };
        user: {
            id: string;
            name: string;
        };
        payments: {
            id: string;
            createdAt: Date;
            notes: string | null;
            comandaId: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            amount: import("@prisma/client/runtime/library").Decimal;
            paidAt: Date;
            cashSessionId: string | null;
        }[];
    } & {
        number: number;
        id: string;
        status: import(".prisma/client").$Enums.ComandaStatus;
        createdAt: Date;
        updatedAt: Date;
        tableId: string | null;
        customerName: string | null;
        userId: string | null;
        notes: string | null;
        surchargeType: string | null;
        surchargeValue: import("@prisma/client/runtime/library").Decimal | null;
        discountType: string | null;
        discountValue: import("@prisma/client/runtime/library").Decimal | null;
        voucherCode: string | null;
        voucherDiscount: import("@prisma/client/runtime/library").Decimal;
        openedAt: Date;
        closedAt: Date | null;
    }>;
    findByTableAndStatus(tableId: string, statuses: string[]): Promise<({
        items: ({
            menuItem: {
                id: string;
                createdAt: Date;
                name: string;
                description: string | null;
                price: import("@prisma/client/runtime/library").Decimal;
                category: string;
                subcategory: string | null;
                categoryId: string | null;
                printCategories: string[];
                imageUrl: string | null;
                available: boolean;
                sortOrder: number;
                chargeServiceFee: boolean;
                availabilitySchedule: import("@prisma/client/runtime/library").JsonValue | null;
                optionGroupOrder: string[];
                updatedAt: Date;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
            createdAt: Date;
            notes: string | null;
            comandaId: string;
            menuItemId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            sentAt: Date | null;
        })[];
        table: {
            number: number;
            id: string;
            status: import(".prisma/client").$Enums.TableStatus;
            createdAt: Date;
            updatedAt: Date;
            label: string;
            capacity: number;
        };
    } & {
        number: number;
        id: string;
        status: import(".prisma/client").$Enums.ComandaStatus;
        createdAt: Date;
        updatedAt: Date;
        tableId: string | null;
        customerName: string | null;
        userId: string | null;
        notes: string | null;
        surchargeType: string | null;
        surchargeValue: import("@prisma/client/runtime/library").Decimal | null;
        discountType: string | null;
        discountValue: import("@prisma/client/runtime/library").Decimal | null;
        voucherCode: string | null;
        voucherDiscount: import("@prisma/client/runtime/library").Decimal;
        openedAt: Date;
        closedAt: Date | null;
    })[]>;
    countActiveByTable(tableId: string): Promise<number>;
    createComanda(data: {
        id: string;
        tableId?: string | null;
        customerName?: string | null;
        userId?: string | null;
        notes?: string | null;
    }): Promise<{
        items: {
            id: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
            createdAt: Date;
            notes: string | null;
            comandaId: string;
            menuItemId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            sentAt: Date | null;
        }[];
        table: {
            number: number;
            id: string;
            status: import(".prisma/client").$Enums.TableStatus;
            createdAt: Date;
            updatedAt: Date;
            label: string;
            capacity: number;
        };
        payments: {
            id: string;
            createdAt: Date;
            notes: string | null;
            comandaId: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            amount: import("@prisma/client/runtime/library").Decimal;
            paidAt: Date;
            cashSessionId: string | null;
        }[];
    } & {
        number: number;
        id: string;
        status: import(".prisma/client").$Enums.ComandaStatus;
        createdAt: Date;
        updatedAt: Date;
        tableId: string | null;
        customerName: string | null;
        userId: string | null;
        notes: string | null;
        surchargeType: string | null;
        surchargeValue: import("@prisma/client/runtime/library").Decimal | null;
        discountType: string | null;
        discountValue: import("@prisma/client/runtime/library").Decimal | null;
        voucherCode: string | null;
        voucherDiscount: import("@prisma/client/runtime/library").Decimal;
        openedAt: Date;
        closedAt: Date | null;
    }>;
    updateComanda(id: string, data: Record<string, any>): Promise<{
        items: ({
            menuItem: {
                id: string;
                createdAt: Date;
                name: string;
                description: string | null;
                price: import("@prisma/client/runtime/library").Decimal;
                category: string;
                subcategory: string | null;
                categoryId: string | null;
                printCategories: string[];
                imageUrl: string | null;
                available: boolean;
                sortOrder: number;
                chargeServiceFee: boolean;
                availabilitySchedule: import("@prisma/client/runtime/library").JsonValue | null;
                optionGroupOrder: string[];
                updatedAt: Date;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
            createdAt: Date;
            notes: string | null;
            comandaId: string;
            menuItemId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            sentAt: Date | null;
        })[];
        table: {
            number: number;
            id: string;
            status: import(".prisma/client").$Enums.TableStatus;
            createdAt: Date;
            updatedAt: Date;
            label: string;
            capacity: number;
        };
        user: {
            id: string;
            name: string;
        };
        payments: {
            id: string;
            createdAt: Date;
            notes: string | null;
            comandaId: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            amount: import("@prisma/client/runtime/library").Decimal;
            paidAt: Date;
            cashSessionId: string | null;
        }[];
    } & {
        number: number;
        id: string;
        status: import(".prisma/client").$Enums.ComandaStatus;
        createdAt: Date;
        updatedAt: Date;
        tableId: string | null;
        customerName: string | null;
        userId: string | null;
        notes: string | null;
        surchargeType: string | null;
        surchargeValue: import("@prisma/client/runtime/library").Decimal | null;
        discountType: string | null;
        discountValue: import("@prisma/client/runtime/library").Decimal | null;
        voucherCode: string | null;
        voucherDiscount: import("@prisma/client/runtime/library").Decimal;
        openedAt: Date;
        closedAt: Date | null;
    }>;
    setTableStatus(tableId: string, status: string): Promise<void>;
    findTableById(tableId: string): Promise<{
        number: number;
        id: string;
        status: import(".prisma/client").$Enums.TableStatus;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        capacity: number;
    }>;
    findMenuItemById(menuItemId: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        description: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        category: string;
        subcategory: string | null;
        categoryId: string | null;
        printCategories: string[];
        imageUrl: string | null;
        available: boolean;
        sortOrder: number;
        chargeServiceFee: boolean;
        availabilitySchedule: import("@prisma/client/runtime/library").JsonValue | null;
        optionGroupOrder: string[];
        updatedAt: Date;
    }>;
    addItems(comandaId: string, items: Array<{
        id: string;
        menuItemId: string;
        quantity: number;
        unitPrice: number;
        notes?: string;
    }>): Promise<({
        menuItem: {
            id: string;
            createdAt: Date;
            name: string;
            description: string | null;
            price: import("@prisma/client/runtime/library").Decimal;
            category: string;
            subcategory: string | null;
            categoryId: string | null;
            printCategories: string[];
            imageUrl: string | null;
            available: boolean;
            sortOrder: number;
            chargeServiceFee: boolean;
            availabilitySchedule: import("@prisma/client/runtime/library").JsonValue | null;
            optionGroupOrder: string[];
            updatedAt: Date;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.OrderItemStatus;
        createdAt: Date;
        notes: string | null;
        comandaId: string;
        menuItemId: string;
        quantity: number;
        unitPrice: import("@prisma/client/runtime/library").Decimal;
        sentAt: Date | null;
    })[]>;
    markItemsSent(ids: string[]): Promise<void>;
    getItemsWithMenu(comandaId: string): Promise<({
        menuItem: {
            id: string;
            createdAt: Date;
            name: string;
            description: string | null;
            price: import("@prisma/client/runtime/library").Decimal;
            category: string;
            subcategory: string | null;
            categoryId: string | null;
            printCategories: string[];
            imageUrl: string | null;
            available: boolean;
            sortOrder: number;
            chargeServiceFee: boolean;
            availabilitySchedule: import("@prisma/client/runtime/library").JsonValue | null;
            optionGroupOrder: string[];
            updatedAt: Date;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.OrderItemStatus;
        createdAt: Date;
        notes: string | null;
        comandaId: string;
        menuItemId: string;
        quantity: number;
        unitPrice: import("@prisma/client/runtime/library").Decimal;
        sentAt: Date | null;
    })[]>;
    findItemById(itemId: string): Promise<{
        menuItem: {
            id: string;
            createdAt: Date;
            name: string;
            description: string | null;
            price: import("@prisma/client/runtime/library").Decimal;
            category: string;
            subcategory: string | null;
            categoryId: string | null;
            printCategories: string[];
            imageUrl: string | null;
            available: boolean;
            sortOrder: number;
            chargeServiceFee: boolean;
            availabilitySchedule: import("@prisma/client/runtime/library").JsonValue | null;
            optionGroupOrder: string[];
            updatedAt: Date;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.OrderItemStatus;
        createdAt: Date;
        notes: string | null;
        comandaId: string;
        menuItemId: string;
        quantity: number;
        unitPrice: import("@prisma/client/runtime/library").Decimal;
        sentAt: Date | null;
    }>;
    updateItemQuantity(itemId: string, quantity: number): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.OrderItemStatus;
        createdAt: Date;
        notes: string | null;
        comandaId: string;
        menuItemId: string;
        quantity: number;
        unitPrice: import("@prisma/client/runtime/library").Decimal;
        sentAt: Date | null;
    }>;
    transferItems(itemIds: string[], targetComandaId: string): Promise<void>;
    findCancellationReasonById(reasonId: string): Promise<{
        id: string;
        createdAt: Date;
        label: string;
    }>;
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
    findOpenCashSession(): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.CashSessionStatus;
        openedAt: Date;
        closedAt: Date | null;
        openingAmount: import("@prisma/client/runtime/library").Decimal;
        openingNotes: string | null;
        closingNotes: string | null;
        closingCounts: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
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
        comanda: {
            items: ({
                menuItem: {
                    id: string;
                    createdAt: Date;
                    name: string;
                    description: string | null;
                    price: import("@prisma/client/runtime/library").Decimal;
                    category: string;
                    subcategory: string | null;
                    categoryId: string | null;
                    printCategories: string[];
                    imageUrl: string | null;
                    available: boolean;
                    sortOrder: number;
                    chargeServiceFee: boolean;
                    availabilitySchedule: import("@prisma/client/runtime/library").JsonValue | null;
                    optionGroupOrder: string[];
                    updatedAt: Date;
                };
            } & {
                id: string;
                status: import(".prisma/client").$Enums.OrderItemStatus;
                createdAt: Date;
                notes: string | null;
                comandaId: string;
                menuItemId: string;
                quantity: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                sentAt: Date | null;
            })[];
            table: {
                number: number;
                id: string;
                status: import(".prisma/client").$Enums.TableStatus;
                createdAt: Date;
                updatedAt: Date;
                label: string;
                capacity: number;
            };
            user: {
                id: string;
                name: string;
            };
            payments: {
                id: string;
                createdAt: Date;
                notes: string | null;
                comandaId: string;
                method: import(".prisma/client").$Enums.PaymentMethod;
                amount: import("@prisma/client/runtime/library").Decimal;
                paidAt: Date;
                cashSessionId: string | null;
            }[];
        } & {
            number: number;
            id: string;
            status: import(".prisma/client").$Enums.ComandaStatus;
            createdAt: Date;
            updatedAt: Date;
            tableId: string | null;
            customerName: string | null;
            userId: string | null;
            notes: string | null;
            surchargeType: string | null;
            surchargeValue: import("@prisma/client/runtime/library").Decimal | null;
            discountType: string | null;
            discountValue: import("@prisma/client/runtime/library").Decimal | null;
            voucherCode: string | null;
            voucherDiscount: import("@prisma/client/runtime/library").Decimal;
            openedAt: Date;
            closedAt: Date | null;
        };
        payments: {
            id: string;
            createdAt: Date;
            notes: string | null;
            comandaId: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            amount: import("@prisma/client/runtime/library").Decimal;
            paidAt: Date;
            cashSessionId: string | null;
        }[];
    }>;
    findVoucherById(id: string): Promise<any>;
    findVoucherByCode(code: string): Promise<any>;
    mergeComandas(targetId: string, sourceIds: string[], notes: string): Promise<{
        items: ({
            menuItem: {
                id: string;
                createdAt: Date;
                name: string;
                description: string | null;
                price: import("@prisma/client/runtime/library").Decimal;
                category: string;
                subcategory: string | null;
                categoryId: string | null;
                printCategories: string[];
                imageUrl: string | null;
                available: boolean;
                sortOrder: number;
                chargeServiceFee: boolean;
                availabilitySchedule: import("@prisma/client/runtime/library").JsonValue | null;
                optionGroupOrder: string[];
                updatedAt: Date;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
            createdAt: Date;
            notes: string | null;
            comandaId: string;
            menuItemId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            sentAt: Date | null;
        })[];
        table: {
            number: number;
            id: string;
            status: import(".prisma/client").$Enums.TableStatus;
            createdAt: Date;
            updatedAt: Date;
            label: string;
            capacity: number;
        };
        user: {
            id: string;
            name: string;
        };
        payments: {
            id: string;
            createdAt: Date;
            notes: string | null;
            comandaId: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            amount: import("@prisma/client/runtime/library").Decimal;
            paidAt: Date;
            cashSessionId: string | null;
        }[];
    } & {
        number: number;
        id: string;
        status: import(".prisma/client").$Enums.ComandaStatus;
        createdAt: Date;
        updatedAt: Date;
        tableId: string | null;
        customerName: string | null;
        userId: string | null;
        notes: string | null;
        surchargeType: string | null;
        surchargeValue: import("@prisma/client/runtime/library").Decimal | null;
        discountType: string | null;
        discountValue: import("@prisma/client/runtime/library").Decimal | null;
        voucherCode: string | null;
        voucherDiscount: import("@prisma/client/runtime/library").Decimal;
        openedAt: Date;
        closedAt: Date | null;
    }>;
}
