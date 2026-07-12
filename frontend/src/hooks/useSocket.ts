import { useEffect, useRef } from 'react';
import { getSocket } from '@/services/socket';

export function useSocketEvent<T = any>(
  event: string,
  handler: (data: T) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const fn = (data: T) => handlerRef.current(data);
    socket.on(event, fn);
    return () => { socket.off(event, fn); };
  }, [event]);
}

export function useJoinRoom(room: string) {
  useEffect(() => {
    const socket = getSocket();
    socket.emit('join:room', room);
    return () => { socket.emit('leave:room', room); };
  }, [room]);
}
