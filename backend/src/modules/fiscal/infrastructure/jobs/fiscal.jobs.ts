import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NfceService } from '@/modules/fiscal/application/use-cases/nfce.service';

/** Rotinas periódicas. Ambas retornam imediatamente quando `fiscal_enabled` está desligado. */
@Injectable()
export class FiscalJobs {
  private readonly logger = new Logger(FiscalJobs.name);
  private running = false;

  constructor(private readonly nfce: NfceService) {}

  @Cron('0 */2 * * * *')
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.nfce.reconcile();
      await this.nfce.catchUp();
    } catch (err: any) {
      this.logger.warn(`Rotina fiscal falhou: ${err.message}`);
    } finally {
      this.running = false;
    }
  }
}
