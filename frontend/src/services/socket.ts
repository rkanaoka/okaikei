import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost/ws';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      path:          '/ws',
      transports:    ['websocket'],
      reconnection:  true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect',    () => console.log('[WS] connected'));
    socket.on('disconnect', () => console.log('[WS] disconnected'));
    socket.on('error', (err) => console.error('[WS] error', err));
  }
  return socket;
}

export const WS_EVENTS = {
  COMANDA_UPDATED: 'comanda:updated',
  COMANDA_CREATED: 'comanda:created',
  COMANDA_CLOSED:  'comanda:closed',
  ORDER_SENT:      'order:sent',
  ORDER_READY:     'order:ready',
  TABLE_UPDATED:   'table:updated',
  SYNC_STATUS:     'sync:status',
} as const;
