import { OptionGroupsService } from './option-groups.service';
export declare class OptionGroupsController {
    private readonly groups;
    constructor(groups: OptionGroupsService);
    findAll(): Promise<({
        options: {
            id: string;
            name: string;
            price: import("@prisma/client/runtime/library").Decimal;
            sortOrder: number;
            active: boolean;
            groupId: string;
        }[];
        menuItems: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        name: string;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
        minSelect: number;
        maxSelect: number;
        active: boolean;
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
            price: import("@prisma/client/runtime/library").Decimal;
            sortOrder: number;
            active: boolean;
            groupId: string;
        }[];
        menuItems: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        name: string;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
        minSelect: number;
        maxSelect: number;
        active: boolean;
    }>;
    updateOption(optionId: string, body: {
        name?: string;
        price?: number;
        active?: boolean;
    }): Promise<{
        id: string;
        name: string;
        price: import("@prisma/client/runtime/library").Decimal;
        sortOrder: number;
        active: boolean;
        groupId: string;
    }>;
    findOne(id: string): Promise<{
        options: {
            id: string;
            name: string;
            price: import("@prisma/client/runtime/library").Decimal;
            sortOrder: number;
            active: boolean;
            groupId: string;
        }[];
        menuItems: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        name: string;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
        minSelect: number;
        maxSelect: number;
        active: boolean;
    }>;
    update(id: string, body: any): Promise<{
        options: {
            id: string;
            name: string;
            price: import("@prisma/client/runtime/library").Decimal;
            sortOrder: number;
            active: boolean;
            groupId: string;
        }[];
        menuItems: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        name: string;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
        minSelect: number;
        maxSelect: number;
        active: boolean;
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
            price: import("@prisma/client/runtime/library").Decimal;
            sortOrder: number;
            active: boolean;
            groupId: string;
        }[];
        menuItems: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        name: string;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
        minSelect: number;
        maxSelect: number;
        active: boolean;
    }>;
}
