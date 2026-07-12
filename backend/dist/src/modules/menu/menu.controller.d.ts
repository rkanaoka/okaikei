import { MenuService } from './menu.service';
export declare class MenuController {
    private readonly menu;
    constructor(menu: MenuService);
    findAll(all?: string): Promise<any[]>;
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
    create(body: {
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
    update(id: string, body: any): Promise<{
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
