import { MenuRepositoryPort } from '@/modules/menu/domain/repositories/menu-repository.port';
import { RedisService } from '@/shared/infrastructure/cache/redis.service';
import { SyncService } from '@/modules/sync/application/use-cases/sync.service';
export declare class MenuService {
    private readonly repo;
    private readonly redis;
    private readonly sync;
    constructor(repo: MenuRepositoryPort, redis: RedisService, sync: SyncService);
    findAll(includeUnavailable?: boolean): Promise<any[]>;
    findOne(id: string): Promise<any>;
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
    }): Promise<any>;
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
    }>): Promise<any>;
    remove(id: string): Promise<any>;
    findAllCategories(): Promise<any[]>;
    createCategory(dto: {
        name: string;
        sortOrder?: number;
    }): Promise<any>;
    updateCategory(id: string, dto: Partial<{
        name: string;
        sortOrder: number;
    }>): Promise<any>;
}
