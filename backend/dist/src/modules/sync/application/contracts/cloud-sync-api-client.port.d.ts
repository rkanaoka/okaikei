import { SyncEvent } from '@/modules/sync/domain/repositories/sync-queue-repository.port';
export declare const CLOUD_SYNC_API_CLIENT_PORT: unique symbol;
export interface CloudSyncApiClientPort {
    sendBatch(cloudUrl: string, events: SyncEvent[]): Promise<boolean>;
    checkHealth(cloudUrl: string): Promise<boolean>;
}
