import React, { useState } from "react";
import Avatar from "../../user-profile/components/Avatar.tsx";
import { getAvatarUrlFromAuthor, getInitialFromAuthor } from "../../../utils/avatar.ts";
import type { CommentFromApi } from "../types/comment";
import { useAuth, User } from "@/features/auth/services/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  formatDistanceToNow,
  parseISO,
  format as formatDate,
  differenceInSeconds,
  differenceInMinutes,
  differenceInDays,
  differenceInHours,
  addHours,
} from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import LikeCommentButton from "./LikeCommentButton";
import CommentPostArea from "./CommentPostArea";
import CommentDeleteModal from "./CommentDeleteModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import axios from "axios";

interface CommentItemProps {
  comment: CommentFromApi;
  postId: number;
  depth?: number;
  onReplySuccess?: (newCommentOrId?: any) => void;
  showReplies?: boolean;
  remainingDepth?: number | null;
  onDeleted?: (deletedId: number) => void;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function parseServerDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput !== "string") return new Date(dateInput);

  // Si ya incluye zona (Z o +HH:mm) la dejamos tal cual; si no, asumimos UTC y añadimos 'Z'.
  const hasZone = /[zZ]$|[+\-]\d{2}:\d{2}$/.test(dateInput);
  const toParse = hasZone ? dateInput : dateInput + "Z";

  let date = parseISO(toParse);

  // Sumamos 1 hora para compensar el desfase del backend (GMT+0 -> GMT+1)
  date = addHours(date, 1);

  return date;
}

function formatTimeAgoSpain(dateInput: string | Date): string {
  try {
    
    const date = parseServerDate(dateInput);
    const now = new Date();

    const secondsDifference = differenceInSeconds(now, date);
    if (secondsDifference < 60) {
      return "Ahora mismo";
    }

    const minutesDifference = differenceInMinutes(now, date);
    if (minutesDifference < 60) {
      return formatDistanceToNow(date, { addSuffix: true, locale: es }).replace(
        "alrededor de",
        "hace"
      );
    }

    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  } catch (e) {
    return "";
  }
}

function formatExactSpain(dateInput: string | Date): string {
  try {
    const date = parseServerDate(dateInput);
    return formatInTimeZone(date, "Europe/Madrid", "dd/MM/yyyy, HH:mm:ss");
  } catch (e) {
    return "";
  }
}

