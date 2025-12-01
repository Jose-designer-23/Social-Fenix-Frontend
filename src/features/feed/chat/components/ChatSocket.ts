import { io, Socket } from "socket.io-client";

/**
 * Singleton socket.io client para namespace /chat
 * Acepta token: string | null | undefined
 */
const BASE = import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const SOCKET_URL = `${BASE.replace(/\/+$/, "")}/chat`;

let socket: Socket | null = null;

export function getChatSocket(token?: string | null | undefined): Socket {
  // Si ya está conectado, reutilizamos
  if (socket && socket.connected) return socket;

  socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnectionAttempts: 5,
    // Si token es null o undefined, enviamos undefined (socket.io ignora auth)
    auth: token ? { token } : undefined,
  });

  socket.on("connect_error", (err) => {
    console.error("[chatSocket] connect_error", err && (err as Error).message ? (err as Error).message : err);
  });

  socket.on("connect", () => {
    // console.debug("[chatSocket] connected", socket?.id);
  });

  return socket;
}

export function closeChatSocket() {
  try {
    socket?.close();
  } catch {}
  socket = null;
}