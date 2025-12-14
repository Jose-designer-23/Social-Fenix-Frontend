import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Repeat2, Bell } from "lucide-react";
import { useAuth } from "@/features/auth/services/AuthContext";
import PostPreview from "./PostPreview";
import axios from "axios";

type Actor = {
  id: number;
  nombre?: string | null;
  apodo?: string | null;
  avatar?: string | null;
  __unread?: boolean;
  timestamp?: string | null;
};

type Interaction = {
  postId?: number | null;
  action:
    | "like"
    | "repost"
    | "comment"
    | "unlike"
    | "unrepost"
    | "delete_comment"
    | "remove_like"
    | "remove_repost"
    | "remove_comment"
    | string;
  actor?: Actor | null;
  postSnippet?: string | null;
  postImage?: string | null;
  postAuthorName?: string | null;
  postAuthorApodo?: string | null;
  timestamp?: string | null;
  notificationId?: number | null;
  source?: "server" | "local";
  persisted?: boolean;
  read?: boolean;
};

type PostNotifications = {
  postId: number;
  snippet?: string | null;
  postImage?: string | null;
  postAuthorName?: string | null;
  postAuthorApodo?: string | null;
  likes: Actor[];
  reposts: Actor[];
  comments: Actor[];
  notificationIds?: number[];
  unreadLikes?: number;
  unreadReposts?: number;
  unreadComments?: number;
  lastTimestamp?: string | null;
};

const MAX_AVATARS_SHOWN = 4;
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function mergeActorList(list: Actor[], actor?: Actor | null): Actor[] {
  if (!actor) return list;
  const exists = list.find((a) => a.id === actor.id);
  if (exists) {
    const merged = { ...exists, ...actor };
    merged.__unread = !!(actor.__unread || exists.__unread);
    merged.timestamp = actor.timestamp ?? exists.timestamp ?? null;
    return [merged, ...list.filter((a) => a.id !== actor.id)]
      .slice(0, 50)
      .sort((a, b) => {
        const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
        const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
        return tb - ta;
      });
  }
  return [{ ...actor }, ...list].slice(0, 50).sort((a, b) => {
    const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
    const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
    return tb - ta;
  });
}

