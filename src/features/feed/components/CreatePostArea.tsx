import React, { useState, useRef, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "react-hot-toast";
import { Image as ImageIcon, Loader2, Smile } from "lucide-react";
// Se mantienen los alias de Shadcn/ui (@/)
import Avatar from "../../user-profile/components/Avatar.tsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// Importamos el tipo User desde el contexto de autenticación
import axios from "axios";
import { useAuth, User } from "../../auth/services/AuthContext.tsx";

// URL base de tu backend NestJS
const API_BASE_URL = "https://social-fenix-backend.onrender.com";

// Tipo máximo de archivo y tipos pertimidos
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
];

// Lista simple de emojis, se puede ampliar con los que quieras
const EMOJIS = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😅",
  "😊",
  "😍",
  "🤩",
  "😘",
  "😎",
  "🤔",
  "😐",
  "😴",
  "😢",
  "😭",
  "😡",
  "👍",
  "👎",
  "🙏",
  "👏",
  "🔥",
  "✨",
  "🎉",
  "💯",
  "❤️",
  "💔",
  "🤝",
  "🙌",
  "😉",
  "🤗",
];

interface CreatePostAreaProps {
  user?: User | null; // Preferimos el user del context
  onPostSuccess?: () => void;
}

const CreatePostArea: React.FC<CreatePostAreaProps> = ({
  user: userProp,
  onPostSuccess,
}) => {
  const [postContent, setPostContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Emoji picker state
  const [emojiOpen, setEmojiOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Ref al textarea para manejar caret/inserción
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [caretPos, setCaretPos] = useState<number | null>(null);

  // Usamos el user del contexto si está (esto evita stale props)
  const effectiveUser = currentUser ?? userProp ?? null;

  const handleFileChange = (f?: File) => {
    if (!f) {
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

  const uploadAndCreatePostWithPresigned = async (): Promise<string | null> => {
    if (!file) return null;
    try {
      const token = localStorage.getItem("authToken");
      const folder = "posts";

      const fm = new FormData();
      fm.append("file", file);
      fm.append("folder", folder);

      // Lo subimos al backend (server-upload)
      const res = await axios.post(
        `${API_BASE_URL}/uploads/server-upload`,
        fm,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (ev) => {
            if (ev.total)
              setUploadProgress(Math.round((ev.loaded * 100) / ev.total));
          },
        }
      );

      setUploadProgress(null);
      return (res?.data?.publicUrl as string) ?? null;
    } catch (err: any) {
      setUploadProgress(null);
      console.error("Error upload via server:", err);
      throw err;
    }
  };

  const handlePostSuccess = (newPostId?: any) => {
    if (typeof onPostSuccess === "function") {
      onPostSuccess();
      return;
    }
    try {
      const ev = new CustomEvent("post:created", { detail: newPostId });
      window.dispatchEvent(ev);
    } catch (e) {
      if (typeof window !== "undefined" && window.location) {
        window.location.reload();
      }
    }
  };

  const handlePost = async () => {
    if ((!postContent.trim() && !file) || loading) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      let publicUrl: string | null = null;

      if (file) {
        publicUrl = await uploadAndCreatePostWithPresigned();
      }

      const payload: any = { contenido: postContent.trim() || null };
      if (publicUrl) payload.url_imagen = publicUrl;

      const resp = await axios.post(`${API_BASE_URL}/posts`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPostContent("");
      setFile(null);
      setPreviewUrl(null);
      toast.success("¡Publicación creada!");
      handlePostSuccess(resp.data.post?.id ?? resp.data?.id);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || err.message || "Error al crear post"
      );
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const isPostReady = postContent.trim().length > 0;

  const getAvatarUrl = (u: User | null): string | null => {
    if (!u) return null;
    return u.avatar ?? u.url ?? null;
  };

  const avatarUrl = getAvatarUrl(effectiveUser);
  const fallbackInitial = effectiveUser?.apodo?.[0]?.toUpperCase() ?? "U";

  // Insertamos el emoji en la posición del caret
  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? caretPos ?? postContent.length;
    const end = el?.selectionEnd ?? start;
    const before = postContent.slice(0, start);
    const after = postContent.slice(end);
    const newVal = before + emoji + after;
    setPostContent(newVal);

    // Ponemos foco y movemos caret justo después del emoji
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
    <Card className="p-4 mb-6 shadow-xl border-gray-200">
      <div className="flex space-x-3 items-start">
        <Avatar
          src={avatarUrl}
          alt={effectiveUser?.nombre || effectiveUser?.apodo || "Usuario"}
          size={40}
          className="shrink-0 rounded-full"
          initials={fallbackInitial}
        />

        <div className="flex-1">
          <TextareaAutosize
            ref={(instance) => {
              // TextareaAutosize no tiene types exactos en some setups; coerce
              textareaRef.current =
                instance as unknown as HTMLTextAreaElement | null;
            }}
            placeholder={`¿Qué recuerdo vas a renacer hoy?`}
            minRows={3}
            maxRows={10}
            className="flex w-full resize-none rounded-md Dark-text-area bg-gray-50/70 px-3 py-2 text-lg placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 border-none p-2 focus-visible:ring-0"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
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

          <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-indigo-600 Dark-emotifotos-hover cursor-pointer hover:text-indigo-700 hover:bg-indigo-50"
                aria-label="Añadir emoji"
                disabled={loading}
                onClick={() => setEmojiOpen((v) => !v)}
              >
                <Smile className="h-5 Dark-emoticonos-fotos w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="text-indigo-600 Dark-emotifotos-hover hover:text-indigo-700 hover:bg-indigo-50"
                aria-label="Añadir foto o video"
                disabled={loading}
                onClick={openFilePicker}
              >
                <ImageIcon className="h-5 Dark-emoticonos-fotos w-5" />
              </Button>
            </div>

            {previewUrl && (
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
            )}

            {uploadProgress != null && (
              <div className="text-sm text-gray-600 ml-2">
                {uploadProgress}%
              </div>
            )}

            <Button
              onClick={handlePost}
              disabled={!isPostReady || loading}
              className="font-bold rounded-full px-6 bg-linear-to-bl from-[#ce016e] via-[#e63f58] to-[#e37d01] hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Publicar"
              )}
            </Button>
          </div>

          {/* Emoji picker panel */}
          {emojiOpen && (
            <div
              ref={pickerRef}
              className="mt-2 p-2 Dark-BG bg-white border rounded shadow-md max-w-xs w-full"
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
    </Card>
  );
};

export default CreatePostArea;
