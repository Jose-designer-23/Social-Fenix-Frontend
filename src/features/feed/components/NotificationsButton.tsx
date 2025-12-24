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
// Usamos el Avatar propio de user-profile en lugar del de shadcn
import Avatar from "@/features/user-profile/components/Avatar";
import { Heart, MessageCircle, Repeat2, Bell, User } from "lucide-react";
import { useAuth } from "@/features/auth/services/AuthContext";
import PostPreview from "./PostPreview";
import axios from "axios";
import { useTranslation } from "react-i18next";

import {
  formatDistanceToNow,
  parseISO,
  differenceInDays,
  format as formatDate,
  differenceInSeconds,
  differenceInMinutes,
  addHours,
} from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/* -------------------
   Date helpers
   ------------------- */
function parseServerDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput !== "string") return new Date(dateInput);
  const hasZone = /[zZ]$|[+\-]\d{2}:\d{2}$/.test(dateInput);
  const toParse = hasZone ? dateInput : dateInput + "Z";
  let date = parseISO(toParse);
  date = addHours(date, 1);
  return date;
}

const formatTimeAgo = (dateInput: string | Date, t: any): string => {
  try {
    const date = parseServerDate(dateInput);
    const now = new Date();
    const secondsDifference = differenceInSeconds(now, date);
    if (secondsDifference < 60) return t("PostCard.now");
    const minutesDifference = differenceInMinutes(now, date);
    if (minutesDifference < 60) {
      return formatDistanceToNow(date, { addSuffix: true, locale: es }).replace(
        "alrededor de",
        t("CommentItem.aboutReplace", "hace")
      );
    }
    const daysDifference = differenceInDays(now, date);
    if (daysDifference > 180) {
      return formatDate(date, "dd MMM yyyy", { locale: es });
    }
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  } catch {
    return t("PostCard.invalidDate", "Fecha inválida");
  }
};

function formatExactSpain(dateInput: string | Date): string {
  try {
    const date = parseServerDate(dateInput);
    return formatInTimeZone(date, "Europe/Madrid", "dd/MM/yyyy, HH:mm:ss");
  } catch {
    return "";
  }
}
/* -------------------
   End date helpers
   ------------------- */

/* -------------------
   Types
   ------------------- */
type Actor = {
  id: number;
  nombre?: string | null;
  apodo?: string | null;
  avatar?: string | null;
  __unread?: boolean;
  timestamp?: string | null;
  notificationId?: number | null;
  commentId?: number | null;
};

type Interaction = {
  postId?: number | null;
  action:
    | "like"
    | "repost"
    | "comment"
    | "follow"
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
  commentId?: number | null;
  commentSnippet?: string | null;
};

type NotificationEntry = {
  id: number;
  type: string;
  actor?: {
    id: number;
    nombre?: string | null;
    apodo?: string | null;
    avatar?: string | null;
  } | null;
  post?: {
    id?: number | null;
    snippet?: string | null;
    image?: string | null;
    authorName?: string | null;
    authorApodo?: string | null;
    authorAvatar?: string | null;
  } | null;
  comment?: { id?: number | null; snippet?: string | null } | null;
  read: boolean;
  created_at?: string | null;
  source?: "server" | "local";
  persisted?: boolean;
};

type PostNotifications = {
  postId: number;
  snippet?: string | null;
  postImage?: string | null;
  postAuthorName?: string | null;
  postAuthorApodo?: string | null;
  postAuthorAvatar?: string | null;
  likes: Actor[];
  reposts: Actor[];
  comments: Actor[];
  notificationIds?: number[];
  unreadLikes?: number;
  unreadReposts?: number;
  unreadComments?: number;
  lastTimestamp?: string | null;
  lastCommentId?: number | null;
  lastCommentSnippet?: string | null;
};

const MAX_AVATARS_SHOWN = 4;
/* -------------------
   End types
   ------------------- */

/* -------------------
   Helpers
   ------------------- */
// Normaliza rutas relativas de avatar añadiendo API_BASE si hace falta
function normalizeAvatarUrl(src?: string | null): string | undefined {
  if (!src) return undefined;
  const s = String(src).trim();
  if (!s) return undefined;
  if (s.startsWith("/")) return `${API_BASE}${s}`;
  return s;
}
/* -------------------
   End helpers
   ------------------- */

