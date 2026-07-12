import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export const WS_EVENTS = {
  // Server → Clients
  COMANDA_UPDATED:  'comanda:updated',
  COMANDA_CREATED:  'comanda:created',
  COMANDA_CLOSED:   'comanda:closed',
  ORDER_SENT:       'order:sent',
  ORDER_READY:      'order:ready',
  TABLE_UPDATED:    'table:updated',
  SYNC_STATUS:      'sync:status',
  // Client → Server
  JOIN_ROOM:        'join:room',
  LEAVE_ROOM:       'leave:room',
} as const;

@WebSocketGateway({
  cors:      { origin: '*' },
  namespace: '/ws',
  path:      '/ws',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`WS connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`WS disconnected: ${client.id}`);
  }

  @SubscribeMessage(WS_EVENTS.JOIN_ROOM)
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    client.join(room);
    this.logger.debug(`${client.id} joined room: ${room}`);
  }

  @SubscribeMessage(WS_EVENTS.LEAVE_ROOM)
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    client.leave(room);
  }

  // ── Broadcast helpers ──────────────────────────────────────────────────────

  emitToAll(event: string, data: any) {
    this.server?.emit(event, data);
  }

  emitToRoom(room: string, event: string, data: any) {
    this.server?.to(room).emit(event, data);
  }

  emitComandaCreated(comanda: any) {
    this.emitToAll(WS_EVENTS.COMANDA_CREATED, comanda);
    this.emitToRoom('dashboard', WS_EVENTS.COMANDA_CREATED, comanda);
  }

  emitComandaUpdated(comanda: any) {
    this.emitToAll(WS_EVENTS.COMANDA_UPDATED, comanda);
    this.emitToRoom(`comanda:${comanda.id}`, WS_EVENTS.COMANDA_UPDATED, comanda);
  }

  emitComandaClosed(comanda: any) {
    this.emitToAll(WS_EVENTS.COMANDA_CLOSED, comanda);
  }

  emitOrderSent(items: any[], comanda: any) {
    // Notifica cozinha/bar
    this.emitToRoom('kitchen', WS_EVENTS.ORDER_SENT, { items, comanda });
    this.emitToRoom('bar',     WS_EVENTS.ORDER_SENT, { items, comanda });
    this.emitToRoom(`comanda:${comanda.id}`, WS_EVENTS.ORDER_SENT, { items, comanda });
  }

  emitSyncStatus(status: { online: boolean; pendingCount: number; lastSync?: Date }) {
    this.emitToRoom('dashboard', WS_EVENTS.SYNC_STATUS, status);
  }
}
