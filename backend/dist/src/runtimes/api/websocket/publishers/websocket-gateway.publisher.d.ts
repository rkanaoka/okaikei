import { WebSocketPublisherPort } from '@/shared/application/contracts/websocket-publisher.port';
import { EventsGateway } from '@/runtimes/api/websocket/events.gateway';
export declare class WebSocketGatewayPublisher implements WebSocketPublisherPort {
    private readonly gateway;
    constructor(gateway: EventsGateway);
    emitComandaCreated(data: any): void;
    emitComandaUpdated(data: any): void;
    emitComandaClosed(data: any): void;
    emitSyncStatus(data: any): void;
}
