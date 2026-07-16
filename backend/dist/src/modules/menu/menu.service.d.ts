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
        menuCategory: {
            id: string;
            name: string;
            sortOrder: number;
            createdAt: Date;
        };
    } & {
        id: string;
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
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(dto: {
        name: string;
        description?: string;
        price: number;
        category: string;
        subcategory?: string;
        sortOrder?: number;
        categoryId?: string;
        printCategories?: string[];
        imageUrl?: string;
        chargeServiceFee?: boolean;
        availabilitySchedule?: any;
        optionGroupIds?: string[];
    }): Promise<{
        menuCategory: {
            id: string;
            name: string;
            sortOrder: number;
            createdAt: Date;
        };
    } & {
        id: string;
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
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, dto: Partial<{
        name: string;
        description: string;
        price: number;
        category: string;
        subcategory: string;
        available: boolean;
        sortOrder: number;
        categoryId: string | null;
        printCategories: string[];
        imageUrl: string | null;
        chargeServiceFee: boolean;
        availabilitySchedule: any;
        optionGroupIds: string[];
    }>): Promise<{
        menuCategory: {
            id: string;
            name: string;
            sortOrder: number;
            createdAt: Date;
        };
    } & {
        id: string;
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
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        id: string;
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
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAllCategories(): Promise<{
        id: string;
        name: string;
        sortOrder: number;
        createdAt: Date;
    }[]>;
    createCategory(dto: {
        name: string;
        sortOrder?: number;
    }): Promise<{
        id: string;
        name: string;
        sortOrder: number;
        createdAt: Date;
    }>;
    updateCategory(id: string, dto: Partial<{
        name: string;
        sortOrder: number;
    }>): Promise<{
        id: string;
        name: string;
        sortOrder: number;
        createdAt: Date;
    }>;
}
