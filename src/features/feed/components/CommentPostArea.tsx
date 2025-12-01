import React, { useEffect, useState, useRef } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "react-hot-toast";
import { Image as ImageIcon, Loader2, Smile } from "lucide-react";
import axios from "axios";
import Avatar from "../../user-profile/components/Avatar.tsx";
import { Button } from "@/components/ui/button";
import { useAuth, User } from "@/features/auth/services/AuthContext";
import { emitPostInteraction } from "./EmitNotification";
import {
  getAvatarUrlFromAuthor,
  getInitialFromAuthor,
} from "../../../utils/avatar.ts";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
];

// Lista simple de emojis (puedes ampliar o reemplazar por un picker)
const EMOJIS = [
  "😀","😁","😂","🤣","😅","😊","😍","🤩","😘","😎",
  "🤔","😐","😴","😢","😭","😡","👍","👎","🙏","👏",
  "🔥","✨","🎉","💯","❤️","💔","🤝","🙌","😉","🤗"
];

interface CommentPostAreaProps {
  user: User;
  postId: number;
  parentCommentId?: number;
  onCommentSuccess: (newCommentOrId?: any) => void;
  isModalContext?: boolean;
  postSnippet?: string | null;
  postImageUrl?: string | null;
  postAuthorName?: string | null;
  postAuthorApodo?: string | null;
}

