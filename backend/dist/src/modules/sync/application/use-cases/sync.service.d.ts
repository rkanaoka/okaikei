import { SyncQueueRepositoryPort } from '@/modules/sync/domain/repositories/sync-queue-repository.port';
import { RedisService } from '@/shared/infrastructure/cache/redis.service';
export declare class SyncService {
    private readonly repo;
    private readonly redis;
    private readonly logger;
    constructor(repo: SyncQueueRepositoryPort, redis: RedisService);
    enqueue(eventType: string, entityType: string, entityId: string, payload: Record<string, any>): Promise<void>;
    pendingCount(): Promise<number>;
    getStatus(): Promise<{
        cloudOnline: boolean;
        lastSync: Date;
        pending: number;
        failed: number;
        synced: number;
    }>;
    requeueFailed(): Promise<number>;
}
