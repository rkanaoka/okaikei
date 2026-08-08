import { Injectable } from '@nestjs/common';
import { WebSocketPublisherPort } from '@/shared/application/contracts/websocket-publisher.port';
import { EventsGateway } from '@/runtimes/api/websocket/events.gateway';

@Injectable()
export class WebSocketGatewayPublisher implements WebSocketPublisherPort {
  constructor(private readonly gateway: EventsGateway) {}

  emitComandaCreated(data: any)  { this.gateway.emitComandaCreated(data); }
  emitComandaUpdated(data: any)  { this.gateway.emitComandaUpdated(data); }
  emitComandaClosed(data: any)   { this.gateway.emitComandaClosed(data);  }
  emitSyncStatus(data: any)      { this.gateway.emitSyncStatus(data);     }
}
