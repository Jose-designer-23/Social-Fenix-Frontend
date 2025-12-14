import React, { useEffect, useState } from "react";
import { useAuth, User } from "../../auth/services/AuthContext.tsx";
import { FeedItem } from "../types/feed";
import type { UserDetails } from "../types/feed";
import Avatar from "../../user-profile/components/Avatar.tsx";
import ReactionListModal from "@/features/feed/components/ReactionListModal"; 

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import LikeButton from "./LikeButton";
import RepostButton from "./RepostButton";
import CommentModal from "./CommentModal";
import CommentCountButton from "./CommentButton";
import { useNavigate } from "react-router-dom";

import { Repeat2, Share2, MoreHorizontal } from "lucide-react";

import {
  formatDistanceToNow,
  parseISO,
  differenceInDays,
  differenceInHours,
  format as formatDate,
  differenceInSeconds,
  differenceInMinutes,
  addHours,
} from "date-fns";

import { es } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface PostCardProps {
  post: FeedItem;
  clickable?: boolean;
}

const MAX_CONTENT_LENGTH = 500;

function parseServerDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput !== "string") return new Date(dateInput);

  // Si ya incluye zona (Z o +HH:mm) la dejamos tal cual; si no, asumimos UTC y añadimos 'Z'.
  const hasZone = /[zZ]$|[+\-]\d{2}:\d{2}$/.test(dateInput);
  const toParse = hasZone ? dateInput : dateInput + "Z";

  let date = parseISO(toParse);

  date = addHours(date, 1);

  return date;
}

const formatTimeAgo = (dateInput: string | Date): string => {
  try {
    const date = parseServerDate(dateInput);
    const now = new Date();

    const secondsDifference = differenceInSeconds(now, date);
    if (secondsDifference < 60) return "Ahora mismo";

    const minutesDifference = differenceInMinutes(now, date);
    if (minutesDifference < 60) {
      return formatDistanceToNow(date, { addSuffix: true, locale: es }).replace(
        "alrededor de",
        "hace"
      );
    }

    const daysDifference = differenceInDays(now, date);
    if (daysDifference > 180) {
      return formatDate(date, "dd MMM yyyy", { locale: es });
    }

    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  } catch {
    return "Fecha inválida";
  }
};

