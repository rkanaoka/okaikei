import { SyncEvent } from '@/modules/sync/domain/repositories/sync-queue-repository.port';

export const CLOUD_SYNC_API_CLIENT_PORT = Symbol('CloudSyncApiClientPort');

export interface CloudSyncApiClientPort {
  sendBatch(cloudUrl: string, events: SyncEvent[]): Promise<boolean>;
  checkHealth(cloudUrl: string): Promise<boolean>;
}
