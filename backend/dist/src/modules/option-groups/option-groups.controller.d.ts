import { OptionGroupsService } from './option-groups.service';
export declare class OptionGroupsController {
    private readonly groups;
    constructor(groups: OptionGroupsService);
    findAll(): Promise<({
        options: {
            id: string;
            name: string;
            active: boolean;
            sortOrder: number;
            price: import("@prisma/client/runtime/library").Decimal;
            groupId: string;
        }[];
        menuItems: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        sortOrder: number;
        minSelect: number;
        maxSelect: number;
    })[]>;
    create(body: {
        name: string;
        minSelect?: number;
        maxSelect?: number;
        options?: any[];
    }): Promise<{
        options: {
            id: string;
            name: string;
            active: boolean;
            sortOrder: number;
            price: import("@prisma/client/runtime/library").Decimal;
            groupId: string;
        }[];
        menuItems: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        sortOrder: number;
        minSelect: number;
        maxSelect: number;
    }>;
    updateOption(optionId: string, body: {
        name?: string;
        price?: number;
        active?: boolean;
    }): Promise<{
        id: string;
        name: string;
        active: boolean;
        sortOrder: number;
        price: import("@prisma/client/runtime/library").Decimal;
        groupId: string;
    }>;
    findOne(id: string): Promise<{
        options: {
            id: string;
            name: string;
            active: boolean;
            sortOrder: number;
            price: import("@prisma/client/runtime/library").Decimal;
            groupId: string;
        }[];
        menuItems: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        sortOrder: number;
        minSelect: number;
        maxSelect: number;
    }>;
    update(id: string, body: any): Promise<{
        options: {
            id: string;
            name: string;
            active: boolean;
            sortOrder: number;
            price: import("@prisma/client/runtime/library").Decimal;
            groupId: string;
        }[];
        menuItems: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        sortOrder: number;
        minSelect: number;
        maxSelect: number;
    }>;
    remove(id: string): Promise<{
        id: string;
    }>;
    setItems(id: string, body: {
        menuItemIds: string[];
    }): Promise<{
        options: {
            id: string;
            name: string;
            active: boolean;
            sortOrder: number;
            price: import("@prisma/client/runtime/library").Decimal;
            groupId: string;
        }[];
        menuItems: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        sortOrder: number;
        minSelect: number;
        maxSelect: number;
    }>;
}
