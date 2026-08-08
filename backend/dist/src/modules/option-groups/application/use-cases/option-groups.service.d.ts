import { OptionGroupRepositoryPort } from '@/modules/option-groups/domain/repositories/option-group-repository.port';
import { RedisService } from '@/shared/infrastructure/cache/redis.service';
type OptionDto = {
    id?: string;
    name: string;
    price?: number;
    active?: boolean;
};
export declare class OptionGroupsService {
    private readonly repo;
    private readonly redis;
    constructor(repo: OptionGroupRepositoryPort, redis: RedisService);
    findAll(): Promise<any[]>;
    findOne(id: string): Promise<any>;
    create(dto: {
        name: string;
        minSelect?: number;
        maxSelect?: number;
        options?: OptionDto[];
    }): Promise<any>;
    update(id: string, dto: Partial<{
        name: string;
        minSelect: number;
        maxSelect: number;
        active: boolean;
        options: OptionDto[];
    }>): Promise<any>;
    remove(id: string): Promise<{
        id: string;
    }>;
    setItems(id: string, menuItemIds: string[]): Promise<any>;
    updateOption(optionId: string, dto: Partial<{
        name: string;
        price: number;
        active: boolean;
    }>): Promise<any>;
}
export {};
