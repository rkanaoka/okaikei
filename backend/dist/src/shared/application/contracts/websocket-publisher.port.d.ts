export declare const WEBSOCKET_PUBLISHER_PORT: unique symbol;
export interface WebSocketPublisherPort {
    emitComandaCreated(data: any): void;
    emitComandaUpdated(data: any): void;
    emitComandaClosed(data: any): void;
    emitSyncStatus(data: {
        online: boolean;
        pendingCount: number;
        lastSync: Date | null;
    }): void;
}
