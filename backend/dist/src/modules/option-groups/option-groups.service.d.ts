import { PrismaService } from '@/common/prisma/prisma.service';
type OptionDto = {
    id?: string;
    name: string;
    price?: number;
    active?: boolean;
};
export declare class OptionGroupsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    create(dto: {
        name: string;
        minSelect?: number;
        maxSelect?: number;
        options?: OptionDto[];
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
    update(id: string, dto: Partial<{
        name: string;
        minSelect: number;
        maxSelect: number;
        active: boolean;
        options: OptionDto[];
    }>): Promise<{
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
    setItems(id: string, menuItemIds: string[]): Promise<{
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
    updateOption(optionId: string, dto: Partial<{
        name: string;
        price: number;
        active: boolean;
    }>): Promise<{
        id: string;
        name: string;
        active: boolean;
        sortOrder: number;
        price: import("@prisma/client/runtime/library").Decimal;
        groupId: string;
    }>;
}
export {};
