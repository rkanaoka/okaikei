import { Controller, Get, Post, Query } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncWorker }  from './sync.worker';

/**
 * Endpoint da API de sincronização.
 * Usado tanto localmente (dashboard) quanto pela nuvem para comunicação reversa.
 */
@Controller('sync')
export class SyncController {
  constructor(
    private readonly sync:   SyncService,
    private readonly worker: SyncWorker,
  ) {}

  /** Status de sincronização para o dashboard */
  @Get('status')
  status() {
    return this.sync.getStatus();
  }

  /** Força processamento imediato da fila */
  @Post('flush')
  async flush() {
    await this.worker.process();
    return { ok: true };
  }

  /**
   * Endpoint para receber atualizações incrementais da nuvem
   * (ex: sincronização reversa de dados mestre: cardápio, configs)
   */
  @Post('receive')
  receive() {
    return { ok: true, message: 'Received' };
  }

  /** Pendentes paginados — para auditoria */
  @Get('queue')
  async queue(@Query('page') page = '1') {
    const skip = (parseInt(page) - 1) * 50;
    const [items, total] = await Promise.all([
      // Direct prisma access via service would be cleaner but this is a diagnostic endpoint
      this.sync.pendingCount(),
      this.sync.getStatus(),
    ]);
    return { total, status: total };
  }
}
