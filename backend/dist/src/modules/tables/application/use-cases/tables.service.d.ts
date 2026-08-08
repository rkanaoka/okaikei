import { TableRepositoryPort } from '@/modules/tables/domain/repositories/table-repository.port';
import { RedisService } from '@/shared/infrastructure/cache/redis.service';
import { SyncService } from '@/modules/sync/application/use-cases/sync.service';
export declare class TablesService {
    private readonly repo;
    private readonly redis;
    private readonly sync;
    constructor(repo: TableRepositoryPort, redis: RedisService, sync: SyncService);
    findAll(): Promise<any[]>;
    create(dto: {
        number: number;
        label: string;
        capacity?: number;
    }): Promise<any>;
    update(id: string, dto: Partial<{
        label: string;
        capacity: number;
    }>): Promise<any>;
}
