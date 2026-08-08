import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { ReasonsRepositoryPort } from '@/modules/reasons/domain/repositories/reasons-repository.port';
export declare class PrismaReasonsRepository implements ReasonsRepositoryPort {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAllCancellationReasons(): Promise<{
        id: string;
        createdAt: Date;
        label: string;
    }[]>;
    findCancellationUsageCounts(): Promise<{
        reasonId: string;
        count: number;
    }[]>;
    createCancellationReason(data: {
        id: string;
        label: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        label: string;
    }>;
    deleteCancellationReason(id: string): Promise<{
        id: string;
        createdAt: Date;
        label: string;
    }>;
    findCancellationHistory(): Promise<({
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
    findAllDiscountReasons(): Promise<{
        id: string;
        createdAt: Date;
        label: string;
        type: string;
        value: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    findDiscountUsageCounts(): Promise<{
        reasonId: string;
        count: number;
    }[]>;
    createDiscountReason(data: {
        id: string;
        label: string;
        type: string;
        value: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        label: string;
        type: string;
        value: import("@prisma/client/runtime/library").Decimal;
    }>;
    deleteDiscountReason(id: string): Promise<{
        id: string;
        createdAt: Date;
        label: string;
        type: string;
        value: import("@prisma/client/runtime/library").Decimal;
    }>;
}
