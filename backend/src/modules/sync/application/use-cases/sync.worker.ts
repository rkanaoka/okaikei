import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression }    from '@nestjs/schedule';
import { SYNC_QUEUE_REPOSITORY_PORT, SyncQueueRepositoryPort } from '@/modules/sync/domain/repositories/sync-queue-repository.port';
import { CLOUD_SYNC_API_CLIENT_PORT, CloudSyncApiClientPort }  from '@/modules/sync/application/contracts/cloud-sync-api-client.port';
import { WEBSOCKET_PUBLISHER_PORT, WebSocketPublisherPort }    from '@/shared/application/contracts/websocket-publisher.port';
import { RedisService } from '@/shared/infrastructure/cache/redis.service';
import { SyncService }  from './sync.service';

const BATCH_SIZE      = 50;
const MAX_ATTEMPTS    = 10;
const RETRY_DELAYS_MS = [
  5_000, 15_000, 30_000, 60_000,
  120_000, 300_000, 600_000, 1_200_000, 1_800_000, 3_600_000,
];

@Injectable()
export class SyncWorker implements OnModuleInit {
  private readonly logger = new Logger(SyncWorker.name);
  private processing = false;

  constructor(
    @Inject(SYNC_QUEUE_REPOSITORY_PORT)  private readonly repo:      SyncQueueRepositoryPort,
    @Inject(CLOUD_SYNC_API_CLIENT_PORT)  private readonly cloudApi:  CloudSyncApiClientPort,
    @Inject(WEBSOCKET_PUBLISHER_PORT)    private readonly wsPublisher: WebSocketPublisherPort,
    private readonly redis:   RedisService,
    private readonly sync:    SyncService,
  ) {}

  onModuleInit() {
    setTimeout(() => this.process(), 5000);
  }

  @Cron('*/10 * * * * *')
  async process() {
    if (this.processing) return;
    const cloudUrl = process.env.CLOUD_API_URL;
    if (!cloudUrl) return;

    this.processing = true;
    try {
      await this.sync.requeueFailed();

      const events = await this.repo.findPendingBatch(BATCH_SIZE);
      if (!events.length) return;

      this.logger.debug(`Processing ${events.length} sync events`);
      await this.repo.markInProgress(events.map((e) => e.id));

      const online = await this.cloudApi.sendBatch(cloudUrl, events);
      await this.redis.setCloudStatus(online);

      if (online) {
        await this.repo.markSynced(events.map((e) => e.id));
        this.logger.log(`Synced ${events.length} events to cloud`);
      } else {
        for (const event of events) {
          await this.repo.markFailed(event, 'Cloud API unreachable', MAX_ATTEMPTS, RETRY_DELAYS_MS);
        }
        this.logger.warn(`Cloud unreachable — ${events.length} events re-queued`);
      }

      const status = await this.sync.getStatus();
      this.wsPublisher.emitSyncStatus({ online, pendingCount: status.pending, lastSync: status.lastSync });

    } catch (err) {
      this.logger.error(`SyncWorker error: ${err.message}`);
    } finally {
      this.processing = false;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkConnectivity() {
    const cloudUrl = process.env.CLOUD_API_URL;
    if (!cloudUrl) return;
    const online = await this.cloudApi.checkHealth(cloudUrl);
    await this.redis.setCloudStatus(online);
  }
}
