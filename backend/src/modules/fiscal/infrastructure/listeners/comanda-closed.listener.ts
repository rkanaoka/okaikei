import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NatsService } from '@/shared/infrastructure/messaging/nats.service';
import { NfceService } from '@/modules/fiscal/application/use-cases/nfce.service';

/**
 * Integração desacoplada com o PDV: o fechamento de comanda já publica `comanda.closed` no NATS;
 * o fiscal apenas escuta. O PDV não importa nada do módulo fiscal e não espera pela emissão.
 * Se o NATS estiver fora, a rotina `catchUp` (fiscal.jobs.ts) cobre as comandas sem documento.
 */
@Injectable()
export class ComandaClosedListener implements OnModuleInit {
  private readonly logger = new Logger(ComandaClosedListener.name);

  constructor(private readonly nats: NatsService, private readonly nfce: NfceService) {}

  onModuleInit() {
    const sub = this.nats.subscribe('comanda.closed', (comanda) => {
      const id = comanda?.id;
      if (!id) return;
      // Fire-and-forget: a chamada à Focus pode demorar e não deve travar o consumo de eventos.
      void this.nfce.emitAutomatic(String(id));
    });
    if (!sub) this.logger.warn('NATS indisponível — emissão automática dependerá da rotina de recuperação');
  }
}
