import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Avatar from "@/features/user-profile/components/Avatar.tsx";
import axios from "axios";
import { getChatSocket } from "./ChatSocket";
import { useAuth } from "@/features/auth/services/AuthContext";
import { X } from "lucide-react";
import type { Socket } from "socket.io-client";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type MinimalUser = {
  id: number;
  nombre?: string | null;
  apodo?: string | null;
  avatar?: string | null;
};

type ChatMsg = {
  id: number | string; // negativo tempId de DB id
  content: string;
  sender_id?: number;
  receiver_id?: number;
  senderId?: number;
  receiverId?: number;
  created_at: string;
  sender?: MinimalUser | null;
  receiver?: MinimalUser | null;
  tempId?: number;
};

interface ChatModalProps {
  otherUser: MinimalUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChatModal({
  otherUser,
  open,
  onOpenChange,
}: ChatModalProps) {
  const { user, getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const roomId = useMemo(() => {
    if (!user || !otherUser) return null;
    const ids = [Number(user.id), Number(otherUser.id)].sort((a, b) => a - b);
    return `${ids[0]}-${ids[1]}`;
  }, [user, otherUser]);

  const safeAlt = (u?: MinimalUser | null) => {
    return u?.nombre ?? u?.apodo ?? undefined;
  };
  const safeInitial = (u?: MinimalUser | null) => {
    const s = u?.nombre ?? u?.apodo ?? "U";
    return String(s)[0]?.toUpperCase() ?? "U";
  };

  // La conversación se actualiza automáticamente
  const dispatchConversationUpdated = (
    otherId: number | null,
    lastMessage?: string | null,
    lastAt?: string | Date | null
  ) => {
    try {
      window.dispatchEvent(
        new CustomEvent("chat:conversationUpdated", {
          detail: {
            otherId,
            lastMessage: lastMessage ?? null,
            lastAt: lastAt
              ? typeof lastAt === "string"
                ? new Date(lastAt).toISOString()
                : (lastAt as Date).toISOString()
              : null,
          },
        })
      );
    } catch {}
  };

  // Se Obtiene el historial y configuramos las escuchas de sockets con limpieza adecuada
  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setMessages([]);
    setText("");

    const fetchHistory = async () => {
      if (!otherUser || !user) return;
      setLoading(true);
      try {
        const token = getToken?.() ?? undefined;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get<ChatMsg[]>(
          `${API_BASE_URL.replace(/\/+$/, "")}/chat/with/${otherUser.id}`,
          { headers }
        );
        if (!mounted) return;
        const normalized = (res.data ?? []).map((m) => ({
          ...m,
          created_at: m.created_at
            ? new Date(m.created_at).toISOString()
            : new Date().toISOString(),
        }));
        setMessages(normalized);
      } catch (err) {
        console.warn("Error fetching chat history:", err);
        if (mounted) setMessages([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Socket setup
    const setupSocket = () => {
      const token = getToken?.() ?? undefined;
      const s = getChatSocket(token);
      socketRef.current = s;

      const joinRooms = () => {
        try {
          if (user && user.id) s.emit("joinUser", { userId: Number(user.id) });
        } catch {}
        if (roomId) {
          try {
            s.emit("joinRoom", { roomId });
          } catch {}
        }
      };

      s.on("connect", joinRooms);
      if (s.connected) joinRooms();

      const handler = (incoming: ChatMsg) => {
        const inc = {
          ...incoming,
          created_at: incoming.created_at
            ? new Date(incoming.created_at).toISOString()
            : new Date().toISOString(),
        };

        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(inc.id))) {
            return prev;
          }

          if (inc.tempId != null) {
            const idx = prev.findIndex(
              (m) => Number(m.id) === Number(inc.tempId)
            );
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = inc;
              return next;
            }
          }

          const optIndex = prev.findIndex(
            (m) =>
              Number(m.id) < 0 &&
              Number(m.sender_id ?? m.senderId ?? m.sender?.id ?? NaN) ===
                Number(
                  inc.sender_id ?? inc.senderId ?? inc.sender?.id ?? NaN
                ) &&
              String(m.content).trim() === String(inc.content).trim()
          );

          if (optIndex !== -1) {
            const next = [...prev];
            next[optIndex] = inc;
            return next;
          }

          return [...prev, inc];
        });

        // Se envia la conversación. Se actualiza SOLO si el modal NO está abierto.
        // Cuando el modal está abierto, no queremos la insignia/notificación (ya estás dentro).
        // El valor 'abierto' proviene de las propiedades y se captura correctamente aquí porque el efecto se vuelve a ejecutar cuando cambia la apertura.
        if (!open) {
          const incomingSenderId = Number(
            inc.sender_id ?? inc.senderId ?? inc.sender?.id ?? NaN
          );
          const incomingReceiverId = Number(
            inc.receiver_id ?? inc.receiverId ?? inc.receiver?.id ?? NaN
          );
          const currentUserId = Number(user?.id ?? NaN);
          let otherId: number | null = null;
          if (
            !Number.isFinite(incomingSenderId) ||
            !Number.isFinite(incomingReceiverId)
          ) {
            otherId = otherUser?.id ?? null;
          } else {
            otherId =
              incomingSenderId === currentUserId
                ? incomingReceiverId
                : incomingSenderId;
          }
          dispatchConversationUpdated(
            otherId,
            inc.content ?? null,
            inc.created_at ?? null
          );
        }
      };

      s.on("newMessage", handler);

      // Marca de lectura automática al abrir
      const markRead = async () => {
        try {
          if (!user || !otherUser) return;
          const token = getToken?.() ?? undefined;
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          await axios.post(
            `${API_BASE_URL.replace(/\/+$/, "")}/chat/mark-read`,
            { otherId: otherUser.id },
            { headers }
          );
          // Se borra la insignia cuando se abre la conversación
          dispatchConversationUpdated(
            otherUser.id,
            null,
            new Date().toISOString()
          );
        } catch (e) {
          // no critico
        }
      };

      fetchHistory().then(() => markRead());

      return () => {
        mounted = false;
        try {
          s.off("connect", joinRooms);
          s.off("newMessage", handler);
          if (roomId) {
            try {
              s.emit("leaveRoom", { roomId });
            } catch {}
          }
        } catch {}
        socketRef.current = null;
      };
    };

    const cleanupSocket = setupSocket();

    return () => {
      if (typeof cleanupSocket === "function") cleanupSocket();
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, otherUser?.id, roomId]);

