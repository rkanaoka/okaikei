import { PrismaService } from '@/common/prisma/prisma.service';
export declare class ReasonsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listCancellationReasons(): Promise<{
        usageCount: number;
        id: string;
        createdAt: Date;
        label: string;
    }[]>;
    createCancellationReason(dto: {
        label: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        label: string;
    }>;
    listCancellationHistory(): Promise<({
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
    listDiscountReasons(): Promise<{
        id: string;
        createdAt: Date;
        label: string;
        value: import("@prisma/client/runtime/library").Decimal;
        type: string;
    }[]>;
    createDiscountReason(dto: {
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
