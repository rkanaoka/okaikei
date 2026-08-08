import { OnModuleInit } from '@nestjs/common';
import { SyncQueueRepositoryPort } from '@/modules/sync/domain/repositories/sync-queue-repository.port';
import { CloudSyncApiClientPort } from '@/modules/sync/application/contracts/cloud-sync-api-client.port';
import { WebSocketPublisherPort } from '@/shared/application/contracts/websocket-publisher.port';
import { RedisService } from '@/shared/infrastructure/cache/redis.service';
import { SyncService } from './sync.service';
export declare class SyncWorker implements OnModuleInit {
    private readonly repo;
    private readonly cloudApi;
    private readonly wsPublisher;
    private readonly redis;
    private readonly sync;
    private readonly logger;
    private processing;
    constructor(repo: SyncQueueRepositoryPort, cloudApi: CloudSyncApiClientPort, wsPublisher: WebSocketPublisherPort, redis: RedisService, sync: SyncService);
    onModuleInit(): void;
    process(): Promise<void>;
    checkConnectivity(): Promise<void>;
}