  // Te lleva al último mensaje de la conversación
  useEffect(() => {
    try {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    } catch {}
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || !user || !otherUser) return;

    const tempId = -Date.now();

    const payload = {
      content: text.trim(),
      senderId: Number(user.id),
      receiverId: Number(otherUser.id),
      tempId,
    };

    const optimistic: ChatMsg = {
      id: tempId,
      content: payload.content,
      sender_id: payload.senderId,
      receiver_id: payload.receiverId,
      created_at: new Date().toISOString(),
      sender: {
        id: Number(user.id),
        nombre: user.nombre,
        apodo: user.apodo,
        avatar: user.avatar,
      },
      receiver: otherUser,
      tempId,
    };

    setMessages((p) => [...p, optimistic]);
    setText("");

    try {
      const s = socketRef.current ?? getChatSocket(getToken?.() ?? undefined);
      s.emit("sendMessage", payload);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const renderTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg [&>button]:hidden p-0 overflow-hidden rounded-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar
              src={otherUser?.avatar ?? undefined}
              alt={safeAlt(otherUser)}
              size={40}
              initials={safeInitial(otherUser)}
            />
            <div className="min-w-0">
              <div className="font-bold">
                {otherUser?.nombre ?? otherUser?.apodo}
              </div>
              <div className="text-sm text-gray-500">@{otherUser?.apodo}</div>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar"
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 h-80 overflow-y-auto" ref={scrollRef}>
          {loading ? (
            <div className="text-center text-sm text-gray-500">Cargando...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-gray-500">
              No hay mensajes todavía
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => {
                const senderId = Number(
                  m.sender_id ?? (m as any).senderId ?? m.sender?.id ?? NaN
                );
                const mine = Number(user?.id) === senderId;
                const senderObj =
                  m.sender ??
                  (senderId === Number(user?.id) ? user : otherUser) ??
                  null;

                return (
                  <div
                    key={String(m.id)}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    {!mine && (
                      <div className="mr-2">
                        <Avatar
                          src={senderObj?.avatar ?? undefined}
                          alt={safeAlt(senderObj ?? null)}
                          size={28}
                          initials={safeInitial(senderObj ?? null)}
                        />
                      </div>
                    )}

                    <div
                      className={`max-w-[70%] px-3 py-2 rounded-lg ${
                        mine
                          ? "bg-[#2683ab] text-white"
                          : "bg-slate-200 text-gray-900"
                      }`}
                    >
                      <div className="text-sm">{m.content}</div>
                      <div className="text-xs text-gray-400 mt-1 text-right">
                        {renderTime(m.created_at)}
                      </div>
                    </div>

                    {mine && (
                      <div className="ml-2">
                        <Avatar
                          src={senderObj?.avatar ?? undefined}
                          alt={safeAlt(senderObj ?? null)}
                          size={28}
                          initials={safeInitial(senderObj ?? null)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3 border-t flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText((e.target as HTMLInputElement).value)}
            placeholder="Escribe un mensaje..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            className="whitespace-nowrap cursor-pointer active:shadow-inner active:opacity-90 transition-colors transform duration-300 font-bold bg-linear-to-bl from-[#ce016e] via-[#e63f58] to-[#e37d01] text-white"
            disabled={!text.trim()}
          >
            Enviar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
