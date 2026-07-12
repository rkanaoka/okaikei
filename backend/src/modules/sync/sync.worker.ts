import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression }              from '@nestjs/schedule';
import { PrismaService }  from '@/common/prisma/prisma.service';
import { RedisService }   from '@/common/redis/redis.service';
import { EventsGateway }  from '@/gateway/events.gateway';
import { SyncService }    from './sync.service';
import axios              from 'axios';

const BATCH_SIZE       = 50;
const MAX_ATTEMPTS     = 10;
const RETRY_DELAYS_MS  = [
  5_000, 15_000, 30_000, 60_000,
  120_000, 300_000, 600_000, 1_200_000, 1_800_000, 3_600_000,
];

@Injectable()
export class SyncWorker implements OnModuleInit {
  private readonly logger = new Logger(SyncWorker.name);
  private processing = false;

  constructor(
    private readonly prisma:   PrismaService,
    private readonly redis:    RedisService,
    private readonly gateway:  EventsGateway,
    private readonly sync:     SyncService,
  ) {}

  onModuleInit() {
    // Primeira checagem na inicialização
    setTimeout(() => this.process(), 5000);
  }

  // ── Roda a cada 10 segundos ───────────────────────────────────────────────
  @Cron('*/10 * * * * *')
  async process() {
    if (this.processing) return;

    const cloudUrl = process.env.CLOUD_API_URL;
    if (!cloudUrl) {
      // Nuvem não configurada — modo 100% local, sem sync
      return;
    }

    this.processing = true;
    try {
      // Re-agendar eventos com retry vencido
      await this.sync.requeueFailed();

      // Buscar lote de eventos pendentes
      const events = await this.prisma.syncQueue.findMany({
        where: {
          status:    'PENDING',
          nextRetry: { lte: new Date() },
        },
        orderBy: { createdAt: 'asc' },
        take:    BATCH_SIZE,
      });

      if (!events.length) return;

      this.logger.debug(`Processing ${events.length} sync events`);

      // Marcar como IN_PROGRESS para evitar processamento duplo
      await this.prisma.syncQueue.updateMany({
        where: { id: { in: events.map((e) => e.id) } },
        data:  { status: 'IN_PROGRESS', lastAttempt: new Date() },
      });

      // Tentar enviar para nuvem
      const online = await this.sendBatch(cloudUrl, events);
      await this.redis.setCloudStatus(online);

      if (online) {
        // Marcar como sincronizados
        await this.prisma.syncQueue.updateMany({
          where: { id: { in: events.map((e) => e.id) } },
          data:  { status: 'SYNCED', syncedAt: new Date() },
        });
        this.logger.log(`Synced ${events.length} events to cloud`);
      } else {
        // Falhou — agendar retry com backoff exponencial
        for (const event of events) {
          const attempts = event.attempts + 1;
          const delayMs  = RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)];
          const nextRetry = new Date(Date.now() + delayMs);
          const status    = attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING';

          await this.prisma.syncQueue.update({
            where: { id: event.id },
            data: {
              status,
              attempts,
              nextRetry,
              errorMessage: 'Cloud API unreachable',
            },
          });
        }
        this.logger.warn(`Cloud unreachable — ${events.length} events re-queued`);
      }

      // Emitir status via WebSocket
      const status = await this.sync.getStatus();
      this.gateway.emitSyncStatus({ online, pendingCount: status.pending, lastSync: status.lastSync });

    } catch (err) {
      this.logger.error(`SyncWorker error: ${err.message}`);
    } finally {
      this.processing = false;
    }
  }

  // ── Envio em lote para a API da nuvem ────────────────────────────────────

  private async sendBatch(url: string, events: any[]): Promise<boolean> {
    try {
      const response = await axios.post(
        `${url}/ingest`,
        { events: events.map((e) => ({ id: e.id, type: e.eventType, entity: e.entityType, entityId: e.entityId, payload: e.payload, createdAt: e.createdAt })) },
        {
          headers: {
            'Content-Type':  'application/json',
            'X-Api-Key':     process.env.CLOUD_API_KEY ?? '',
            'X-Restaurant':  'bodogami-sp',
          },
          timeout: 8000,
        },
      );
      return response.status >= 200 && response.status < 300;
    } catch {
      return false;
    }
  }

  // ── Verificação de conectividade (a cada minuto) ─────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async checkConnectivity() {
    const cloudUrl = process.env.CLOUD_API_URL;
    if (!cloudUrl) return;

    try {
      await axios.get(`${cloudUrl}/health`, { timeout: 3000 });
      await this.redis.setCloudStatus(true);
    } catch {
      await this.redis.setCloudStatus(false);
    }
  }
}
