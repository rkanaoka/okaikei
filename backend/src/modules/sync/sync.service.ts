import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService }  from '@/common/redis/redis.service';
import { uuidv7 }        from 'uuidv7';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis:  RedisService,
  ) {}

  /**
   * Enfileira um evento para sincronização com a nuvem.
   * Chamado após CADA operação de escrita no banco local.
   * NUNCA lança exceção — falha silenciosamente para não bloquear o caixa.
   */
  async enqueue(
    eventType:  string,
    entityType: string,
    entityId:   string,
    payload:    Record<string, any>,
  ): Promise<void> {
    try {
      await this.prisma.syncQueue.create({
        data: {
          id:         uuidv7(),
          eventType,
          entityType,
          entityId,
          payload,
          status:     'PENDING',
          nextRetry:  new Date(),
        },
      });
    } catch (err) {
      // Sync queue falhou, mas operação local está salva — não é crítico
      this.logger.warn(`SyncQueue enqueue failed (non-critical): ${err.message}`);
    }
  }

  /**
   * Retorna contagem de eventos pendentes (para o dashboard).
   */
  async pendingCount(): Promise<number> {
    return this.prisma.syncQueue.count({
      where: { status: { in: ['PENDING', 'FAILED'] } },
    });
  }

  /**
   * Retorna status geral da sincronização.
   */
  async getStatus() {
    const [pending, failed, synced, cloudOnline] = await Promise.all([
      this.prisma.syncQueue.count({ where: { status: 'PENDING' } }),
      this.prisma.syncQueue.count({ where: { status: 'FAILED' } }),
      this.prisma.syncQueue.count({ where: { status: 'SYNCED' } }),
      this.redis.isCloudOnline(),
    ]);
    const lastSynced = await this.prisma.syncQueue.findFirst({
      where:   { status: 'SYNCED' },
      orderBy: { syncedAt: 'desc' },
      select:  { syncedAt: true },
    });
    return { pending, failed, synced, cloudOnline, lastSync: lastSynced?.syncedAt ?? null };
  }

  /**
   * Re-agenda eventos FAILED que passaram do prazo de retry.
   */
  async requeueFailed(): Promise<number> {
    const result = await this.prisma.syncQueue.updateMany({
      where: {
        status:    'FAILED',
        attempts:  { lt: 10 },
        nextRetry: { lte: new Date() },
      },
      data: { status: 'PENDING' },
    });
    if (result.count > 0) {
      this.logger.log(`Re-queued ${result.count} failed sync events`);
    }
    return result.count;
  }
}
