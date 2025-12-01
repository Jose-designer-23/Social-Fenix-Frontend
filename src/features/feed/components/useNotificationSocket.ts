import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOpts {
  url: string;
  token?: string | null;
  namespace?: string; 
  onNotification?: (payload: unknown) => void;
  onConnect?: (socketId: string) => void;
  onDisconnect?: (reason: string) => void;
  onError?: (err: Error) => void;
}

export function useNotificationsSocket({
  url,
  token,
  namespace = '/notifications',
  onNotification,
  onConnect,
  onDisconnect,
  onError,
}: UseSocketOpts) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Si no hay token => desconectar y salir
    if (!token) {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Normalizamos URL y namespace evitando doble slash
    const base = url.replace(/\/$/, '');
    const ns = namespace.startsWith('/') ? namespace : `/${namespace}`;
    const endpoint = `${base}${ns}`;

    // Cerramos socket previo si existe
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(endpoint, {
      auth: { token },
      autoConnect: true,
      reconnectionAttempts: 5,
      // No forzamos transports: ['websocket'] para permitir fallback cuando sea necesario
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // socket.id puede ser undefined hasta que la conexión esté estable.
      if (socket.id) onConnect?.(socket.id);
    });

    socket.on('disconnect', (reason: string) => {
      onDisconnect?.(reason);
    });

    socket.on('connect_error', (err: Error) => {
      onError?.(err);
    });

    socket.on('notification', (payload: unknown) => {
      try {
        onNotification?.(payload);
      } catch (err) {
        // Para que un handler no rompa la aplicación
        // eslint-disable-next-line no-console
        console.error('onNotification handler error', err);
      }
    });

    return () => {
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch {
        // ignore
      }
      socketRef.current = null;
    };
  }, [token, url, namespace, onNotification, onConnect, onDisconnect, onError]);
}