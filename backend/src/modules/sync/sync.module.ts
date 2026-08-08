import { Module }         from '@nestjs/common';
import { SyncService }    from './application/use-cases/sync.service';
import { SyncWorker }     from './application/use-cases/sync.worker';
import { SyncController } from '@/runtimes/api/controllers/sync.controller';
import { SYNC_QUEUE_REPOSITORY_PORT }    from './domain/repositories/sync-queue-repository.port';
import { PrismaSyncQueueRepository }     from './infrastructure/repositories/prisma-sync-queue.repository';
import { CLOUD_SYNC_API_CLIENT_PORT }    from './application/contracts/cloud-sync-api-client.port';
import { AxiosCloudSyncClient }          from './infrastructure/api-clients/axios-cloud-sync.client';

@Module({
  controllers: [SyncController],
  providers: [
    SyncService,
    SyncWorker,
    { provide: SYNC_QUEUE_REPOSITORY_PORT, useClass: PrismaSyncQueueRepository },
    { provide: CLOUD_SYNC_API_CLIENT_PORT, useClass: AxiosCloudSyncClient },
  ],
  exports: [SyncService],
})
export class SyncModule {}