/* Copia de PostCard.formatShortTime — la usamos aquí pasando la fecha del comentario */
const formatShortTime = (dateInput: string | Date): string => {
  try {
    const date = parseServerDate(dateInput);

    const days = differenceInDays(new Date(), date);
    const hours = differenceInHours(new Date(), date);

    if (hours < 1) {
      return "Ahora";
    }

    if (days >= 7) {
      return formatDate(date, "dd MMM", { locale: es });
    }

    if (days >= 1) {
      return `${days} d`;
    }

    return `${hours} h`;
  } catch (e) {
    return "";
  }
};

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  depth = 0,
  onReplySuccess,
  showReplies = false,
  remainingDepth = null,
  onDeleted,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const isAuthor =
    !!user && !!comment.autor && Number(user.id) === Number(comment.autor?.id);

  const executeDelete = async () => {
    if (!isAuthor) return;
    try {
      setIsProcessing(true);
      setIsDeleteOpen(false);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("authToken")
          : null;
      if (!token) {
        alert("No autorizado. Por favor inicia sesión de nuevo.");
        setIsProcessing(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.delete(`${API_BASE}/comments/${comment.id}`, {
        headers,
      });

      const deleted = res.data?.comment ?? null;
      if (onDeleted) onDeleted(comment.id);
      else if (onReplySuccess) onReplySuccess(comment.id);
    } catch (err: any) {
      console.error("Error borrando comentario:", err);
      alert(err?.response?.data?.message || "No se pudo borrar el comentario.");
    } finally {
      setIsProcessing(false);
    }
  };

  const indent = Math.min(depth * 12, 48);

  const handleReplyToggle = () => {
    setShowReplyBox((s) => !s);
  };

  const handleCommentSuccess = (newCommentOrId?: any) => {
    setShowReplyBox(false);
    if (typeof onReplySuccess === "function") onReplySuccess(newCommentOrId);
  };

  const childList: CommentFromApi[] = (comment.children ??
    comment.replies ??
    []) as CommentFromApi[];

  const shouldRenderChildrenInline =
    !!showReplies && (remainingDepth === null || remainingDepth > 0);

  const relative = formatTimeAgoSpain(comment.fecha_creacion);
  const exactSpain = formatExactSpain(comment.fecha_creacion);

  // ---Pasamos la fecha del comentario a formatShortTime ---
  const shortFormatted = formatShortTime(comment.fecha_creacion);

  // Avatar: preferir avatar del autor (comment.autor), si no existe usar avatar del usuario de sesión
  const author = comment.autor ?? null;
  const avatarUrl = getAvatarUrlFromAuthor(author) ?? getAvatarUrlFromAuthor(user ?? null);
  const initials = getInitialFromAuthor(author ?? user ?? null);

  return (
    <div
      id={`comment-${comment.id}`}
      style={{ marginLeft: indent }}
      className="mb-3"
    >
      <div className="flex  items-start space-x-3 p-3 bg-white rounded-lg shadow-sm hover:bg-green-50">
        <Avatar
          src={avatarUrl}
          alt={author?.nombre ?? author?.apodo ?? "avatar"}
          size={48}
          className="shrink-0 rounded-full"
          initials={initials}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="font-semibold text-gray-900 hover:underline cursor-pointer truncate">
                {comment.autor?.nombre ?? comment.autor?.apodo}
              </span>
              <span className="text-gray-500 text-xs truncate">
                @{comment.autor?.apodo}
              </span>
              <span className="text-gray-400 text-xs ml-2 max-[535px]:hidden">
                <time
                  dateTime={new Date(comment.fecha_creacion).toISOString()}
                  title={exactSpain}
                >
                  {relative}
                </time>
              </span>
            </div>

            <div className="shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
              {isAuthor ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Más opciones"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDeleteOpen(true);
                        }}
                        disabled={isProcessing}
                      >
                        Borrar comentario
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <CommentDeleteModal
                    isOpen={isDeleteOpen}
                    onOpenChange={setIsDeleteOpen}
                    onConfirm={executeDelete}
                    isProcessing={isProcessing}
                  >
                    <></>
                  </CommentDeleteModal>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* mostramos la versión corta (igual que PostCard) */}
          <div className="hidden max-[535px]:block text-sm text-gray-500 mt-1">
            {shortFormatted}
          </div>

          <div className="mt-1 text-gray-800">
            <p>{comment.contenido}</p>

            {/* Render de media (imagen o vídeo) si existe comment.url_imagen */}
            {comment.url_imagen &&
              (() => {
                const url = comment.url_imagen;
                const isVideo = /\.(mp4|webm|ogv|ogg)(\?.*)?$/i.test(url);
                if (isVideo) {
                  return (
                    <div className="mt-3 mr-6 flex justify-start">
                      <div className="w-full max-w-2xl">
                        <video
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-auto rounded-lg border border-gray-100 object-contain max-h-60 bg-black"
                        >
                          <source src={url} type="video/mp4" />
                          Tu navegador no soporta la reproducción de vídeo.
                        </video>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="mt-3 mr-6 flex justify-start">
                      <div className="w-full max-w-2xl">
                        <img
                          src={url}
                          alt="Adjunto del comentario"
                          className="w-full h-auto rounded-lg border border-gray-100 object-cover max-h-60"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "https://placehold.co/600x400/ECEFF1/AD1457?text=Imagen+no+disponible";
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              })()}
          </div>

          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
            <button
              className="hover:text-blue-600 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                handleReplyToggle();
              }}
            >
              {showReplyBox ? "Cancelar" : "Responder"}
            </button>

            <Link
              to={`/feed/post/${postId}/comment/${comment.id}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-gray-700 text-sm flex items-center gap-2"
              title="Abrir hilo"
            >
              <span className="text-gray-400">·</span>
              <span className="text-sm text-gray-600">
                {" "}
                {comment.repliesCount ?? childList.length ?? 0}{" "}
              </span>
              <span className="text-gray-500 ml-1 hover:text-violet-600 font-semibold">
                Abrir hilo
              </span>
            </Link>

            <LikeCommentButton
              commentId={comment.id}
              initialCount={comment.likesCount ?? 0}
              initialLiked={!!comment.liked}
            />
          </div>

          {showReplyBox && user && (
            <div className="mt-3">
              <CommentPostArea
                user={user}
                postId={postId}
                parentCommentId={comment.id}
                onCommentSuccess={handleCommentSuccess}
                isModalContext={false}
              />
            </div>
          )}
        </div>
      </div>

      {shouldRenderChildrenInline && childList && childList.length > 0 && (
        <div className="mt-2">
          {childList.map((ch) => (
            <CommentItem
              key={ch.id}
              comment={ch}
              postId={postId}
              depth={(depth ?? 0) + 1}
              onReplySuccess={onReplySuccess}
              showReplies={showReplies}
              remainingDepth={
                remainingDepth === null ? null : remainingDepth - 1
              }
              onDeleted={onDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
