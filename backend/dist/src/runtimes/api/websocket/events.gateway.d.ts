import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare const WS_EVENTS: {
    readonly COMANDA_UPDATED: "comanda:updated";
    readonly COMANDA_CREATED: "comanda:created";
    readonly COMANDA_CLOSED: "comanda:closed";
    readonly ORDER_SENT: "order:sent";
    readonly ORDER_READY: "order:ready";
    readonly TABLE_UPDATED: "table:updated";
    readonly SYNC_STATUS: "sync:status";
    readonly JOIN_ROOM: "join:room";
    readonly LEAVE_ROOM: "leave:room";
};
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinRoom(client: Socket, room: string): void;
    handleLeaveRoom(client: Socket, room: string): void;
    emitToAll(event: string, data: any): void;
    emitToRoom(room: string, event: string, data: any): void;
    emitComandaCreated(comanda: any): void;
    emitComandaUpdated(comanda: any): void;
    emitComandaClosed(comanda: any): void;
    emitOrderSent(items: any[], comanda: any): void;
    emitSyncStatus(status: {
        online: boolean;
        pendingCount: number;
        lastSync?: Date;
    }): void;
}
