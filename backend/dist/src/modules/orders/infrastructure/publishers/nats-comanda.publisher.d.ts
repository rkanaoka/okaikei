import { NatsService } from '@/shared/infrastructure/messaging/nats.service';
import { ComandaEventPublisherPort } from '@/modules/orders/application/contracts/comanda-event-publisher.port';
export declare class NatsComandaPublisher implements ComandaEventPublisherPort {
    private readonly nats;
    constructor(nats: NatsService);
    publishComandaOpened(comanda: any): void;
    publishComandaUpdated(comanda: any): void;
    publishComandaClosed(comanda: any): void;
    publishComandaItemsAdded(data: any): void;
}
