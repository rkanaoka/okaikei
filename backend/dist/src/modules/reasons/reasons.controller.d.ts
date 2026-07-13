import { ReasonsService } from './reasons.service';
export declare class ReasonsController {
    private readonly reasons;
    constructor(reasons: ReasonsService);
    listCancellation(): Promise<{
        usageCount: number;
        id: string;
        createdAt: Date;
        label: string;
    }[]>;
    createCancellation(body: {
        label: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        label: string;
    }>;
    cancellationHistory(): Promise<({
        reason: {
            id: string;
            createdAt: Date;
            label: string;
        };
    } & {
        id: string;
        createdAt: Date;
        comandaId: string | null;
        quantity: number;
        amount: import("@prisma/client/runtime/library").Decimal;
        reasonId: string;
        itemName: string;
    })[]>;
    listDiscount(): Promise<{
        id: string;
        createdAt: Date;
        label: string;
        value: import("@prisma/client/runtime/library").Decimal;
        type: string;
    }[]>;
    createDiscount(body: {
        label: string;
        type: 'percent' | 'fixed';
        value: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        label: string;
        value: import("@prisma/client/runtime/library").Decimal;
        type: string;
    }>;
}