const NotificationsButton: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = (user as any)?.id ?? (user as any)?.sub ?? null;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  // states
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [postsMap, setPostsMap] = useState<Record<number, PostNotifications>>(
    {}
  );
  const [followActors, setFollowActors] = useState<Actor[]>([]);
  const [notificationIds, setNotificationIds] = useState<Set<number>>(
    new Set()
  );
  const [globalCounts, setGlobalCounts] = useState({
    like: 0,
    repost: 0,
    comment: 0,
  });
  const prevOpenRef = useRef(open);

  // helper: normalize server payload (similar to tu mapper)
  function normalizeServerNotification(it: any): NotificationEntry {
    // try to extract avatar aliases for post author if present
    const authorAvatar =
      it.post?.authorAvatar ??
      it.post_author_avatar ??
      it.post?.author?.avatar ??
      it.post?.author_avatar ??
      null;

    return {
      id: Number(it.id),
      type: it.type ?? it.action ?? "other",
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
      post: {
        id: it.post?.id ?? it.post_id ?? null,
        snippet: it.post?.snippet ?? it.post_snippet ?? null,
        image: it.post?.image ?? it.post_image ?? null,
        authorName: it.post?.authorName ?? it.post_author_name ?? null,
        authorApodo: it.post?.authorApodo ?? it.post_author_apodo ?? null,
        authorAvatar: authorAvatar,
      },
      comment: it.comment
        ? { id: it.comment.id, snippet: it.comment.snippet }
        : { id: it.comment_id ?? null, snippet: it.comment_snippet ?? null },
      read: !!it.read,
      created_at: it.created_at ?? it.createdAt ?? new Date().toISOString(),
      source: "server",
      persisted: true,
    };
  }

  // merge helper for actor lists
  function mergeActorList(list: Actor[], actor?: Actor | null): Actor[] {
    if (!actor) return list;
    const exists = list.find((a) => a.id === actor.id);
    if (exists) {
      const merged = { ...exists, ...actor };
      merged.__unread = !!(actor.__unread || exists.__unread);
      merged.timestamp = actor.timestamp ?? exists.timestamp ?? null;
      merged.notificationId =
        actor.notificationId ?? exists.notificationId ?? null;
      merged.commentId = actor.commentId ?? exists.commentId ?? null;
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

  // process an Interaction (keeps postsMap/followActors/globalCounts/notificationIds in sync)
  const processNotificationItem = (detail: Interaction) => {
    if (!detail || !detail.action) return;

    // NEW: ignore actions generated by the current user (they don't need to be notified)
    if (
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

    // follow without postId -> integrate as followActors
    if (detail.action === "follow" && (!pid || pid === null)) {
      setFollowActors((prev) => {
        const actorWithTs: Actor | null = detail.actor
          ? {
              ...(detail.actor as Actor),
              __unread: !!(
                (detail.source === "server" || detail.persisted === true) &&
                detail.read !== true
              ),
              timestamp: ts,
              notificationId: nid ?? detail.actor?.notificationId ?? null,
            }
          : null;
        if (!actorWithTs) return prev;
        // use mergeActorList to preserve order & uniqueness
        return mergeActorList(prev, actorWithTs);
      });

      const serverEvent =
        detail.source === "server" || detail.persisted === true;
      const shouldMarkUnread = serverEvent && detail.read !== true;
      if (shouldMarkUnread) {
        // we only change globalCounts to influence the button, but NOT the badge (badge is computed from notifications array)
        setGlobalCounts((g) => ({ ...g }));
      }
      return;
    }

    // post-related actions
    const incPostCounter = (post: PostNotifications, action: string) => {
      if (action === "like") post.unreadLikes = (post.unreadLikes ?? 0) + 1;
      if (action === "repost")
        post.unreadReposts = (post.unreadReposts ?? 0) + 1;
      if (action === "comment")
        post.unreadComments = (post.unreadComments ?? 0) + 1;
    };

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
            postAuthorAvatar: (detail as any).postAuthorAvatar ?? null,
            likes: [],
            reposts: [],
            comments: [],
            notificationIds: nid ? [nid] : [],
            unreadLikes: 0,
            unreadReposts: 0,
            unreadComments: 0,
            lastTimestamp: ts,
            lastCommentId: detail.commentId ?? null,
            lastCommentSnippet: detail.commentSnippet ?? null,
          };
        } else {
          if (nid) {
            next[pid].notificationIds = Array.from(
              new Set([...(next[pid].notificationIds ?? []), nid])
            );
          }
          next[pid].lastTimestamp = ts;
          if (detail.action === "comment") {
            next[pid].lastCommentId =
              detail.commentId ?? next[pid].lastCommentId ?? null;
            next[pid].lastCommentSnippet =
              detail.commentSnippet ?? next[pid].lastCommentSnippet ?? null;
          }
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
            notificationId: nid ?? detail.actor?.notificationId ?? null,
            commentId: detail.commentId ?? detail.actor?.commentId ?? null,
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
          setGlobalCounts((c) => ({ ...c }));
        }
        return next;
      });
      return;
    }

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
      }
    }
  };

  // initial fetch: populate flat notifications (source of truth for rendering and badge) and also feed postsMap/followActors
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) return;
      try {
        const res = await axios.get<{ data?: any[] }>(
          `${API_BASE}/notifications`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const items = res.data?.data ?? [];
        if (!mounted) return;
        // normalize and filter out notifications generated by current user
        let normalized = items.map(normalizeServerNotification);
        if (currentUserId != null) {
          normalized = normalized.filter(
            (n) => !(n.actor && n.actor.id === currentUserId)
          );
        }
        normalized.sort((a, b) => {
          const ta = a.created_at ? Date.parse(a.created_at) : 0;
          const tb = b.created_at ? Date.parse(b.created_at) : 0;
          return tb - ta;
        });
        setNotifications(normalized);

        // populate derived structures for button state
        for (const it of items) {
          // skip processing interactions that come from the current user
          const actorId = it.actor?.id ?? it.actor_id ?? null;
          if (currentUserId != null && actorId === currentUserId) continue;

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
                    notificationId: it.id ?? null,
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
            commentId: it.comment?.id ?? it.comment_id ?? it.commentId ?? null,
            commentSnippet:
              it.comment?.snippet ??
              it.comment_snippet ??
              it.commentSnippet ??
              null,
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
  }, [token, currentUserId]);

  // listen global events and prepend to flat list AND update derived structures
  useEffect(() => {
    const handler = (ev: Event) => {
      const c = ev as CustomEvent<any>;
      const detail = c.detail;
      if (!detail) return;

      // ignore events generated by the current user
      const actorId = detail?.actor?.id ?? detail?.actor_id ?? null;
      if (currentUserId != null && actorId === currentUserId) return;

      // create flat-list notification entry (source of truth for rendering & badge)
      const nid = detail.notificationId ?? detail.id ?? null;
      const newEntry: NotificationEntry = {
        id: nid ? Number(nid) : Date.now(),
        type: detail.action ?? detail.type ?? "other",
        actor: detail.actor ?? null,
        post: {
          id: detail.postId ?? detail.post?.id ?? null,
          snippet: detail.postSnippet ?? detail.post?.snippet ?? null,
          image: detail.postImage ?? detail.post?.image ?? null,
          authorName: detail.postAuthorName ?? detail.post?.authorName ?? null,
          authorApodo:
            detail.postAuthorApodo ?? detail.post?.authorApodo ?? null,
          authorAvatar:
            detail.post?.author?.avatar ??
            detail.postAuthorAvatar ??
            detail.post?.author_avatar ??
            null,
        },
        comment: {
          id: detail.commentId ?? detail.comment?.id ?? null,
          snippet: detail.commentSnippet ?? detail.comment?.snippet ?? null,
        },
        read: !!detail.read,
        created_at: detail.timestamp ?? new Date().toISOString(),
        source: detail.source ?? "server",
        persisted: !!detail.persisted,
      };

      setNotifications((prev) => {
        const exists = prev.find((p) => p.id === newEntry.id);
        if (exists)
          return [newEntry, ...prev.filter((p) => p.id !== newEntry.id)];
        return [newEntry, ...prev].sort(
          (a, b) =>
            (b.created_at ? Date.parse(b.created_at) : 0) -
            (a.created_at ? Date.parse(a.created_at) : 0)
        );
      });

      // keep postsMap/followActors updated
      const mapped: Interaction = {
        postId: detail.postId ?? detail.post?.id ?? null,
        action: detail.action ?? detail.type ?? "",
        actor: detail.actor ?? null,
        postSnippet: detail.postSnippet ?? detail.post?.snippet ?? null,
        postImage: detail.postImage ?? detail.post?.image ?? null,
        postAuthorName:
          detail.postAuthorName ?? detail.post?.authorName ?? null,
        postAuthorApodo:
          detail.postAuthorApodo ?? detail.post?.authorApodo ?? null,
        timestamp: detail.timestamp ?? new Date().toISOString(),
        notificationId: newEntry.id,
        read: !!detail.read,
        source: detail.source ?? "server",
        persisted: !!detail.persisted,
        commentId: detail.commentId ?? null,
        commentSnippet: detail.commentSnippet ?? null,
      };
      processNotificationItem(mapped);
    };

    window.addEventListener("post:interaction", handler as EventListener);
    return () =>
      window.removeEventListener("post:interaction", handler as EventListener);
  }, [currentUserId]);

  // compute button state flags based on derived structures (unchanged)
  const { hasLike, hasRepost, hasComment, hasFollow } = useMemo(() => {
    let like = false,
      repost = false,
      comment = false,
      follow = false;
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
    if (!follow && followActors.some((a) => !!a.__unread)) follow = true;
    return {
      hasLike: like,
      hasRepost: repost,
      hasComment: comment,
      hasFollow: follow,
    };
  }, [postsMap, globalCounts, followActors]);

  const hasUnread = useMemo(() => {
    // used for button styling only: if any unread exists in derived data or in notifications
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
    const anyFollow = followActors.some((a) => !!a.__unread);
    const anyFlat = notifications.some((n) => !n.read);
    return anyFromMap || anyGlobal || anyFollow || anyFlat;
  }, [postsMap, globalCounts, followActors, notifications]);

  const buttonBgClass = useMemo(() => {
    if (!hasUnread) return "bg-white text-gray-600 border border-gray-200";
    if (hasFollow && !hasLike && !hasRepost && !hasComment)
      return "bg-linear-to-br from-[#2accc0] to-[#00b9a8] text-white";
    if (hasLike && !hasRepost && !hasComment && !hasFollow)
      return "bg-red-600 text-white";
    if (!hasLike && hasRepost && !hasComment && !hasFollow)
      return "bg-green-600 text-white";
    if (!hasLike && !hasRepost && hasComment && !hasFollow)
      return "bg-blue-600 text-white";
    if (hasLike && hasRepost && !hasComment && !hasFollow)
      return "bg-linear-to-br from-[#ff4d4f] to-[#10b981] text-white";
    if (hasLike && hasComment && !hasRepost && !hasFollow)
      return "bg-linear-to-br from-[#ff4d4f] to-[#3b82f6] text-white";
    if (hasRepost && hasComment && !hasLike && !hasFollow)
      return "bg-linear-to-br from-[#3b82f6] to-[#10b981] text-white";
    if (
      (hasFollow && hasLike && !hasRepost && !hasComment) ||
      (hasFollow && !hasLike && hasRepost && !hasComment) ||
      (hasFollow && !hasLike && !hasRepost && hasComment)
    ) {
      return "bg-linear-to-br from-[#2accc0] via-[#ff4d4f] to-[#3b82f6] text-white";
    }
    if (hasFollow && hasLike && hasRepost && hasComment)
      return "bg-linear-to-br from-[#2accc0] via-[#ff4d4f] to-[#3b82f6] text-white";
    return "bg-white text-gray-600 border border-gray-200";
  }, [hasLike, hasRepost, hasComment, hasFollow, hasUnread]);

  // IMPORTANT: unreadTotal now computed from the flat notifications list ONLY (prevents double counting)
  const unreadTotal = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const renderActionIcon = (action: string) => {
    if (action === "like")
      return <Heart className="inline-block h-4 w-4 text-red-500" />;
    if (action === "repost")
      return <Repeat2 className="inline-block h-4 w-4 text-green-500" />;
    if (action === "follow")
      return <User className="inline-block h-4 w-4 text-teal-500" />;
    if (action === "comment")
      return <MessageCircle className="inline-block h-4 w-4 text-blue-500" />;
  };

  const actionLabel = (type: string) => {
    if (type === "comment") return t("NotificationsButton.commentSingle", "");
    if (type === "like") return t("NotificationsButton.likeSingle", "");
    if (type === "repost") return t("NotificationsButton.repostSingle", "");
    if (type === "follow") return t("NotificationsButton.followSingle", "");
    return t(`NotificationsButton.${type}`, type);
  };

  // mark single as read (optimistic)
  const markSingleAsRead = async (id?: number | null) => {
    if (!id || !token) return;
    setNotifications((prev) =>
      prev.map((p) => (p.id === id ? { ...p, read: true } : p))
    );
    try {
      await axios.patch(
        `${API_BASE}/notifications/mark-read`,
        { ids: [id] },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err) {
      console.warn("Failed mark single read:", err);
      setNotifications((prev) =>
        prev.map((p) => (p.id === id ? { ...p, read: false } : p))
      );
    }
  };

  // Helper para navegar al perfil del actor (marca como leído si procede)
  const goToActorProfile = (actor?: { apodo?: string | null; id?: number | null }, notificationId?: number | null) => {
    if (!actor) {
      // fallback - ir a home o al propio perfil
      setOpen(false);
      navigate("/");
      return;
    }

    if (notificationId && notificationId !== null) {
      markSingleAsRead(notificationId);
    }

    const apodo = actor.apodo ?? null;
    const id = actor.id ?? null;

    setOpen(false);
    // preferimos apodo (rutas como /profile/:apodo). Si no hay, usar /profile/id/:id
    if (apodo) {
      navigate(`/profile/${apodo}`);
    } else if (id) {
      navigate(`/profile/id/${id}`);
    } else {
      navigate("/");
    }
  };

  // when closing panel mark visible notifications read (uses notifications flat list)
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    if (wasOpen && !open) {
      const idsToMark = notifications
        .filter((n) => !n.read && n.persisted)
        .map((n) => n.id);
      if (idsToMark.length === 0) {
        prevOpenRef.current = open;
        return;
      }
      // optimistic update locally
      setNotifications((prev) =>
        prev.map((p) => (idsToMark.includes(p.id) ? { ...p, read: true } : p))
      );
      (async () => {
        try {
          await axios.patch(
            `${API_BASE}/notifications/mark-read`,
            { ids: idsToMark },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
          // clear derived tracking sets if needed
          setNotificationIds((s) => {
            const next = new Set(s);
            for (const id of idsToMark) next.delete(id);
            return next;
          });
          setGlobalCounts({ like: 0, repost: 0, comment: 0 });
          // mark followActors/postsMap actors as read if their notification ids were included
          setFollowActors((prev) =>
            prev.map((a) =>
              a.notificationId && idsToMark.includes(a.notificationId)
                ? { ...a, __unread: false }
                : a
            )
          );
          setPostsMap((prev) => {
            const next = { ...prev };
            for (const key of Object.keys(next)) {
              const p = next[Number(key)];
              if (
                (p.notificationIds ?? []).some((id) => idsToMark.includes(id))
              ) {
                p.likes = p.likes.map((a) => ({ ...a, __unread: false }));
                p.reposts = p.reposts.map((a) => ({ ...a, __unread: false }));
                p.comments = p.comments.map((a) => ({ ...a, __unread: false }));
                p.notificationIds = (p.notificationIds ?? []).filter(
                  (id) => !idsToMark.includes(id)
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
          // rollback: reload notifications from server
          try {
            const res = await axios.get<{ data?: any[] }>(
              `${API_BASE}/notifications`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const items = res.data?.data ?? [];
            const normalized = items
              .map(normalizeServerNotification)
              .sort((a, b) => {
                const ta = a.created_at ? Date.parse(a.created_at) : 0;
                const tb = b.created_at ? Date.parse(b.created_at) : 0;
                return tb - ta;
              });
            setNotifications(normalized);
          } catch (e) {
            console.warn(
              "Failed to reload notifications after failed mark-read",
              e
            );
          }
        }
      })();
    }
    prevOpenRef.current = open;
  }, [open, notifications, token]);

  const handleClearAll = async () => {
    if (!token) return;
    try {
      await axios.delete(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
      setPostsMap({});
      setFollowActors([]);
      setNotificationIds(new Set());
      setGlobalCounts({ like: 0, repost: 0, comment: 0 });
    } catch (err) {
      console.warn("Failed to clear notifications:", err);
    }
  };

  const navigateTo = (postId?: number | null, commentId?: number | null) => {
    setOpen(false);
    if (postId && commentId) {
      navigate(`/feed/post/${postId}/comment/${commentId}`);
      return;
    }
    if (postId) {
      navigate(`/feed/post/${postId}`);
      return;
    }
    navigate("/");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          variant="ghost"
          onClick={() => setOpen(true)}
          className={`relative ${buttonBgClass} Dark-boton-notificación hover:bg-linear-to-bl hover:from-[#ce016e] hover:via-[#e63f58] hover:to-[#e37d01] hover:text-white flex items-center gap-2 max-[531px]:w-16 cursor-pointer active:scale-95 active:shadow-inner active:opacity-90 transition-colors transform duration-10`}
          aria-label={t("NotificationsButton.ariaLabel")}
        >
          {unreadTotal > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-white text-black border">
              {unreadTotal}
            </Badge>
          )}

          <div className="flex items-center gap-1 px-2 py-1">
            {unreadTotal === 0 ? (
              <Bell className="h-5 w-5 Dark-texto-blanco text-gray-600 hover:text-white" />
            ) : hasFollow && !hasLike && !hasRepost && !hasComment ? (
              <User className="h-5 w-5 text-white" />
            ) : (
              <>
                {hasComment && <MessageCircle className="h-5 w-5 text-white" />}
                {hasRepost && <Repeat2 className="h-5 w-5 text-white" />}
                {hasLike && <Heart className="h-5 w-5 text-white" />}
                {hasFollow && (hasLike || hasRepost || hasComment) && (
                  <User className="h-4 w-4 text-white ml-1" />
                )}
              </>
            )}
          </div>
        </Button>

        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-4 border-b border-2 flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {t("NotificationsButton.title")}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="text-sm Dark-boton-notificaciones"
                onClick={handleClearAll}
              >
                {t("NotificationsButton.clear")}
              </Button>
              <Button
                variant="outline"
                className="Dark-boton-notificaciones"
                onClick={() => setOpen(false)}
              >
                {t("NotificationsButton.close")}
              </Button>
            </div>
          </DialogHeader>

          <div className="p-4 max-h-[70vh] Dark-gradient overflow-y-auto bg-linear-to-br from-[#faea3d]/80 to-[#d0522f]/80">
            {notifications.length === 0 ? (
              <div className="text-gray-500">
                {t("NotificationsButton.noNotifications")}
              </div>
            ) : (
              notifications.map((n) => {
                const actorName =
                  n.actor?.nombre ??
                  n.actor?.apodo ??
                  t("NotificationsButton.userFallback");
                const actionText = actionLabel(n.type);
                const snippet = n.comment?.snippet ?? n.post?.snippet ?? "";

                // For follow notifications we want the whole notification click to go to the actor profile
                const isFollow = n.type === "follow";

                return (
                  <div
                    key={`notif-${n.id}`}
                    // si es follow, hacemos la tarjeta clickable y navegable al perfil del actor
                    onClick={(e) => {
                      // si es follow y hay actor, navegar a su perfil
                      if (isFollow) {
                        e.stopPropagation();
                        goToActorProfile(n.actor ?? undefined, n.persisted ? n.id : null);
                      }
                    }}
                    className={`mb-4 Dark-outline Dark-Card bg-white border-2 rounded-lg p-3 hover:bg-blue-100 ${isFollow ? "cursor-pointer" : ""}`}
                    role={isFollow ? "button" : undefined}
                    aria-label={isFollow ? t("NotificationsButton.gotoProfile") : undefined}
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0">
                        {n.actor?.avatar ? (
                          <Avatar
                            src={normalizeAvatarUrl(n.actor.avatar)}
                            alt={actorName}
                            size={40}
                            className="border"
                            initials={(n.actor?.apodo ??
                              n.actor?.nombre ??
                              "U")[0]?.toUpperCase()}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {/* Hacemos también el nombre clickable independientemente de si es follow */}
                              <span
                                className="font-medium hover:underline cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goToActorProfile(n.actor ?? undefined, n.persisted ? n.id : null);
                                }}
                              >
                                {actorName}
                              </span>{" "}
                              <span className=" Dark-apodo-comentario font-normal text-gray-600">
                                {actionText}
                              </span>
                            </div>
                            <div className="text-xs Dark-fecha-union text-gray-400 mt-1">
                              {n.created_at ? (
                                <time
                                  dateTime={parseServerDate(
                                    n.created_at
                                  ).toISOString()}
                                  title={formatExactSpain(n.created_at)}
                                >
                                  {formatTimeAgo(n.created_at, t)}
                                </time>
                              ) : null}
                            </div>
                          </div>

                          <div className="ml-3 flex items-center gap-2">
                            <div className="text-sm text-gray-500">
                              {renderActionIcon(n.type)}
                            </div>
                            {!n.read && (
                              <div className="text-xs text-white bg-indigo-600 px-2 py-1 rounded">
                                {t("NotificationsButton.new", "nuevo")}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* hide post preview for 'follow' notifications */}
                        {n.type !== "follow" && (
                          <div
                            className="mt-3 p-3 Dark-Card border-2 Dark-outline Dark-border-notificaciones rounded-md bg-white/60"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (n.persisted) markSingleAsRead(n.id);
                              navigateTo(
                                n.post?.id ?? null,
                                n.comment?.id ?? null
                              );
                            }}
                          >
                            {n.post?.image ? (
                              <PostPreview
                                postId={n.post.id ?? -1}
                                snippet={n.post.snippet ?? ""}
                                imageUrl={n.post.image ?? undefined}
                                authorName={n.post.authorName ?? undefined}
                                authorApodo={n.post.authorApodo ?? undefined}
                                onClick={() => {
                                  if (n.persisted) markSingleAsRead(n.id);
                                  navigateTo(
                                    n.post?.id ?? null,
                                    n.comment?.id ?? null
                                  );
                                }}
                              />
                            ) : (
                              <div className="min-w-0">
                                <div className="font-semibold Dark-texto-blanco  text-gray-900">
                                  {n.post?.authorName ??
                                    t("NotificationsButton.postFallback")}
                                </div>
                                {snippet && (
                                  <div className="text-sm Dark-apodo-comentario text-gray-600 mt-1 line-clamp-3">
                                    {n.post?.snippet}
                                  </div>
                                )}
                              </div>
                            )}

                            {n.comment?.snippet ? (
                              <>
                                <div className="mt-3 p-3 Dark-Card Dark-outline rounded-md border-gray-300/60 bg-white hover:bg-gray-50 cursor-pointer flex gap-3 items-start text-sm Dark-apodo-comentario border-2 Dark-border-notificaciones text-gray-700 italic">
                                  <div className="shrink-0">
                                    {n.actor?.avatar ? (
                                      <Avatar
                                        src={normalizeAvatarUrl(n.actor.avatar)}
                                        alt={actorName}
                                        size={40}
                                        className="border"
                                        initials={(n.actor?.apodo ??
                                          n.actor?.nombre ??
                                          "U")[0]?.toUpperCase()}
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100">
                                        <User className="h-5 w-5 text-gray-600" />
                                      </div>
                                    )}
                                  </div>
                                  {n.comment.snippet}
                                </div>
                              </>
                            ) : null}
                          </div>
                        )}
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