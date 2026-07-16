import { MenuService } from './menu.service';
export declare class MenuController {
    private readonly menu;
    constructor(menu: MenuService);
    findAllCategories(): Promise<{
        id: string;
        name: string;
        sortOrder: number;
        createdAt: Date;
    }[]>;
    createCategory(body: {
        name: string;
        sortOrder?: number;
    }): Promise<{
        id: string;
        name: string;
        sortOrder: number;
        createdAt: Date;
    }>;
    updateCategory(id: string, body: {
        name?: string;
        sortOrder?: number;
    }): Promise<{
        id: string;
        name: string;
        sortOrder: number;
        createdAt: Date;
    }>;
    findAll(all?: string): Promise<any[]>;
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
    create(body: {
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
    update(id: string, body: any): Promise<{
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
}
