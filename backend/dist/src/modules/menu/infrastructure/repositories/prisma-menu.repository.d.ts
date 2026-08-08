import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { MenuRepositoryPort } from '@/modules/menu/domain/repositories/menu-repository.port';
export declare class PrismaMenuRepository implements MenuRepositoryPort {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAllItems(filter?: {
        available?: boolean;
    }): Promise<({
        menuCategory: {
            id: string;
            createdAt: Date;
            name: string;
            sortOrder: number;
        };
        optionGroups: ({
            options: {
                id: string;
                name: string;
                price: import("@prisma/client/runtime/library").Decimal;
                sortOrder: number;
                active: boolean;
                groupId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            name: string;
            sortOrder: number;
            updatedAt: Date;
            minSelect: number;
            maxSelect: number;
            active: boolean;
        })[];
    } & {
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
    })[]>;
    findItemById(id: string): Promise<{
        menuCategory: {
            id: string;
            createdAt: Date;
            name: string;
            sortOrder: number;
        };
        optionGroups: ({
            options: {
                id: string;
                name: string;
                price: import("@prisma/client/runtime/library").Decimal;
                sortOrder: number;
                active: boolean;
                groupId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            name: string;
            sortOrder: number;
            updatedAt: Date;
            minSelect: number;
            maxSelect: number;
            active: boolean;
        })[];
    } & {
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
    createItem(data: {
        id: string;
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
        optionGroupOrder?: string[];
        optionGroupIds?: string[];
    }): Promise<{
        menuCategory: {
            id: string;
            createdAt: Date;
            name: string;
            sortOrder: number;
        };
    } & {
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
    updateItem(id: string, data: Partial<{
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
        optionGroupOrder: string[];
        optionGroupIds: string[];
    }>): Promise<{
        menuCategory: {
            id: string;
            createdAt: Date;
            name: string;
            sortOrder: number;
        };
    } & {
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
    deactivateItem(id: string): Promise<{
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
    findAllCategories(): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        sortOrder: number;
    }[]>;
    findCategoryById(id: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        sortOrder: number;
    }>;
    createCategory(data: {
        id: string;
        name: string;
        sortOrder?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        sortOrder: number;
    }>;
    updateCategory(id: string, data: Partial<{
        name: string;
        sortOrder: number;
    }>): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        sortOrder: number;
    }>;
}