const NotificationsButton: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = (user as any)?.id ?? (user as any)?.sub ?? null;

  const [open, setOpen] = useState(false);
  const [postsMap, setPostsMap] = useState<Record<number, PostNotifications>>(
    {}
  );
  const [hasUnread, setHasUnread] = useState(false);
  const [notificationIds, setNotificationIds] = useState<Set<number>>(
    new Set()
  );

  const [globalCounts, setGlobalCounts] = useState({
    like: 0,
    repost: 0,
    comment: 0,
  });

  const prevOpenRef = useRef<boolean>(open);

  const processNotificationItem = (detail: Interaction) => {
    if (!detail || !detail.action) return;

    // Ignoramos eventos optimistas locales emitidos por el mismo usuario
    if (
      detail.source === "local" &&
      detail.actor &&
      currentUserId != null &&
      detail.actor.id === currentUserId
    ) {
      return;
    }

    const pid = detail.postId ?? null;
    const nid =
      detail.notificationId ?? (detail as any).notification_id ?? null;
    const ts = detail.timestamp ?? new Date().toISOString();

    if (nid && typeof nid === "number") {
      setNotificationIds((prev) => {
        if (prev.has(nid)) return prev;
        const next = new Set(prev);
        next.add(nid);
        return next;
      });
    }

    const incPostCounter = (post: PostNotifications, action: string) => {
      if (action === "like") post.unreadLikes = (post.unreadLikes ?? 0) + 1;
      if (action === "repost")
        post.unreadReposts = (post.unreadReposts ?? 0) + 1;
      if (action === "comment")
        post.unreadComments = (post.unreadComments ?? 0) + 1;
    };

    // Si tenemos un postId, mantenemos la estructura por publicación
    if (
      pid &&
      (detail.action === "like" ||
        detail.action === "repost" ||
        detail.action === "comment")
    ) {
      setPostsMap((prev) => {
        const next = { ...prev };
        if (!next[pid]) {
          next[pid] = {
            postId: pid,
            snippet: detail.postSnippet ?? null,
            postImage: detail.postImage ?? null,
            postAuthorName: detail.postAuthorName ?? null,
            postAuthorApodo: detail.postAuthorApodo ?? null,
            likes: [],
            reposts: [],
            comments: [],
            notificationIds: nid ? [nid] : [],
            unreadLikes: 0,
            unreadReposts: 0,
            unreadComments: 0,
            lastTimestamp: ts,
          };
        } else {
          if (nid) {
            next[pid].notificationIds = Array.from(
              new Set([...(next[pid].notificationIds ?? []), nid])
            );
          }
          next[pid].lastTimestamp = ts;
        }

        const entry = next[pid];

        const serverEvent =
          detail.source === "server" || detail.persisted === true;
        const shouldMarkUnread = serverEvent && detail.read !== true;

        if (detail.actor) {
          const actorWithTs: Actor = {
            ...(detail.actor as Actor),
            __unread: !!shouldMarkUnread,
            timestamp: ts,
          };
          if (detail.action === "like")
            entry.likes = mergeActorList(entry.likes, actorWithTs);
          else if (detail.action === "repost")
            entry.reposts = mergeActorList(entry.reposts, actorWithTs);
          else if (detail.action === "comment")
            entry.comments = mergeActorList(entry.comments, actorWithTs);
        } else {
          incPostCounter(entry, detail.action);
        }

        if (shouldMarkUnread) {
          setHasUnread(true);
        }

        return next;
      });
      return;
    }

    // Si no hay postId — evento del servidor y no leído => incrementamos contadores globales
    if (
      (detail.source === "server" || detail.persisted === true) &&
      detail.read !== true
    ) {
      if (
        detail.action === "like" ||
        detail.action === "repost" ||
        detail.action === "comment"
      ) {
        setGlobalCounts((c) => ({
          ...c,
          [detail.action === "like"
            ? "like"
            : detail.action === "repost"
            ? "repost"
            : "comment"]:
            (c[
              detail.action === "like"
                ? "like"
                : detail.action === "repost"
                ? "repost"
                : "comment"
            ] || 0) + 1,
        }));
        setHasUnread(true);
      }
    }
  };

  // Fetch Inicial
  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;
      try {
        const res = await axios.get<{ data?: any[] }>(
          `${API_BASE}/notifications`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const items = res.data?.data ?? [];
        for (const it of items) {
          if (!mounted) break;
          const mapped: Interaction = {
            postId: it.post?.id ?? it.post_id ?? null,
            action: it.type as any,
            actor:
              it.actor ??
              (it.actor_id
                ? {
                    id: it.actor_id,
                    nombre: it.actor_nombre ?? null,
                    apodo: it.actor_apodo ?? null,
                    avatar: it.actor_avatar ?? null,
                  }
                : null),
            postSnippet: it.post?.snippet ?? it.post_snippet ?? null,
            postImage: it.post?.image ?? it.post_image ?? null,
            postAuthorName: it.post?.authorName ?? it.post_author_name ?? null,
            postAuthorApodo:
              it.post?.authorApodo ?? it.post_author_apodo ?? null,
            timestamp:
              it.created_at ?? it.createdAt ?? new Date().toISOString(),
            notificationId: it.id ?? null,
            read: !!it.read,
            source: "server",
            persisted: true,
          };
          processNotificationItem(mapped);
        }
      } catch (err) {
        console.warn("NotificationsButton: fetch inicial falló:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Evento que escucha las notificaciones
  useEffect(() => {
    const handler = (ev: Event) => {
      const c = ev as CustomEvent<Interaction>;
      const detail = c.detail;
      if (!detail || !detail.action) return;
      processNotificationItem(detail);
    };
    window.addEventListener("post:interaction", handler as EventListener);
    return () =>
      window.removeEventListener("post:interaction", handler as EventListener);
  }, [notificationIds, currentUserId]);

  // marcar-leer en transición de cierre
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    if (wasOpen && !open) {
      const idsArray = Array.from(notificationIds);
      setHasUnread(false);
      if (idsArray.length > 0) {
        (async () => {
          try {
            await axios.patch(
              `${API_BASE}/notifications/mark-read`,
              { ids: idsArray },
              {
                headers: {
                  Authorization: localStorage.getItem("authToken")
                    ? `Bearer ${localStorage.getItem("authToken")}`
                    : "",
                  "Content-Type": "application/json",
                },
              }
            );
            setNotificationIds(new Set());
            setGlobalCounts({ like: 0, repost: 0, comment: 0 });

            setPostsMap((prev) => {
              const next = { ...prev };
              for (const key of Object.keys(next)) {
                const p = next[Number(key)];
                const intersect = (p.notificationIds ?? []).some((id) =>
                  idsArray.includes(id)
                );
                if (intersect) {
                  p.likes = p.likes.map((a) => ({ ...a, __unread: false }));
                  p.reposts = p.reposts.map((a) => ({ ...a, __unread: false }));
                  p.comments = p.comments.map((a) => ({
                    ...a,
                    __unread: false,
                  }));
                  p.notificationIds = (p.notificationIds ?? []).filter(
                    (id) => !idsArray.includes(id)
                  );
                  p.unreadLikes = 0;
                  p.unreadReposts = 0;
                  p.unreadComments = 0;
                }
              }
              return next;
            });
          } catch (err) {
            console.warn("Failed to mark notifications read:", err);
          }
        })();
      }
    }
    prevOpenRef.current = open;
  }, [open, notificationIds]);

  // recalculamos hasUnread
  useEffect(() => {
    const anyFromMap = Object.values(postsMap).some(
      (p) =>
        (p.unreadLikes ?? 0) > 0 ||
        (p.unreadReposts ?? 0) > 0 ||
        (p.unreadComments ?? 0) > 0 ||
        p.likes.some((a) => !!a.__unread) ||
        p.reposts.some((a) => !!a.__unread) ||
        p.comments.some((a) => !!a.__unread)
    );
    const anyGlobal =
      (globalCounts.like || 0) +
        (globalCounts.repost || 0) +
        (globalCounts.comment || 0) >
      0;
    setHasUnread(anyFromMap || anyGlobal);
  }, [postsMap, globalCounts]);

  // Iconos para mostrar
  const { hasLike, hasRepost, hasComment } = useMemo(() => {
    let like = false,
      repost = false,
      comment = false;
    for (const k in postsMap) {
      const p = postsMap[k];
      if (
        !like &&
        ((p.unreadLikes ?? 0) > 0 || p.likes.some((a) => !!a.__unread))
      )
        like = true;
      if (
        !repost &&
        ((p.unreadReposts ?? 0) > 0 || p.reposts.some((a) => !!a.__unread))
      )
        repost = true;
      if (
        !comment &&
        ((p.unreadComments ?? 0) > 0 || p.comments.some((a) => !!a.__unread))
      )
        comment = true;
      if (like && repost && comment) break;
    }
    if (!like && (globalCounts.like || 0) > 0) like = true;
    if (!repost && (globalCounts.repost || 0) > 0) repost = true;
    if (!comment && (globalCounts.comment || 0) > 0) comment = true;
    return { hasLike: like, hasRepost: repost, hasComment: comment };
  }, [postsMap, globalCounts]);

  const buttonBgClass = useMemo(() => {
    if (!hasUnread) return "bg-white  text-gray-600 border border-gray-200";
    if (hasLike && !hasRepost && !hasComment) return "bg-red-600 text-white";
    if (!hasLike && hasRepost && !hasComment) return "bg-green-600 text-white";
    if (!hasLike && !hasRepost && hasComment) return "bg-blue-600 text-white";
    if (hasLike && hasRepost && !hasComment)
      return "bg-linear-to-br from-[#ff4d4f] to-[#10b981] text-white";
    if (hasLike && hasComment && !hasRepost)
      return "bg-linear-to-br from-[#ff4d4f] to-[#3b82f6] text-white";
    if (hasRepost && hasComment && !hasLike)
      return "bg-linear-to-br from-[#3b82f6] to-[#10b981] text-white";
    if (hasLike && hasRepost && hasComment)
      return "bg-linear-to-br from-[#ff4d4f] via-[#10b981] to-[#3b82f6] text-white";
    return "bg-white text-gray-600 border border-gray-200";
  }, [hasLike, hasRepost, hasComment, hasUnread]);

  // Ordenamos la lista de publicaciones por lastTimestamp DESC (las más recientes arriba).
  const postsList = useMemo(() => {
    return Object.values(postsMap)
      .slice()
      .sort((a, b) => {
        const ta = a.lastTimestamp ? Date.parse(a.lastTimestamp) : 0;
        const tb = b.lastTimestamp ? Date.parse(b.lastTimestamp) : 0;
        if (tb !== ta) return tb - ta;
        const ca =
          (a.unreadLikes ?? 0) +
          (a.unreadReposts ?? 0) +
          (a.unreadComments ?? 0) +
          a.likes.length +
          a.reposts.length +
          a.comments.length;
        const cb =
          (b.unreadLikes ?? 0) +
          (b.unreadReposts ?? 0) +
          (b.unreadComments ?? 0) +
          b.likes.length +
          b.reposts.length +
          b.comments.length;
        return cb - ca;
      });
  }, [postsMap]);

  // Calcular el total de no leídos (badge)
  const unreadTotal = useMemo(() => {
    let total = 0;
    // Actor por publicación no leído
    for (const p of Object.values(postsMap)) {
      total +=
        (p.unreadLikes ?? 0) + (p.unreadReposts ?? 0) + (p.unreadComments ?? 0);
      total += p.likes.filter((a) => !!a.__unread).length;
      total += p.reposts.filter((a) => !!a.__unread).length;
      total += p.comments.filter((a) => !!a.__unread).length;
    }
    // Recuentos globales (eventos sin postId)
    total +=
      (globalCounts.like || 0) +
      (globalCounts.repost || 0) +
      (globalCounts.comment || 0);
    return total;
  }, [postsMap, globalCounts]);

  const renderActionIcon = (action: "like" | "repost" | "comment") => {
    if (action === "like")
      return <Heart className="inline-block h-4 w-4 text-red-500" />;
    if (action === "repost")
      return <Repeat2 className="inline-block h-4 w-4 text-green-500" />;
    return <MessageCircle className="inline-block h-4 w-4 text-blue-500" />;
  };

  const gotoPost = (postId: number) => {
    setOpen(false);
    navigate(`/feed/post/${postId}`);
  };

  const handleOpenChange = (v: boolean) => setOpen(v);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <Button
          variant="ghost"
          onClick={() => setOpen(true)}
          className={`relative ${buttonBgClass} Dark-boton-notificación hover:bg-linear-to-bl hover:from-[#ce016e] hover:via-[#e63f58] hover:to-[#e37d01] hover:text-white flex items-center gap-2 max-[531px]:w-16 cursor-pointer active:scale-95 active:shadow-inner active:opacity-90 transition-colors transform duration-10`}
          aria-label="Notificaciones"
        >
          {unreadTotal > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-white text-black border">
              {unreadTotal}
            </Badge>
          )}

          <div className="flex items-center gap-1 px-2 py-1">
            {unreadTotal === 0 ? (
              <Bell className="h-5 w-5 Dark-texto-blanco  text-gray-600 hover:text-white" />
            ) : (
              <>
                {hasComment && <MessageCircle className="h-5 w-5 text-white" />}
                {hasRepost && <Repeat2 className="h-5 w-5 text-white" />}
                {hasLike && <Heart className="h-5 w-5 text-white" />}
              </>
            )}
          </div>
        </Button>

        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-xl ">
          <DialogHeader className="p-4 border-b border-2 flex items-center justify-between ">
            <DialogTitle className="text-lg font-semibold">
              Notificaciones
            </DialogTitle>
            <div className="flex items-center gap-2 ">
              <Button variant="outline" className="text-sm Dark-boton cursor-pointer active:scale-95 active:shadow-inner active:opacity-90">
                Limpiar
              </Button>
              <Button variant="outline" className="Dark-boton cursor-pointer active:scale-95 active:shadow-inner active:opacity-90" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
          </DialogHeader>

          <div className="p-4 max-h-[70vh] Dark-gradient overflow-y-auto bg-linear-to-br from-[#faea3d]/80 to-[#d0522f]/80">
            {postsList.length === 0 ? (
              <div className="text-gray-500">No hay notificaciones aún.</div>
            ) : (
              postsList.map((p) => {
                const lastLike = p.likes[0];
                const lastRepost = p.reposts[0];
                const lastComment = p.comments[0];

                return (
                  <div
                    key={p.postId}
                    className="mb-4 Dark-Card bg-white border-2 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => gotoPost(p.postId)}
                    role="button"
                  >
                    <div className="flex items-start justify-between ">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0">
                            <div className="flex items-center gap-2 ">
                              {p.comments.length > 0 &&
                                renderActionIcon("comment")}
                              {p.reposts.length > 0 &&
                                renderActionIcon("repost")}
                              {p.likes.length > 0 && renderActionIcon("like")}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="text-sm text-gray-700">
                              {p.comments.length > 0 && (
                                <div className="flex items-center gap-2 ">
                                  <div className="flex -space-x-2">
                                    {p.comments
                                      .slice(0, MAX_AVATARS_SHOWN)
                                      .map((a) =>
                                        a.avatar ? (
                                          <Avatar
                                            key={`c-${a.id}`}
                                            className="h-8 w-8 border"
                                          >
                                            <img
                                              src={a.avatar ?? undefined}
                                              alt={
                                                a.nombre ?? a.apodo ?? "Usuario"
                                              }
                                              className="w-full h-full object-cover rounded-full"
                                              onError={(e) => {
                                                (
                                                  e.currentTarget as HTMLImageElement
                                                ).style.display = "none";
                                              }}
                                            />
                                            <AvatarFallback>
                                              {(a.apodo ||
                                                a.nombre ||
                                                "U")[0]?.toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                        ) : (
                                          <div
                                            key={`c-${a.id}`}
                                            className="h-6 w-6 rounded-full bg-blue-200 text-xs flex items-center justify-center text-blue-700 font-medium"
                                          >
                                            {(a.apodo ||
                                              a.nombre ||
                                              "U")[0]?.toUpperCase()}
                                          </div>
                                        )
                                      )}
                                  </div>
                                  <div className="truncate Dark-texto-blanco">
                                    {p.comments.length === 1
                                      ? `${
                                          lastComment?.nombre ??
                                          lastComment?.apodo
                                        } ha comentado esta publicación`
                                      : `${
                                          lastComment?.nombre ??
                                          lastComment?.apodo
                                        }, y ${
                                          p.comments.length - 1
                                        } más han comentado esta publicación`}
                                  </div>
                                </div>
                              )}

                              {p.reposts.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex -space-x-2">
                                    {p.reposts
                                      .slice(0, MAX_AVATARS_SHOWN)
                                      .map((a) =>
                                        a.avatar ? (
                                          <Avatar
                                            key={`r-${a.id}`}
                                            className="h-8 w-8 border"
                                          >
                                            <img
                                              src={a.avatar ?? undefined}
                                              alt={
                                                a.nombre ?? a.apodo ?? "Usuario"
                                              }
                                              className="w-full h-full object-cover rounded-full"
                                              onError={(e) => {
                                                (
                                                  e.currentTarget as HTMLImageElement
                                                ).style.display = "none";
                                              }}
                                            />
                                            <AvatarFallback>
                                              {(a.apodo ||
                                                a.nombre ||
                                                "U")[0]?.toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                        ) : (
                                          <div
                                            key={`r-${a.id}`}
                                            className="h-6 w-6 rounded-full bg-green-200 text-xs flex items-center justify-center text-green-700 font-medium"
                                          >
                                            {(a.apodo ||
                                              a.nombre ||
                                              "U")[0]?.toUpperCase()}
                                          </div>
                                        )
                                      )}
                                  </div>
                                  <div className="truncate Dark-texto-blanco">
                                    {p.reposts.length === 1
                                      ? `${
                                          lastRepost?.nombre ??
                                          lastRepost?.apodo
                                        } ha republicado`
                                      : `${
                                          lastRepost?.nombre ??
                                          lastRepost?.apodo
                                        }, y ${
                                          p.reposts.length - 1
                                        } más han republicado`}
                                  </div>
                                </div>
                              )}

                              {p.likes.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex -space-x-2">
                                    {p.likes
                                      .slice(0, MAX_AVATARS_SHOWN)
                                      .map((a) =>
                                        a.avatar ? (
                                          <Avatar
                                            key={`l-${a.id}`}
                                            className="h-8 w-8 border"
                                          >
                                            <img
                                              src={a.avatar ?? undefined}
                                              alt={
                                                a.nombre ?? a.apodo ?? "Usuario"
                                              }
                                              className="w-full h-full object-cover rounded-full"
                                              onError={(e) => {
                                                (
                                                  e.currentTarget as HTMLImageElement
                                                ).style.display = "none";
                                              }}
                                            />
                                            <AvatarFallback>
                                              {(a.apodo ||
                                                a.nombre ||
                                                "U")[0]?.toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                        ) : (
                                          <div
                                            key={`l-${a.id}`}
                                            className="h-6 w-6 rounded-full bg-red-200 text-xs flex items-center justify-center text-red-700 font-medium"
                                          >
                                            {(a.apodo ||
                                              a.nombre ||
                                              "U")[0]?.toUpperCase()}
                                          </div>
                                        )
                                      )}
                                  </div>
                                  <div className="truncate Dark-texto-blanco">
                                    {p.likes.length === 1
                                      ? `${
                                          lastLike?.nombre ?? lastLike?.apodo
                                        } ha dado like`
                                      : `${
                                          lastLike?.nombre ?? lastLike?.apodo
                                        }, y ${
                                          p.likes.length - 1
                                        } más han dado like`}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          {/* Renderizamos PostPreview condicionalmente solo cuando haya una imagen. 
                          Si no hay imagen, renderizamos una tarjeta de texto compacta sin miniatura.. */}
                          {p.postImage ? (
                            <PostPreview
                              postId={p.postId}
                              snippet={p.snippet ?? null}
                              imageUrl={p.postImage ?? null}
                              authorName={p.postAuthorName ?? null}
                              authorApodo={p.postAuthorApodo ?? null}
                              onClick={() => gotoPost(p.postId)}
                            />
                          ) : (
                            <div
                              className="w-full bg-white rounded-md p-3 border-2 mt-2"
                              onClick={() => gotoPost(p.postId)}
                            >
                              <div className="font-semibold text-gray-900">
                                {p.postAuthorName ?? "Publicación"}
                              </div>
                              {p.snippet && (
                                <div className="text-sm text-gray-600 mt-1 truncate">
                                  {p.snippet}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ml-4 shrink-0 text-xs text-gray-400">
                        <div>
                          {p.likes.length +
                            p.reposts.length +
                            p.comments.length}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotificationsButton;
