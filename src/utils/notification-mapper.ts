export type ActorShape = {
  id: number;
  nombre?: string | null;
  apodo?: string | null;
  avatar?: string | null;
  commentId?: number | null;
  commentSnippet?: string | null;
};

export type PostInteraction = {
  postId: number;
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
  actor?: ActorShape | null;
  postSnippet?: string | null;
  postImage?: string | null;
  postAuthorName?: string | null;
  postAuthorApodo?: string | null;
  timestamp?: string | null;
  notificationId?: number | null;

  // metadata que ayudan a la UI:
  // - source: "server" | "local" (opcional)
  // - persisted: true cuando viene del backend
  // - read: boolean si la notificación ya está marcada
  source?: "server" | "local";
  persisted?: boolean;
  read?: boolean;
  commentId?: number | null;
  commentSnippet?: string | null;
};

function pickAvatarFromPayload(n: any): string | null {
  if (!n) return null;
  if (typeof n === "string") return n;
  const fields = [
    n.avatar,
    n.actor?.avatar,
    n.actor_avatar,
    n.actor_avatar_url,
    n.actor_avatar_publicUrl,
    n.actor?.avatarUrl,
    n.avatar_url,
    n.url_avatar,
  ];
  for (const f of fields) {
    if (typeof f === "string" && f.trim() !== "") return f;
  }
  return null;
}

/** Acciones que consideramos válidas para el mapeo */
export const VALID_ACTIONS = [
  "like",
  "repost",
  "comment",
  "unlike",
  "unrepost",
  "delete_comment",
  "remove_like",
  "remove_repost",
  "remove_comment",
] as const;

export function isValidAction(a: string): a is PostInteraction["action"] {
  return (VALID_ACTIONS as readonly string[]).includes(a);
}

/**
 * Mappeamos una notificación (server payload) al shape PostInteraction. Incluye `read`.
 * Devuelve null si no hay postId válido o la acción no es una de las esperadas.
 */
export function mapNotificationToPostInteraction(n: any): PostInteraction | null {
  if (!n) return null;
  const postIdRaw = n?.post?.id ?? n?.post_id ?? n?.postId ?? null;
  const postId = postIdRaw == null ? null : Number(postIdRaw);
  if (!postId || Number.isNaN(postId)) return null;

  const type = n.type ?? n.action ?? "";
  const action =
    type === "like" ||
    type === "repost" ||
    type === "comment" ||
    type === "unlike" ||
    type === "unrepost" ||
    type === "delete_comment"
      ? (type as PostInteraction["action"])
      : null;
  if (!action) return null;

  const actorFromPayload = n.actor ?? null;
  const actorId = actorFromPayload?.id ?? n?.actor_id ?? n?.actorId ?? null;

  const actor: ActorShape | null =
    actorId != null
      ? {
          id: Number(actorId),
          nombre:
            actorFromPayload?.nombre ??
            actorFromPayload?.name ??
            n?.actor_nombre ??
            null,
          apodo:
            actorFromPayload?.apodo ??
            actorFromPayload?.username ??
            n?.actor_apodo ??
            null,
          avatar: pickAvatarFromPayload(n) ?? null,
          commentId: (n?.comment?.id ?? n?.comment_id ?? null) ? Number(n?.comment?.id ?? n?.comment_id ?? null) : null,
          commentSnippet: n?.comment?.snippet ?? n?.comment_snippet ?? null,
        }
      : null;

  // read (si viene del server)
  const readFlag = typeof n.read === "boolean" ? n.read : false;

  return {
    postId,
    action,
    actor,
    postSnippet: n.post?.snippet ?? n.post_snippet ?? null,
    postImage: n.post?.image ?? n.post_image ?? null,
    postAuthorName: n.post?.authorName ?? n.post_author_name ?? null,
    postAuthorApodo: n.post?.authorApodo ?? n.post_author_apodo ?? null,
    timestamp: n.created_at ?? n.createdAt ?? null,
    notificationId: n.id ?? (n.notification?.id ?? null) ?? null,
    // metadata por defecto: read (server-controlled). `source`/`persisted` se asignan por quien llame.
    read: readFlag,
  };
}