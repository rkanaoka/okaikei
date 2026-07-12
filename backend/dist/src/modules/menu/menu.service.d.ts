import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { SyncService } from '@/modules/sync/sync.service';
export declare class MenuService {
    private readonly prisma;
    private readonly redis;
    private readonly sync;
    constructor(prisma: PrismaService, redis: RedisService, sync: SyncService);
    findAll(includeUnavailable?: boolean): Promise<any[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        category: string;
        subcategory: string | null;
        imageUrl: string | null;
        available: boolean;
        sortOrder: number;
    }>;
    create(dto: {
        name: string;
        description?: string;
        price: number;
        category: string;
        subcategory?: string;
        sortOrder?: number;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        category: string;
        subcategory: string | null;
        imageUrl: string | null;
        available: boolean;
        sortOrder: number;
    }>;
    update(id: string, dto: Partial<{
        name: string;
        description: string;
        price: number;
        category: string;
        subcategory: string;
        available: boolean;
        sortOrder: number;
    }>): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        category: string;
        subcategory: string | null;
        imageUrl: string | null;
        available: boolean;
        sortOrder: number;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        category: string;
        subcategory: string | null;
        imageUrl: string | null;
        available: boolean;
        sortOrder: number;
    }>;
}
