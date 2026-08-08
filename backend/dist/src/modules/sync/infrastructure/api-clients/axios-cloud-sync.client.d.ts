import { CloudSyncApiClientPort } from '@/modules/sync/application/contracts/cloud-sync-api-client.port';
import { SyncEvent } from '@/modules/sync/domain/repositories/sync-queue-repository.port';
export declare class AxiosCloudSyncClient implements CloudSyncApiClientPort {
    private readonly logger;
    sendBatch(cloudUrl: string, events: SyncEvent[]): Promise<boolean>;
    checkHealth(cloudUrl: string): Promise<boolean>;
}