const CommentPostArea: React.FC<CommentPostAreaProps> = ({
  user,
  postId,
  parentCommentId,
  onCommentSuccess,
  isModalContext = false,
  postSnippet = null,
  postImageUrl = null,
  postAuthorName = null,
  postAuthorApodo = null,
}) => {
  const { getToken } = useAuth();
  const [commentContent, setCommentContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

 // Estado del selector de emojis / gestión del cursor
  const [emojiOpen, setEmojiOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [caretPos, setCaretPos] = useState<number | null>(null);

  // Limpiamos la URL de vista previa al desmontar o cambiar el archivo
  useEffect(() => {
    return () => {
      if (previewUrl) {
        try {
          URL.revokeObjectURL(previewUrl);
        } catch {}
      }
    };
  }, [previewUrl]);

  const handleFileChange = (f?: File) => {
    if (!f) {
      if (previewUrl) {
        try {
          URL.revokeObjectURL(previewUrl);
        } catch {}
      }
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error("Tipo de archivo no permitido.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error("Archivo demasiado grande (máx 20MB).");
      return;
    }

    if (previewUrl) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch {}
    }

    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const openFilePicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ALLOWED_TYPES.join(",");
    input.onchange = () => {
      const chosen = input.files?.[0];
      if (chosen) handleFileChange(chosen);
    };
    input.click();
  };

  /**
   * Subimos el archivo al endpoint server-upload y devolvemos la publicUrl retornada por el backend.
   * Mostramos el progreso con setUploadProgress.
   */
  const uploadFileToServer = async (): Promise<string | null> => {
    if (!file) return null;
    const token = getToken();
    const folder = "posts";
    const fm = new FormData();
    fm.append("file", file);
    fm.append("folder", folder);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/uploads/server-upload`,
        fm,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
          onUploadProgress: (ev) => {
            if (ev.total)
              setUploadProgress(Math.round((ev.loaded * 100) / ev.total));
          },
        }
      );

      setUploadProgress(null);
      return (res?.data?.publicUrl as string) ?? null;
    } catch (err) {
      setUploadProgress(null);
      // rethrow para que el caller lo trate
      throw err;
    }
  };

  const handleComment = async () => {
    if ((!commentContent.trim() && !file) || loading) return;

    const token = getToken();
    if (!token) {
      setError(
        "No se encontró el token de autenticación. Por favor, inicia sesión de nuevo."
      );
      toast.error("No autorizado.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Subimos el archivo si hay
      let publicUrl: string | null = null;
      if (file) {
        publicUrl = await uploadFileToServer();
      }

      // Enviamos el comentario a la API
      const payload: any = {
        postId,
        contenido: commentContent.trim() || null,
        parentCommentId: parentCommentId ?? null,
      };
      if (publicUrl) payload.url_imagen = publicUrl;

      const res = await axios.post(`${API_BASE_URL}/comments`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const savedComment = res.data?.comment ?? res.data ?? null;
      const notificationId =
        res.data?.notificationId ?? res.data?.notification?.id ?? null;

      // Limpiamos UI local
      setCommentContent("");
      setFile(null);
      if (previewUrl) {
        try {
          URL.revokeObjectURL(previewUrl);
        } catch {}
      }
      setPreviewUrl(null);
      setUploadProgress(null);

      toast.success(
        parentCommentId ? "¡Respuesta publicada!" : "¡Comentario publicado!"
      );
      onCommentSuccess(savedComment ?? savedComment?.id);

      // Emitimos evento local para que el Notifications system y componentes reaccionen.
      try {
        emitPostInteraction({
          postId,
          action: "comment",
          actor: {
            id: Number(user.id),
            nombre: user.nombre,
            apodo: user.apodo,
            avatar: user.avatar ?? null,
          },
          postSnippet: postSnippet ?? null,
          postImage: postImageUrl ?? null,
          postAuthorName: postAuthorName ?? null,
          postAuthorApodo: postAuthorApodo ?? null,
          timestamp: new Date().toISOString(),
          notificationId:
            typeof notificationId === "number" ? Number(notificationId) : null,
        });
      } catch {
        // noop: no queremos que un fallo al emitir rompa el flujo del usuario
      }
    } catch (err: any) {
      console.error("Error creando comentario:", err);
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        "Ocurrió un error al publicar el comentario.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isCommentReady = commentContent.trim().length > 0 || !!file;

  const wrapperClass = isModalContext
    ? ""
    : "p-4 mb-6 shadow-xl border-gray-200";

  // Usamos la util compartida para obtener la url/iniciales del current user
  const avatarUrl = getAvatarUrlFromAuthor(user);
  const fallbackInitial = getInitialFromAuthor(user);

  // --- Emoji picker helpers ---
  // Insertamos emoji en la posición del caret
  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const start = (el?.selectionStart ?? caretPos ?? commentContent.length);
    const end = (el?.selectionEnd ?? start);
    const before = commentContent.slice(0, start);
    const after = commentContent.slice(end);
    const newVal = before + emoji + after;
    setCommentContent(newVal);

    // Ponemos foco y mover caret justo después del emoji
    setTimeout(() => {
      if (el) {
        el.focus();
        const pos = start + emoji.length;
        el.setSelectionRange(pos, pos);
        setCaretPos(pos);
      }
    }, 0);
  };

  // Mantenemos caretPos actualizado con interacciones del usuario
  const handleCaretUpdate = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setCaretPos(target.selectionStart);
  };

  // Cerramos picker si click fuera
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      if (!emojiOpen) return;
      const node = pickerRef.current;
      if (!node) return;
      if (!(ev.target instanceof Node)) return;
      if (!node.contains(ev.target)) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [emojiOpen]);

  return (
    <div className={wrapperClass}>
      <div className="flex space-x-3 items-start">
        <Avatar
          src={avatarUrl ?? undefined}
          alt={user.nombre || user.apodo}
          size={40}
          className="shrink-0 rounded-full"
          initials={fallbackInitial}
        />

        <div className="flex-1">
          <TextareaAutosize
            ref={(instance) => {
              textareaRef.current = instance as unknown as HTMLTextAreaElement | null;
            }}
            placeholder={
              parentCommentId ? "Responder..." : "Escribe un comentario..."
            }
            minRows={2}
            maxRows={10}
            className="w-full resize-none rounded-md bg-transparent px-0 py-2 text-lg placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 border-none p-2 focus-visible:ring-0"
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            onClick={handleCaretUpdate}
            onKeyUp={handleCaretUpdate}
            onSelect={handleCaretUpdate}
            disabled={loading}
          />

          {error && (
            <p className="text-sm text-red-500 mt-2 p-2 rounded bg-red-50 border border-red-200">
              {error}
            </p>
          )}

          {previewUrl && (
            <div className="mt-3">
              <div className="w-24 h-24 rounded overflow-hidden border p-1">
                {file?.type.startsWith("image") ? (
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={previewUrl}
                    className="w-full h-full object-cover"
                    controls
                  />
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                aria-label="Añadir emoji"
                disabled={loading}
                onClick={() => setEmojiOpen((v) => !v)}
              >
                <Smile className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                aria-label="Añadir foto o video"
                disabled={loading}
                onClick={openFilePicker}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>

              {uploadProgress != null && (
                <div className="text-sm text-gray-600 ml-2">
                  {uploadProgress}%
                </div>
              )}
            </div>

            <Button
              onClick={handleComment}
              disabled={!isCommentReady || loading}
              className="font-bold rounded-full px-6 bg-linear-to-bl from-[#ce016e] via-[#e63f58] to-[#e37d01] hover:opacity-90 transition-opacity cursor-pointer active:scale-95 active:shadow-inner active:opacity-90 transform duration-300"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : parentCommentId ? (
                "Responder"
              ) : (
                "Comentar"
              )}
            </Button>
          </div>

          {/* Emoji picker panel */}
          {emojiOpen && (
            <div
              ref={pickerRef}
              className="mt-2 p-2 bg-white border rounded shadow-md max-w-xs w-full"
              style={{ position: "relative", zIndex: 50 }}
            >
              <div className="grid grid-cols-8 gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      insertEmoji(e);
                      setEmojiOpen(false);
                    }}
                    className="text-lg p-1 rounded hover:bg-gray-100"
                    aria-label={`Insertar emoji ${e}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentPostArea;