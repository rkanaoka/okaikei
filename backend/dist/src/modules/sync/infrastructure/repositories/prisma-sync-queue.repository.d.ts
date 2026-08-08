import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { SyncEvent, SyncQueueRepositoryPort } from '@/modules/sync/domain/repositories/sync-queue-repository.port';
export declare class PrismaSyncQueueRepository implements SyncQueueRepositoryPort {
    private readonly prisma;
    constructor(prisma: PrismaService);
    enqueue(data: {
        id: string;
        eventType: string;
        entityType: string;
        entityId: string;
        payload: Record<string, any>;
        status: string;
        nextRetry: Date;
    }): Promise<void>;
    countByStatus(statuses: string[]): Promise<number>;
    countAllStatuses(): Promise<{
        pending: number;
        failed: number;
        synced: number;
    }>;
    findLastSynced(): Promise<{
        syncedAt: Date;
    }>;
    requeueExpiredFailed(maxAttempts: number): Promise<number>;
    findPendingBatch(limit: number): Promise<SyncEvent[]>;
    markInProgress(ids: string[]): Promise<void>;
    markSynced(ids: string[]): Promise<void>;
    markFailed(event: SyncEvent, errorMessage: string, maxAttempts: number, retryDelaysMs: number[]): Promise<void>;
}
