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
import { useTranslation } from "react-i18next";

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

// Componente ChatModal que maneja la interfaz de chat entre usuarios
export default function ChatModal({
  otherUser,
  open,
  onOpenChange,
}: ChatModalProps) {
  const { t, i18n } = useTranslation();
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
        // Garantizamos orden ascendente por fecha
        normalized.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(normalized);
      } catch (err) {
        console.warn("Error fetching chat history:", err);
        if (mounted) setMessages([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

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

          // Append new message and ensure ascending order by created_at
          const appended = [...prev, inc];
          appended.sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );
          return appended;
        });

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
          dispatchConversationUpdated(
            otherUser.id,
            null,
            new Date().toISOString()
          );
        } catch (e) {
          // ignore
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

  // Scroll al final cuando cambian mensajes
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

    setMessages((p) => {
      const next = [...p, optimistic];
      next.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return next;
    });
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
    return d.toLocaleTimeString(i18n.language, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // HELPERS for date separators
  const isSameDay = (isoA?: string, isoB?: string) => {
    if (!isoA || !isoB) return false;
    const a = new Date(isoA);
    const b = new Date(isoB);
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const formatDateSeparator = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    // e.g. "31 Dec" or localized variant
    return new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "short",
    }).format(d);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg [&>button]:hidden p-0 overflow-hidden rounded-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar
              src={otherUser?.avatar ?? undefined}
              alt={safeAlt(otherUser) ?? t("ChatModal.userFallback")}
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
            aria-label={t("ChatModal.closeAria")}
            className="p-1 rounded-full Dark-boton-mensajes cursor-pointer hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 h-80 overflow-y-auto" ref={scrollRef}>
          {loading ? (
            <div className="text-center text-sm text-gray-500">
              {t("ChatModal.loading")}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-gray-500">
              {t("ChatModal.noMessagesYet")}
            </div>
          ) : (
            <div className="space-y-3">
              {/*
                Representa los mensajes en orden ascendente e inserta un separador 
                de fecha cuando el mensaje actual es el primero del día 
                (en comparación con el anterior).
              */}
              {messages
                .slice() // copy
                .sort(
                  (a, b) =>
                    new Date(a.created_at).getTime() -
                    new Date(b.created_at).getTime()
                )
                .map((m, idx, arr) => {
                  const prev = idx > 0 ? arr[idx - 1] : undefined;
                  const showDateSeparator =
                    !prev || !isSameDay(prev.created_at, m.created_at);
                  const senderId = Number(
                    m.sender_id ?? (m as any).senderId ?? m.sender?.id ?? NaN
                  );
                  const mine = Number(user?.id) === senderId;
                  const senderObj =
                    m.sender ??
                    (senderId === Number(user?.id) ? user : otherUser) ??
                    null;

                  return (
                    <div key={String(m.id)}>
                      {showDateSeparator && (
                        <div className="flex items-center justify-center my-2">
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="h-px w-8 bg-gray-300 inline-block" />
                            <span className="px-2">
                              {formatDateSeparator(m.created_at)}
                            </span>
                            <span className="h-px w-8 bg-gray-300 inline-block" />
                          </div>
                        </div>
                      )}

                      <div
                        className={`flex ${
                          mine ? "justify-end" : "justify-start"
                        }`}
                      >
                        {!mine && (
                          <div className="mr-2">
                            <Avatar
                              src={senderObj?.avatar ?? undefined}
                              alt={
                                safeAlt(senderObj ?? null) ??
                                t("ChatModal.userFallback")
                              }
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
                          <div
                            className={`text-xs mt-1 text-right ${
                              mine ? "text-white" : "text-gray-800"
                            }`}
                          >
                            {renderTime(m.created_at)}
                          </div>
                        </div>

                        {mine && (
                          <div className="ml-2">
                            <Avatar
                              src={senderObj?.avatar ?? undefined}
                              alt={
                                safeAlt(senderObj ?? null) ??
                                t("ChatModal.userFallback")
                              }
                              size={28}
                              initials={safeInitial(senderObj ?? null)}
                            />
                          </div>
                        )}
                      </div>
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
            placeholder={t("ChatModal.placeholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            className="whitespace-nowrap cursor-pointer active:shadow-inner active:opacity-90 transition-colors transform duration-300 
            font-bold bg-linear-to-bl from-[#ce016e] via-[#e63f58] to-[#e37d01] text-white"
            disabled={!text.trim()}
          >
            {t("ChatModal.send")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
