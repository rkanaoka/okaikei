/**
 * Port para publicação de eventos via WebSocket.
 * Usado por Use Cases da camada de aplicação — nunca acessa o gateway diretamente.
 */
export const WEBSOCKET_PUBLISHER_PORT = Symbol('WebSocketPublisherPort');

export interface WebSocketPublisherPort {
  emitComandaCreated(data: any): void;
  emitComandaUpdated(data: any): void;
  emitComandaClosed(data: any): void;
  emitSyncStatus(data: { online: boolean; pendingCount: number; lastSync: Date | null }): void;
}
