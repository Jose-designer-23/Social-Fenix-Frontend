import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/features/auth/services/AuthContext";
import { mapNotificationToPostInteraction } from "@/utils/notification-mapper";

type NotificationsContextValue = {
  reauthSocket: (newToken?: string | null) => Promise<void>;
} | null;

export const NotificationsContext =
  createContext<NotificationsContextValue>(null);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, refetchUser, logout, getToken } = useAuth();
  const token = getToken();

  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(true);

  const WS_BASE = (
    import.meta.env.VITE_WS_URL ??
    import.meta.env.VITE_API_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  // handlePayload: Mapeamos y marcamos explícitamente como server/persisted
  const handlePayload = useCallback((payload: unknown) => {
    try {
      // Primero intentamos mapear a PostInteraction (mapper ya existente)
      const mapped = mapNotificationToPostInteraction(payload as any);
      if (mapped) {
        const toDispatch = {
          ...mapped,
          source: "server" as const,
          persisted: true as const,
        };
        // now toDispatch.commentId and toDispatch.commentSnippet exist (if present)
        window.dispatchEvent(
          new CustomEvent("post:interaction", { detail: toDispatch })
        );
        return;
      }

      // Si mapper devolvió null, puede tratarse de notificación "follow" u "other" sin post.
      const raw = payload as any;
      const type = raw?.type ?? raw?.action ?? "";
      if (type === "follow") {
        // Construimos un objeto similar al shape Interaction que consume NotificationsButton
        const actorPayload = raw.actor ?? null;
        const actorId = actorPayload?.id ?? raw?.actor_id ?? null;

        const actor =
          actorId != null
            ? {
                id: Number(actorId),
                nombre:
                  actorPayload?.nombre ??
                  raw?.actor_nombre ??
                  actorPayload?.name ??
                  null,
                apodo:
                  actorPayload?.apodo ??
                  raw?.actor_apodo ??
                  actorPayload?.username ??
                  null,
                avatar: actorPayload?.avatar ?? raw?.actor_avatar ?? null,
              }
            : null;

        const mappedFollow = {
          action: "follow",
          actor,
          timestamp:
            raw?.created_at ?? raw?.createdAt ?? new Date().toISOString(),
          notificationId: raw?.id ?? null,
          read: typeof raw?.read === "boolean" ? raw.read : false,
          source: "server" as const,
          persisted: true as const,
        };

        window.dispatchEvent(
          new CustomEvent("post:interaction", { detail: mappedFollow })
        );
        return;
      }

      // Si no es follow ni post-interaction conocido, puedes decidir emitir un evento genérico
      // o ignorarlo. Por ahora lo ignoramos.
    } catch (err) {
      // Para que un error no rompa la app
      // eslint-disable-next-line no-console
      console.warn("NotificationsProvider.handlePayload failed", err);
    }
  }, []);

  const disconnectSocket = useCallback(() => {
    const s = socketRef.current;
    if (s) {
      try {
        s.removeAllListeners();
        s.disconnect();
      } catch (err) {
        // ignore
      } finally {
        socketRef.current = null;
      }
    }
  }, []);

  const connectSocket = useCallback(
    (tok?: string | null) => {
      disconnectSocket();
      if (!user || !tok) return;

      try {
        const endpoint = `${WS_BASE}/notifications`;
        const s = io(endpoint, {
          auth: { token: tok },
          autoConnect: true,
          reconnectionAttempts: 5,
        });

        s.on("connect", () => {
          // console.debug('notifications socket connected', s.id);
        });

        s.on("notification", (payload: unknown) => {
          // Dispatch raw payload via mapper logic
          handlePayload(payload);
        });

        s.on("connect_error", async (err: any) => {
          console.warn(
            "Notifications socket connect_error",
            err?.message ?? err
          );
          try {
            await refetchUser();
          } catch (e) {
            logout();
          }
        });

        socketRef.current = s;
      } catch (err) {
        console.warn("NotificationsProvider: socket init failed", err);
      }
    },
    [WS_BASE, disconnectSocket, handlePayload, refetchUser, user, logout]
  );

  const reauthSocket = useCallback(
    async (newToken?: string | null) => {
      const tok = typeof newToken !== "undefined" ? newToken : getToken();
      disconnectSocket();
      if (tok) connectSocket(tok);
    },
    [connectSocket, disconnectSocket, getToken]
  );

  useEffect(() => {
    mountedRef.current = true;
    let didCancel = false;

    const init = async () => {
      const tok = token;
      // Fetch inicial
      try {
        if (tok) {
          const res = await axios.get<{ data?: any[] }>(
            `${
              import.meta.env.VITE_API_URL ?? "http://localhost:3000"
            }/notifications`,
            {
              headers: { Authorization: `Bearer ${tok}` },
            }
          );
          const items = res.data?.data ?? [];
          if (didCancel) return;
          for (const it of items) {
            if (!mountedRef.current) break;
            handlePayload(it);
          }
        }
      } catch (err) {
        console.warn("NotificationsProvider: initial fetch failed", err);
      }

      // Conectamos socket solo si hay user y token
      try {
        const tokForSocket = token;
        if (!user || !tokForSocket) return;
        connectSocket(tokForSocket);
      } catch (err) {
        console.warn("NotificationsProvider: socket init failed", err);
      }
    };

    init();

    return () => {
      didCancel = true;
      mountedRef.current = false;
      disconnectSocket();
    };
  }, [user, token, handlePayload, connectSocket, disconnectSocket]);

  const value = useMemo(() => ({ reauthSocket }), [reauthSocket]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};
