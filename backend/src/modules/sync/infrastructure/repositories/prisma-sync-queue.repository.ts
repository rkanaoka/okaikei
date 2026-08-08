import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { SyncEvent, SyncQueueRepositoryPort } from '@/modules/sync/domain/repositories/sync-queue-repository.port';

@Injectable()
export class PrismaSyncQueueRepository implements SyncQueueRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(data: {
    id: string; eventType: string; entityType: string;
    entityId: string; payload: Record<string, any>;
    status: string; nextRetry: Date;
  }) {
    await this.prisma.syncQueue.create({ data: data as any });
  }

  async countByStatus(statuses: string[]) {
    return this.prisma.syncQueue.count({ where: { status: { in: statuses as any } } });
  }

  async countAllStatuses() {
    const [pending, failed, synced] = await Promise.all([
      this.prisma.syncQueue.count({ where: { status: 'PENDING' } }),
      this.prisma.syncQueue.count({ where: { status: 'FAILED' } }),
      this.prisma.syncQueue.count({ where: { status: 'SYNCED' } }),
    ]);
    return { pending, failed, synced };
  }

  async findLastSynced() {
    return this.prisma.syncQueue.findFirst({
      where:   { status: 'SYNCED' },
      orderBy: { syncedAt: 'desc' },
      select:  { syncedAt: true },
    });
  }

  async requeueExpiredFailed(maxAttempts: number) {
    const result = await this.prisma.syncQueue.updateMany({
      where: {
        status:    'FAILED',
        attempts:  { lt: maxAttempts },
        nextRetry: { lte: new Date() },
      },
      data: { status: 'PENDING' },
    });
    return result.count;
  }

  async findPendingBatch(limit: number): Promise<SyncEvent[]> {
    return this.prisma.syncQueue.findMany({
      where: { status: 'PENDING', nextRetry: { lte: new Date() } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    }) as unknown as SyncEvent[];
  }

  async markInProgress(ids: string[]) {
    await this.prisma.syncQueue.updateMany({
      where: { id: { in: ids } },
      data:  { status: 'IN_PROGRESS', lastAttempt: new Date() },
    });
  }

  async markSynced(ids: string[]) {
    await this.prisma.syncQueue.updateMany({
      where: { id: { in: ids } },
      data:  { status: 'SYNCED', syncedAt: new Date() },
    });
  }

  async markFailed(event: SyncEvent, errorMessage: string, maxAttempts: number, retryDelaysMs: number[]) {
    const attempts  = event.attempts + 1;
    const delayMs   = retryDelaysMs[Math.min(attempts - 1, retryDelaysMs.length - 1)];
    const nextRetry = new Date(Date.now() + delayMs);
    const status    = attempts >= maxAttempts ? 'FAILED' : 'PENDING';
    await this.prisma.syncQueue.update({
      where: { id: event.id },
      data:  { status, attempts, nextRetry, errorMessage },
    });
  }
}
