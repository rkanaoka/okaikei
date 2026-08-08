import { Global, Module } from '@nestjs/common';
import { EventsGateway }  from './events.gateway';
import { WebSocketGatewayPublisher } from './publishers/websocket-gateway.publisher';
import { WEBSOCKET_PUBLISHER_PORT }  from '@/shared/application/contracts/websocket-publisher.port';

@Global()
@Module({
  providers: [
    EventsGateway,
    {
      provide:  WEBSOCKET_PUBLISHER_PORT,
      useClass: WebSocketGatewayPublisher,
    },
    WebSocketGatewayPublisher,
  ],
  exports: [
    EventsGateway,
    WEBSOCKET_PUBLISHER_PORT,
  ],
})
export class GatewayModule {}
