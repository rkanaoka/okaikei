import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { OptionGroupRepositoryPort } from '@/modules/option-groups/domain/repositories/option-group-repository.port';
export declare class PrismaOptionGroupRepository implements OptionGroupRepositoryPort {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
        createdAt: Date;
        name: string;
        sortOrder: number;
        updatedAt: Date;
        minSelect: number;
        maxSelect: number;
        active: boolean;
    })[]>;
    findById(id: string): Promise<{
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
        createdAt: Date;
        name: string;
        sortOrder: number;
        updatedAt: Date;
        minSelect: number;
        maxSelect: number;
        active: boolean;
    }>;
    create(data: {
        id: string;
        name: string;
        options?: Array<{
            id: string;
            name: string;
            price?: number;
            active?: boolean;
            sortOrder?: number;
        }>;
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
        createdAt: Date;
        name: string;
        sortOrder: number;
        updatedAt: Date;
        minSelect: number;
        maxSelect: number;
        active: boolean;
    }>;
    updateWithOptions(id: string, data: {
        name?: string;
        minSelect?: number;
        maxSelect?: number;
        active?: boolean;
        options?: Array<{
            id?: string;
            name: string;
            price?: number;
            active?: boolean;
            sortOrder?: number;
        }>;
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
        createdAt: Date;
        name: string;
        sortOrder: number;
        updatedAt: Date;
        minSelect: number;
        maxSelect: number;
        active: boolean;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        sortOrder: number;
        updatedAt: Date;
        minSelect: number;
        maxSelect: number;
        active: boolean;
    }>;
    setMenuItems(id: string, menuItemIds: string[]): Promise<{
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
        createdAt: Date;
        name: string;
        sortOrder: number;
        updatedAt: Date;
        minSelect: number;
        maxSelect: number;
        active: boolean;
    }>;
    updateOption(optionId: string, data: Partial<{
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
    findOptionById(optionId: string): Promise<{
        id: string;
        name: string;
        price: import("@prisma/client/runtime/library").Decimal;
        sortOrder: number;
        active: boolean;
        groupId: string;
    }>;
}
