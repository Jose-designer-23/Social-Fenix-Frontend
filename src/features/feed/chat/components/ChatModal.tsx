import { useEffect, useRef, useState, useMemo } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Avatar from "@/features/user-profile/components/Avatar.tsx";
import axios from "axios";
import { getChatSocket } from "./ChatSocket";
import { useAuth } from "@/features/auth/services/AuthContext";
import { X, Paperclip, Smile, Loader2 } from "lucide-react";
import type { Socket } from "socket.io-client";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
];

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type MinimalUser = {
  id: number;
  nombre?: string | null;
  apodo?: string | null;
  avatar?: string | null;
};

type ChatMsg = {
  id: number | string;
  content?: string | null;
  url_imagen?: string | null;
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

// Chatmodal es el modal de chat entre dos usuarios 
export default function ChatModal({ otherUser, open, onOpenChange }: ChatModalProps) {
  const { t, i18n } = useTranslation();
  const { user, getToken } = useAuth();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [emojiOpen, setEmojiOpen] = useState(false);
  const [caretPos, setCaretPos] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const EMOJIS = [
    "😀","😁","😂","🤣","😅","😊","😍","🤩","😘","😎",
    "🤔","😐","😴","😢","😭","😡","👍","👎","🙏","👏",
    "🔥","✨","🎉","💯","❤️","💔","🤝","🙌","😉","🤗",
  ];

  const roomId = useMemo(() => {
    if (!user || !otherUser) return null;
    const ids = [Number(user.id), Number(otherUser.id)].sort((a, b) => a - b);
    return `${ids[0]}-${ids[1]}`;
  }, [user, otherUser]);

  const safeAlt = (u?: MinimalUser | null) => u?.nombre ?? u?.apodo ?? undefined;
  const safeInitial = (u?: MinimalUser | null) => {
    const s = u?.nombre ?? u?.apodo ?? "U";
    return String(s)[0]?.toUpperCase() ?? "U";
  };

  const dispatchConversationUpdated = (otherId: number | null, lastMessage?: string | null, lastAt?: string | Date | null) => {
    try {
      window.dispatchEvent(new CustomEvent("chat:conversationUpdated", {
        detail: {
          otherId,
          lastMessage: lastMessage ?? null,
          lastAt: lastAt ? (typeof lastAt === "string" ? new Date(lastAt).toISOString() : (lastAt as Date).toISOString()) : null,
        }
      }));
    } catch {}
  };

  // Obtener historial y configurar socket
  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setMessages([]);
    setText("");
    setFile(null);
    setPreviewUrl(null);

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
        const normalized = (res.data ?? []).map(m => ({
          ...m,
          created_at: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString()
        }));
        normalized.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
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
        try { if (user && user.id) s.emit("joinUser", { userId: Number(user.id) }); } catch {}
        if (roomId) {
          try { s.emit("joinRoom", { roomId }); } catch {}
        }
      };

      s.on("connect", joinRooms);
      if (s.connected) joinRooms();

      const handler = (incoming: ChatMsg) => {
        const inc = { ...incoming, created_at: incoming.created_at ? new Date(incoming.created_at).toISOString() : new Date().toISOString() };

        setMessages(prev => {
          // evitar duplicados
          if (prev.some(m => String(m.id) === String(inc.id))) return prev;

          // reconciliar tempId
          if (inc.tempId != null) {
            const idx = prev.findIndex(m => Number(m.id) === Number(inc.tempId));
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = inc;
              return next;
            }
          }

          // También conciliar por contenido idéntico + url_imagen para optimistas sin tempId
          const optIndex = prev.findIndex(m =>
            Number(m.id) < 0 &&
            String(m.content ?? "").trim() === String(inc.content ?? "").trim() &&
            String(m.url_imagen ?? "") === String(inc.url_imagen ?? "")
          );
          if (optIndex !== -1) {
            const next = [...prev];
            next[optIndex] = inc;
            return next;
          }

          const appended = [...prev, inc];
          appended.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          return appended;
        });

        // Si el modal está cerrado, notificar a la lista de conversaciones
        if (!open) {
          const incomingSenderId = Number(inc.sender_id ?? inc.senderId ?? inc.sender?.id ?? NaN);
          const incomingReceiverId = Number(inc.receiver_id ?? inc.receiverId ?? inc.receiver?.id ?? NaN);
          const currentUserId = Number(user?.id ?? NaN);
          let otherId: number | null = null;
          if (!Number.isFinite(incomingSenderId) || !Number.isFinite(incomingReceiverId)) {
            otherId = otherUser?.id ?? null;
          } else {
            otherId = incomingSenderId === currentUserId ? incomingReceiverId : incomingSenderId;
          }
          dispatchConversationUpdated(otherId, inc.content ?? (inc.url_imagen ? "[media]" : null), inc.created_at ?? null);
        }
      };

      s.on("newMessage", handler);

      // marcar como leído al abrir
      const markRead = async () => {
        try {
          if (!user || !otherUser) return;
          const token = getToken?.() ?? undefined;
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          await axios.post(`${API_BASE_URL.replace(/\/+$/, "")}/chat/mark-read`, { otherId: otherUser.id }, { headers });
          dispatchConversationUpdated(otherUser.id, null, new Date().toISOString());
        } catch (e) { /* ignorar */ }
      };

      fetchHistory().then(() => markRead());

      return () => {
        try {
          s.off("connect", joinRooms);
          s.off("newMessage", handler);
          if (roomId) {
            try { s.emit("leaveRoom", { roomId }); } catch {}
          }
        } catch {}
        socketRef.current = null;
      };
    };

    const cleanup = setupSocket();

    return () => {
      if (typeof cleanup === "function") cleanup();
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, otherUser?.id, roomId]);

  // Desplácese hasta la parte inferior para cambiar los mensajes
  useEffect(() => {
    try {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    } catch {}
  }, [messages.length]);

  // seguimiento del cursor
  const handleCaretUpdate = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setCaretPos(target.selectionStart);
  };

  // Insertar emoji en la posición del cursor
  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? caretPos ?? text.length;
    const end = el?.selectionEnd ?? start;
    const before = text.slice(0, start);
    const after = text.slice(end);
    const newVal = before + emoji + after;
    setText(newVal);
    setTimeout(() => {
      if (el) {
        el.focus();
        const pos = start + emoji.length;
        el.setSelectionRange(pos, pos);
        setCaretPos(pos);
      }
    }, 0);
    setEmojiOpen(false);
  };

  // Archivo de manejo de selección
  const handleFileChange = (f?: File) => {
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error(t("createPostArea.fileTypeNotAllowed"));
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error(t("createPostArea.fileTooLarge"));
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const openFilePicker = () => {
    if (!fileInputRef.current) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ALLOWED_TYPES.join(",");
      input.onchange = () => {
        const chosen = input.files?.[0];
        if (chosen) handleFileChange(chosen);
      };
      input.click();
      return;
    }
    fileInputRef.current.click();
  };

  // upload via server-upload endpoint
  const uploadFileToServer = async (): Promise<string | null> => {
    if (!file) return null;
    setUploading(true);
    setUploadProgress(null);
    try {
      const token = getToken?.() ?? localStorage.getItem("authToken");
      const fm = new FormData();
      fm.append("file", file);
      fm.append("folder", "posts"); 

      const res = await axios.post(`${API_BASE_URL.replace(/\/+$/, "")}/uploads/server-upload`, fm, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (ev) => {
          if (ev.total) setUploadProgress(Math.round((ev.loaded * 100) / ev.total));
        },
      });

      setUploadProgress(null);
      return res?.data?.publicUrl ?? null;
    } catch (err: any) {
      console.error("Error upload via server:", err);
      toast.error(err?.response?.data?.message || err.message || t("createPostArea.createPostError"));
      throw err;
    } finally {
      setUploading(false);
    }
  };

  // Lógica de envío: si el archivo está presente, cárgamos primero y luego emitimos; de lo contrario, emitimos el texto.
  const sendMessage = async () => {
    if ((!text.trim() && !file) || !user || !otherUser) return;

    try {
      let publicUrl: string | null = null;
      if (file) {
        publicUrl = await uploadFileToServer();
      }

      // Construir un mensaje optimista y emitirlo a través del socket
      const tempId = -Date.now();
      const optimistic: ChatMsg = {
        id: tempId,
        content: text.trim() || null,
        url_imagen: publicUrl,
        sender_id: Number(user.id),
        receiver_id: Number(otherUser.id),
        created_at: new Date().toISOString(),
        sender: { id: Number(user.id), nombre: user.nombre, apodo: user.apodo, avatar: user.avatar },
        receiver: otherUser,
        tempId,
      };

      setMessages(prev => {
        const next = [...prev, optimistic];
        next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        return next;
      });

      // Limpiar entrada
      setText("");
      setFile(null);
      setPreviewUrl(null);

      // emitimos a través del socket
      try {
        const s = socketRef.current ?? getChatSocket(getToken?.() ?? undefined);
        s.emit("sendMessage", {
          content: optimistic.content,
          receiverId: Number(otherUser.id),
          senderId: Number(user.id),
          tempId,
          url_imagen: publicUrl ?? null,
        });
      } catch (err) {
        console.error("Error emitting chat message:", err);
      }

      // actualizamos la lista de conversaciones
      dispatchConversationUpdated(otherUser.id, optimistic.content ?? (optimistic.url_imagen ? "[media]" : null), optimistic.created_at);
    } catch (err) {
      // Error de carga ya notificado
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Ayudantes para separadores de fechas y renderizado de tiempo
  const isSameDay = (isoA?: string, isoB?: string) => {
    if (!isoA || !isoB) return false;
    const a = new Date(isoA);
    const b = new Date(isoB);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  };
  const formatDateSeparator = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "short" }).format(d);
  };
  const renderTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" });
  };

  // Pequeños ayudantes para detectar el tipo de medio
  const isVideo = (url: string) => /\.(mp4|webm|ogg|ogv)(\?.*)?$/i.test(url);
  const isImage = (url: string) => /\.(jpe?g|png|webp|gif|bmp|svg)(\?.*)?$/i.test(url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg [&>button]:hidden p-0 overflow-hidden rounded-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar src={otherUser?.avatar ?? undefined} alt={safeAlt(otherUser) ?? t("ChatModal.userFallback")} size={40} initials={safeInitial(otherUser)} />
            <div className="min-w-0">
              <div className="font-bold">{otherUser?.nombre ?? otherUser?.apodo}</div>
              <div className="text-sm text-gray-500">@{otherUser?.apodo}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept={ALLOWED_TYPES.join(",")} onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileChange(f);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }} className="hidden" />

            <button aria-label={t("createPostArea.addMediaAria")} onClick={openFilePicker} className="p-2 Dark-emoticonos-fotos rounded-full Dark-Hover-chat cursor-pointer hover:bg-gray-100">
              <Paperclip className="w-5 h-5" />
            </button>

            <div className="relative">
              <button aria-label={t("createPostArea.addEmojiAria")} onClick={() => setEmojiOpen(v => !v)} className="p-2 Dark-emoticonos-fotos Dark-Hover-chat cursor-pointer rounded-full hover:bg-gray-100">
                <Smile className="w-5 h-5" />
              </button>
              {emojiOpen && (
                <div className="absolute right-0 mt-2 z-50 bg-white cursor-pointer dark:bg-gray-800 border rounded-lg shadow-lg p-3 w-56 sm:w-72 max-h-56 overflow-y-auto">
                  {EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => insertEmoji(e)} className="text-lg p-1 rounded cursor-pointer hover:bg-gray-200 Dark-emoticonos" aria-label={`${t("createPostArea.insertEmoji")} ${e}`}>{e}</button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => onOpenChange(false)} aria-label={t("ChatModal.closeAria")} className="p-1 rounded-full Dark-boton-mensajes cursor-pointer hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 h-80 overflow-y-auto" ref={scrollRef}>
          {loading ? (
            <div className="text-center text-sm text-gray-500">{t("ChatModal.loading")}</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-gray-500">{t("ChatModal.noMessagesYet")}</div>
          ) : (
            <div className="space-y-3">
              {messages.slice().sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((m, idx, arr) => {
                const prev = idx > 0 ? arr[idx - 1] : undefined;
                const showDateSeparator = !prev || !isSameDay(prev.created_at, m.created_at);
                const senderId = Number(m.sender_id ?? (m as any).senderId ?? m.sender?.id ?? NaN);
                const mine = Number(user?.id) === senderId;
                const senderObj = m.sender ?? (senderId === Number(user?.id) ? user : otherUser) ?? null;

                return (
                  <div key={String(m.id)}>
                    {showDateSeparator && (
                      <div className="flex items-center justify-center my-2">
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="h-px w-8 bg-gray-300 inline-block" />
                          <span className="px-2">{formatDateSeparator(m.created_at)}</span>
                          <span className="h-px w-8 bg-gray-300 inline-block" />
                        </div>
                      </div>
                    )}

                    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      {!mine && (
                        <div className="mr-2">
                          <Avatar src={senderObj?.avatar ?? undefined} alt={safeAlt(senderObj ?? null) ?? t("ChatModal.userFallback")} size={28} initials={safeInitial(senderObj ?? null)} />
                        </div>
                      )}

                      <div className={`max-w-[70%] px-3 py-2 rounded-lg ${mine ? "bg-[#2683ab] text-white" : "bg-slate-200 Dark-chat-receptor font- text-gray-900"}`}>
                        {m.url_imagen ? (
                          <div className="mb-2">
                            {isVideo(m.url_imagen) ? (
                              <video controls className="max-h-64 w-full rounded-lg border border-gray-100 bg-black">
                                <source src={m.url_imagen} />
                                {t("ChatModal.videoNotSupported")}
                              </video>
                            ) : isImage(m.url_imagen) ? (
                              <img src={m.url_imagen} alt={t("ChatModal.imageAlt")} className="w-full h-auto rounded-lg object-contain max-h-64" />
                            ) : (
                              <a href={m.url_imagen} target="_blank" rel="noreferrer" className="underline text-sm break-all">{m.url_imagen}</a>
                            )}
                          </div>
                        ) : null}

                        {m.content ? <div className="text-sm wrap-break-words">{m.content}</div> : null}

                        <div className={`text-xs mt-1 text-right ${mine ? "text-white" : "text-gray-800"}`}>{renderTime(m.created_at)}</div>
                      </div>

                      {mine && (
                        <div className="ml-2">
                          <Avatar src={senderObj?.avatar ?? undefined} alt={safeAlt(senderObj ?? null) ?? t("ChatModal.userFallback")} size={28} initials={safeInitial(senderObj ?? null)} />
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
          <TextareaAutosize
            ref={textareaRef} 
            value={text}
            onChange={(e) => setText(e.target.value)}
            onClick={handleCaretUpdate}
            onKeyUp={handleCaretUpdate}
            onSelect={handleCaretUpdate}
            minRows={1}
            maxRows={4}
            placeholder={t("ChatModal.placeholder")}
            className="flex-1 resize-none rounded-md Dark-input bg-white Dark-texto-blanco px-3 py-2 text-sm placeholder:text-muted-foreground border border-gray-200"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            aria-label="Chat message input"
            disabled={uploading}
          />

          {previewUrl && (
            <div className="w-20 h-20 rounded overflow-hidden border p-1">
              {file?.type.startsWith("image") ? (
                <img src={previewUrl} alt={t("createPostArea.previewAlt")} className="w-full h-full object-cover" />
              ) : (
                <video src={previewUrl} className="w-full h-full object-cover" controls />
              )}
            </div>
          )}

          {uploadProgress != null && <div className="text-sm text-gray-600 ml-2">{uploadProgress}%</div>}

          <Button onClick={sendMessage} disabled={(!text.trim() && !file) || uploading} className="font-bold cursor-pointer rounded-full px-4 bg-linear-to-bl from-[#ce016e] via-[#e63f58] to-[#e37d01]">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("ChatModal.send")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}