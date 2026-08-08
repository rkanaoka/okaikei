import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { TableRepositoryPort } from '@/modules/tables/domain/repositories/table-repository.port';
export declare class PrismaTableRepository implements TableRepositoryPort {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        comandas: {
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
        }[];
    } & {
        number: number;
        id: string;
        status: import(".prisma/client").$Enums.TableStatus;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        capacity: number;
    })[]>;
    findById(id: string): Promise<{
        number: number;
        id: string;
        status: import(".prisma/client").$Enums.TableStatus;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        capacity: number;
    }>;
    create(data: {
        id: string;
        number: number;
        label: string;
        capacity?: number;
    }): Promise<{
        number: number;
        id: string;
        status: import(".prisma/client").$Enums.TableStatus;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        capacity: number;
    }>;
    update(id: string, data: Partial<{
        number: number;
        label: string;
        capacity: number;
        status: string;
    }>): Promise<{
        number: number;
        id: string;
        status: import(".prisma/client").$Enums.TableStatus;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        capacity: number;
    }>;
    remove(id: string): Promise<{
        number: number;
        id: string;
        status: import(".prisma/client").$Enums.TableStatus;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        capacity: number;
    }>;
    setStatus(id: string, status: string): Promise<{
        number: number;
        id: string;
        status: import(".prisma/client").$Enums.TableStatus;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        capacity: number;
    }>;
}
