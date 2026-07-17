import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
type OptionDto = {
    id?: string;
    name: string;
    price?: number;
    active?: boolean;
};
export declare class OptionGroupsService {
    private readonly prisma;
    private readonly redis;
    constructor(prisma: PrismaService, redis: RedisService);
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
    create(dto: {
        name: string;
        minSelect?: number;
        maxSelect?: number;
        options?: OptionDto[];
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
    setItems(id: string, menuItemIds: string[]): Promise<{
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
    updateOption(optionId: string, dto: Partial<{
        name: string;
        price: number;
        active: boolean;
    }>): Promise<{
        id: string;
        name: string;
        price: import("@prisma/client/runtime/library").Decimal;
        sortOrder: number;
        active: boolean;
        groupId: string;
    }>;
}
export {};
