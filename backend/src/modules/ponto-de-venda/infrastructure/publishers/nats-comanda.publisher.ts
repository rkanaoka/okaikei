import { Injectable } from '@nestjs/common';
import { NatsService } from '@/shared/infrastructure/messaging/nats.service';
import { ComandaEventPublisherPort } from '@/modules/ponto-de-venda/application/contracts/comanda-event-publisher.port';

@Injectable()
export class NatsComandaPublisher implements ComandaEventPublisherPort {
  constructor(private readonly nats: NatsService) {}

  publishComandaOpened(comanda: any)   { this.nats.publish('comanda.opened',       comanda); }
  publishComandaUpdated(comanda: any)  { this.nats.publish('comanda.updated',      comanda); }
  publishComandaClosed(comanda: any)   { this.nats.publish('comanda.closed',       comanda); }
  publishComandaItemsAdded(data: any)  { this.nats.publish('comanda.items_added',  data);    }
}