const PostCard: React.FC<PostCardProps> = ({ post, clickable = true }) => {
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { user: currentUser } = useAuth();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);

  const displayDate =
    post.type === "repost" && post.repostDate
      ? post.repostDate
      : post.fecha_creacion;

  const formattedDate = formatTimeAgo(displayDate);
  function formatExactSpain(dateInput: string | Date): string {
    try {
      const date = parseServerDate(dateInput);
      // "XXX" añade el offset (+01:00 / +02:00) según DST
      return formatInTimeZone(date, "Europe/Madrid", "dd/MM/yyyy, HH:mm:ss");
    } catch {
      return "";
    }
  }

  const formatShortTime = (dateInput: string | Date): string => {
    try {
      const date = parseServerDate(dateInput);
      const days = differenceInDays(new Date(), date);
      const hours = differenceInHours(new Date(), date);

      if (hours < 1) return "Ahora";
      if (days >= 7) return formatDate(date, "dd MMM", { locale: es });
      if (days >= 1) return `${days} d`;
      return `${hours} h`;
    } catch {
      return "";
    }
  };

  const shortFormatted = formatShortTime(displayDate);
  const author: UserDetails = post.apodo;
  const isRepost = post.type === "repost";
  const repostedById = post.repostedBy?.id;

  // Nuevo: estado para mostrar el nombre/apodo del usuario que reposteó (si aplica).
  const [reposterDisplayName, setReposterDisplayName] = useState<
    string | undefined
  >(() => {
    // inicializamos preferiendo apodo, luego nombre, luego fallback a Usuario #id si hay id
    if (post.repostedBy?.apodo) return post.repostedBy.apodo;
    if (post.repostedBy?.nombre) return post.repostedBy.nombre;
    if (repostedById) return `Usuario #${repostedById}`;
    return undefined;
  });

  // Si tenemos solo id (y no apodo/nombre), intentamos pedir al backend el apodo del usuario.
  useEffect(() => {
    let mounted = true;

    // Si ya tenemos un apodo o nombre no intentamos fetch.
    if (post.repostedBy?.apodo || post.repostedBy?.nombre) {
      // Aseguramos mostrar lo conocido
      if (post.repostedBy.apodo && mounted) {
        setReposterDisplayName(post.repostedBy.apodo);
      } else if (post.repostedBy.nombre && mounted) {
        setReposterDisplayName(post.repostedBy.nombre);
      }
      return () => {
        mounted = false;
      };
    }

    // Si no hay id, nada que hacer.
    if (!repostedById) {
      return () => {
        mounted = false;
      };
    }

    const fetchApodo = async () => {
      try {
        const rawBase = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
        const baseUrl = rawBase.replace(/\/+$/, "");
        const url = `${baseUrl}/user/id/${repostedById}`;

        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          // No forzamos fallo; mantenemos fallback
          return;
        }

        const json = await res.json().catch(() => null);
        if (!json) return;

        // Algunos endpoints devuelven { user: {...} }, otros devuelven el objeto directamente.
        const payload = (json && (json.user ?? json)) as any;

        const apodoFromServer =
          payload?.apodo ?? payload?.apodo_usuario ?? payload?.username;
        const nombreFromServer = payload?.nombre ?? payload?.displayName;

        if (mounted) {
          if (apodoFromServer) {
            setReposterDisplayName(apodoFromServer);
          } else if (nombreFromServer) {
            setReposterDisplayName(nombreFromServer);
          } else {
            // Mantenemos el fallback con id
            setReposterDisplayName(`Usuario #${repostedById}`);
          }
        }
      } catch {
        // ignoramos errores y dejamos el fallback
      }
    };

    fetchApodo();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repostedById, post.repostedBy?.apodo, post.repostedBy?.nombre]);

  // Estado del contenido local para que podamos actualizar la interfaz de usuario cuando la edición sea exitosa
  const [localContent, setLocalContent] = useState<string | undefined>(
    (post.contenido as string) ?? ""
  );
  const [localImageUrl, setLocalImageUrl] = useState<string | undefined>(
    (post.url_imagen as string) ?? ""
  );

  useEffect(() => {
    setLocalContent(post.contenido as string);
    setLocalImageUrl(post.url_imagen as string);
  }, [post.contenido, post.url_imagen]);

  const isAuthor =
    !!currentUser &&
    !!post.apodo &&
    Number(currentUser.id) === Number(post.apodo.id);

  const getAuthToken = (): string | null => {
    // Buscamos la clave principal que usa AuthContext
    const tokenFromAuthContextKey = localStorage.getItem("authToken");
    if (tokenFromAuthContextKey) return tokenFromAuthContextKey;

    // Fallbacks 
    const tokenFromAltKeys =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("authToken");

    return tokenFromAltKeys ?? null;
  };

  // Estados para el modal de editar una publicación
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editContent, setEditContent] = useState(localContent ?? "");
  const [editImageUrl, setEditImageUrl] = useState(localImageUrl ?? "");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reactionModalOpen, setReactionModalOpen] = useState(false);
  const [reactionModalType, setReactionModalType] = useState<"likes" | "reposts">("likes");

   const openReactions = (type: "likes" | "reposts") => {
    setReactionModalType(type);
    setReactionModalOpen(true);
  };

  const closeReactions = () => setReactionModalOpen(false);

  const openEditModal = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditContent(localContent ?? "");
    setEditImageUrl(localImageUrl ?? "");
    setEditError(null);
    setIsEditOpen(true);
  };
  const closeEditModal = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsEditOpen(false);
  };

  const validateEdit = (): boolean => {
    if (!editContent && !editImageUrl) {
      setEditError("La publicación debe contener texto o una imagen.");
      return false;
    }
    if (editContent && editContent.length > MAX_CONTENT_LENGTH) {
      setEditError(
        `El contenido no puede superar ${MAX_CONTENT_LENGTH} caracteres.`
      );
      return false;
    }
    setEditError(null);
    return true;
  };

  const handleSaveEdit = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isAuthor) return;
    if (!validateEdit()) return;

    try {
      setIsSubmitting(true);

      const token = getAuthToken();

      // Preferir VITE_API_URL, pero si no está definida usar http://localhost:3000
      const rawBase = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
      const baseUrl = rawBase.replace(/\/+$/, "");
      const url = `${baseUrl}/posts/${post.id}`;

      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          contenido: editContent || null,
          url_imagen: editImageUrl || null,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn("Error actualizando post:", res.status, text);
        setEditError("No se pudo actualizar la publicación.");
        return;
      }

      setLocalContent(editContent);
      setLocalImageUrl(editImageUrl);
      setIsEditOpen(false);
    } catch (err) {
      console.warn("Error al actualizar:", err);
      setEditError("Error al intentar actualizar la publicación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!isAuthor) return; // Chequeo de seguridad

    try {
      setIsProcessing(true);
      setIsDeleteOpen(false); // Cerramos el diálogo de confirmación

      const token = getAuthToken();

      // Verificamos obligatoriamente el token
      if (!token) {
        alert("No autorizado. Por favor, inicia sesión de nuevo.");
        setIsProcessing(false);
        return;
      }

      const rawBase = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
      const baseUrl = rawBase.replace(/\/+$/, "");
      const url = `${baseUrl}/posts/${post.id}`;

      const headers: Record<string, string> = {};
      headers["Authorization"] = `Bearer ${token}`; // Usamos el token verificado

      const fetchOptions: RequestInit = {
        method: "DELETE",
        headers,
      };

      const res = await fetch(url, fetchOptions);

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        const text = contentType.includes("application/json")
          ? JSON.stringify(await res.json().catch(() => ({})))
          : await res.text().catch(() => "");
        console.warn("Error eliminando post:", res.status, text);

        if (res.status === 401) {
          alert("No autorizado. Por favor inicia sesión de nuevo.");
        } else if (res.status === 403) {
          alert("No tienes permiso para eliminar esta publicación.");
        } else if (res.status === 404) {
          alert("Publicación no encontrada.");
        } else {
          alert("No se pudo eliminar la publicación.");
        }
        return;
      }

      const deleteEvent = new CustomEvent("post:deleted", {
        detail: { postId: post.id },
      });
      window.dispatchEvent(deleteEvent);
    } catch (err) {
      console.warn("Error al eliminar:", err);
      alert("Error al intentar eliminar la publicación.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePost = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthor) return;

    setIsDeleteOpen(true);
  };

  // Buscamos la url del avatar en propiedades conocidas del tipo User

  // Obtenemos la URL del avatar del autor (ya normalizada por normalizeFeedItem)
  const avatarUrl: string | null = author?.avatar ?? null;

  const fallbackInitial = (
    author?.apodo?.[0] ??
    author?.nombre?.[0] ??
    "U"
  ).toUpperCase();

  const handleUserClick = (apodo: string) => {
    navigate(`/profile/${apodo}`);
  };

  return (
     <>
    <CommentModal
      post={post}
      currentUser={currentUser as User}
      open={isCommentModalOpen}
      onOpenChange={setIsCommentModalOpen}
      isDeleteOpen={isDeleteOpen}
      onDeleteOpenChange={setIsDeleteOpen}
      onConfirmDelete={executeDelete}
      isProcessingDelete={isProcessing}
    >
      <Card
        className="rounded-xl md:space-x-3 md:p-3 lg:space-x-3 lg:p-3 xl:space-x-3 xl:p-3 space-x-1 p-1 shadow-md transition-all duration-300 hover:shadow-lg border-gray-200 cursor-pointer Dark-Hover-Card hover:bg-green-50"
        onClick={() => {
          if (clickable) {
            let url; // Si es un 'comment' Y tiene el post original (uso seguro de originalPostId)

            if (post.type === "comment" && post.originalPostId) {
              const originalId = post.originalPostId;
              url = `/feed/post/${originalId}/comment/${post.id}`; // Ruta correcta: Ejemplo /feed/post/28/comment/33
            } // Si es un post o repost
            else {
              url = `/feed/post/${post.id}`; // Ruta estándar: /feed/post/ID
            }

            navigate(url);
          }
        }}
        role={clickable ? "link" : undefined} 
      >
        {isRepost && (
          <div className="flex items-center text-sm Dark-republicacion text-gray-500 p-4 pb-0 pl-12">
            <Repeat2 className="h-4 w-4 mr-2" />
            <span>
              {reposterDisplayName ? `${reposterDisplayName} reposteó` : "Reposteó"}
            </span>
          </div>
        )}

        <CardHeader className="flex  flex-row items-start space-x-1 p-1">
          <div className="h-12 w-12 shrink-0">
            <Avatar
              src={avatarUrl}
              alt={author?.nombre || author?.apodo || "avatar"}
              size={48}
              className="rounded-full"
              initials={fallbackInitial}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex z-10 items-center space-x-1">
                <span className="font-bold Dark-texto-blanco text-gray-900 hover:underline cursor-pointer">
                  <a
                    href={`/profile/${author.apodo}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUserClick(author.apodo);
                    }}
                  >
                    {author?.nombre}
                  </a>
                </span>

                <span className="text-sm Dark-apodo text-gray-500">@{author?.apodo}</span>

                <span className="text-sm Dark-punto-separador text-gray-500">•</span>

                <span className="text-sm Dark-punto-fecha text-gray-500 max-[535px]:hidden">
                  <time
                    dateTime={new Date(displayDate).toISOString()}
                    title={formatExactSpain(displayDate)}
                  >
                    {formattedDate}
                  </time>
                </span>
              </div>

              {isAuthor ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 Dark-hover-hamburguesa cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Más opciones"
                    >
                      <MoreHorizontal className="h-5 Dark-texto-blanco  w-5" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      onClick={openEditModal}
                      disabled={isProcessing || isSubmitting}
                      className="cursor-pointer"
                    >
                      Actualizar publicación
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={handleDeletePost}
                      disabled={isProcessing || isSubmitting}
                      className="cursor-pointer"
                    >
                      Borrar publicación
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

            <div className="hidden max-[535px]:block Dark-punto-fecha text-sm text-gray-500 mt-1">
              {shortFormatted}
            </div>

            <CardContent className="p-0 pt-2 text-gray-800 wrap-break-words">
              <p className="Dark-texto-blanco">{localContent}</p>

              {localImageUrl && (
                <div className="mt-3 mr-6 flex justify-start">
                  <div className="w-full max-w-3xl mx-auto">
                    {(() => {
                      // Detectamos si es vídeo por extensión (añade más extensiones si necesitas)
                      const isVideo = /\.(mp4|webm|ogv|ogg)(\?.*)?$/i.test(
                        localImageUrl
                      );

                      if (isVideo) {
                        return (
                          <video
                            controls
                            playsInline
                            preload="metadata"
                            className="w-full h-auto rounded-xl border border-gray-100 object-contain max-h-96 bg-black"
                            // onError: Sustituimos por una imagen placeholder
                            onError={(e) => {
                              // Reemplazamos el <video> por un placeholder sencillo:
                              const parent = (
                                e.currentTarget as HTMLVideoElement
                              ).parentElement;
                              if (parent) {
                                parent.innerHTML =
                                  '<img src="https://placehold.co/600x400/ECEFF1/AD1457?text=Error+al+cargar+video" alt="Video no disponible" class="w-full h-auto rounded-xl border border-gray-100"/>';
                              }
                            }}
                          >
                            {/* Aqui se pone el mime */}
                            <source src={localImageUrl} type="video/mp4" />
                            Tu navegador no soporta la reproducción de vídeo.
                          </video>
                        );
                      }

                    
                      return (
                        <img
                          src={localImageUrl}
                          alt={`Imagen del post de ${author?.apodo}`}
                          className="w-full h-auto rounded-xl border border-gray-100 object-contain max-h-96"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://placehold.co/600x400/ECEFF1/AD1457?text=Error+al+cargar+imagen";
                            e.currentTarget.alt = "Imagen no disponible";
                          }}
                        />
                      );
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        </CardHeader>

        <CardFooter className="flex justify-between items-center px-4 pt-0 pb-3">
          <div
            className="flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <CommentCountButton
              postId={post.id}
              initialCount={Number(post.commentsCount ?? 0)}
              onOpenModal={() => {
                if (currentUser) setIsCommentModalOpen(true);
              }}
            />
          </div>

          <RepostButton
            postId={post.id}
            initialCount={
              (post as any).repostsCount ?? (post as any).reposts ?? 0
            }
            initialReposted={
              (post as any).reposted ??
              (post as any).reposted_by_user ??
              (post as any).isReposted ??
              false
            }
            postSnippet={String(post.contenido ?? "")}
            postImageUrl={post.url_imagen ?? null}
            postAuthorName={post.apodo?.nombre ?? null}
            postAuthorApodo={post.apodo?.apodo ?? null}
            onOpenReactions={() => openReactions("reposts")}
          />

          <LikeButton
            postId={post.id}
            initialCount={(post as any).likesCount ?? (post as any).likes ?? 0}
            initialLiked={
              (post as any).liked ?? (post as any).liked_by_user ?? false
            }
            postSnippet={String(post.contenido ?? "")}
            postImageUrl={post.url_imagen ?? null}
            postAuthorName={post.apodo?.nombre ?? null}
            postAuthorApodo={post.apodo?.apodo ?? null}
            onOpenReactions={() => openReactions("likes")}
          />

          <div className="flex items-center text-gray-500 Dark-texto-blanco hover:text-indigo-500 transition-colors cursor-pointer">
            <Share2 className="h-5 w-5 mr-2" />
          </div>
        </CardFooter>

        {isEditOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={closeEditModal}
          >
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="relative z-60 w-full max-w-xl rounded-lg Dark-BG bg-white p-6 shadow-lg"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <h3 className="text-lg font-semibold mb-3">Editar publicación</h3>

              <label className="block text-sm Dark-actualizar-post text-gray-700 mb-1">
                Contenido
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                maxLength={MAX_CONTENT_LENGTH}
                rows={5}
                className="w-full rounded-md border px-3 py-2 mb-2 resize-none"
                placeholder="Escribe algo..."
              />

              <div className="text-xs Dark-actualizar-post text-gray-500 mb-3">
                {editContent.length}/{MAX_CONTENT_LENGTH}
              </div>

              <label className="block text-sm Dark-actualizar-post text-gray-700 mb-1">
                URL de imagen (opcional)
              </label>
              <input
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
                type="url"
                className="w-full rounded-md border px-3 py-2 mb-3"
                placeholder="https://ejemplo.com/imagen.jpg"
              />

              {editError && (
                <div className="mb-3 text-sm text-red-600">{editError}</div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="ghost"
                  onClick={closeEditModal}
                  disabled={isSubmitting}
                  className="cursor-pointer hover:border-2 Dark-boton dark:border-none dark:hover:outline-amber-100 dark:hover:outline-1 hover:border-black"
                >
                  Cancelar
                </Button>
                <Button
                  className="hover:bg-linear-to-bl hover:from-[#ce016e] hover:via-[#e63f58] hover:to-[#e37d01] cursor-pointer font-bold "
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </CommentModal>
    <ReactionListModal
        isOpen={reactionModalOpen}
        onClose={closeReactions}
        postId={post.id}
        type={reactionModalType}
        ownerApodo={post.apodo?.apodo ?? null}
        ownerId={post.apodo?.id ?? null}
      />
    </>
  );
};

export default PostCard;