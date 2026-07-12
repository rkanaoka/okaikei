import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
export declare class SyncService {
    private readonly prisma;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService);
    enqueue(eventType: string, entityType: string, entityId: string, payload: Record<string, any>): Promise<void>;
    pendingCount(): Promise<number>;
    getStatus(): Promise<{
        pending: number;
        failed: number;
        synced: number;
        cloudOnline: boolean;
        lastSync: Date;
    }>;
    requeueFailed(): Promise<number>;
}
