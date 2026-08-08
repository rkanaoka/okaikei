import { Inject, Injectable, Logger } from '@nestjs/common';
import { SYNC_QUEUE_REPOSITORY_PORT, SyncQueueRepositoryPort } from '@/modules/sync/domain/repositories/sync-queue-repository.port';
import { RedisService } from '@/shared/infrastructure/cache/redis.service';
import { uuidv7 }       from 'uuidv7';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @Inject(SYNC_QUEUE_REPOSITORY_PORT) private readonly repo: SyncQueueRepositoryPort,
    private readonly redis: RedisService,
  ) {}

  /**
   * Enfileira um evento para sincronização com a nuvem.
   * NUNCA lança exceção — falha silenciosamente para não bloquear o caixa.
   */
  async enqueue(
    eventType:  string,
    entityType: string,
    entityId:   string,
    payload:    Record<string, any>,
  ): Promise<void> {
    try {
      await this.repo.enqueue({
        id: uuidv7(), eventType, entityType, entityId, payload,
        status:    'PENDING',
        nextRetry: new Date(),
      });
    } catch (err) {
      this.logger.warn(`SyncQueue enqueue failed (non-critical): ${err.message}`);
    }
  }

  async pendingCount(): Promise<number> {
    return this.repo.countByStatus(['PENDING', 'FAILED']);
  }

  async getStatus() {
    const [counts, cloudOnline, lastSynced] = await Promise.all([
      this.repo.countAllStatuses(),
      this.redis.isCloudOnline(),
      this.repo.findLastSynced(),
    ]);
    return { ...counts, cloudOnline, lastSync: lastSynced?.syncedAt ?? null };
  }

  async requeueFailed(): Promise<number> {
    const count = await this.repo.requeueExpiredFailed(10);
    if (count > 0) this.logger.log(`Re-queued ${count} failed sync events`);
    return count;
  }
}
