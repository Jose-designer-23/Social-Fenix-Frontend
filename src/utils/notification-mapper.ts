// Nota: sustituye la versión actual por esta.
// Este mapper normaliza payloads del servidor (o locales) a PostInteraction,
// exponiendo siempre postId, commentId y commentSnippet (cuando existan).

export type ActorShape = {
  id: number;
  nombre?: string | null;
  apodo?: string | null;
  avatar?: string | null;
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
  source?: "server" | "local";
  persisted?: boolean;
  read?: boolean;

  // Metadata para comentarios (expuestas EN PRIMER NIVEL para facilitar el consumo)
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

const VALID_ACTIONS = new Set([
  "like",
  "repost",
  "comment",
  "unlike",
  "unrepost",
  "delete_comment",
  "remove_like",
  "remove_repost",
  "remove_comment",
]);

export function isValidAction(a: string): boolean {
  return VALID_ACTIONS.has(a);
}

/**
 * Normaliza un payload de notificación del servidor a PostInteraction.
 * - Asegura que postId exista (si la notificación se refiere a un post).
 * - Extrae commentId/commentSnippet y los pone en primer nivel.
 * - Devuelve null solo si no hay postId válido u action no válido.
 */
export function mapNotificationToPostInteraction(n: any): PostInteraction | null {
  if (!n) return null;

  // Extraemos postId de varias formas posibles.
  const postIdRaw = n?.post?.id ?? n?.post_id ?? n?.postId ?? n?.postIdRaw ?? null;
  const postId = postIdRaw == null ? null : Number(postIdRaw);
  if (postId == null || Number.isNaN(postId) || postId <= 0) {
    // Si no hay postId no podemos mapear a PostInteraction orientado a post.
    return null;
  }

  // Tipo/acción
  const type = (n?.type ?? n?.action ?? "").toString();
  if (!isValidAction(type)) {
    return null;
  }
  const action = type as PostInteraction["action"];

  // Actor
  const actorPayload = n.actor ?? null;
  const actorId = actorPayload?.id ?? n?.actor_id ?? n?.actorId ?? null;
  const actor: ActorShape | null =
    actorId != null
      ? {
          id: Number(actorId),
          nombre:
            actorPayload?.nombre ??
            actorPayload?.name ??
            n?.actor_nombre ??
            null,
          apodo:
            actorPayload?.apodo ??
            actorPayload?.username ??
            n?.actor_apodo ??
            null,
          avatar: pickAvatarFromPayload(n) ?? null,
        }
      : null;

  // comment fields (normalizamos a primer nivel)
  const commentIdRaw = n?.comment?.id ?? n?.comment_id ?? n?.commentId ?? null;
  const commentId = commentIdRaw == null ? null : Number(commentIdRaw);
  const commentSnippet =
    n?.comment?.snippet ?? n?.comment_snippet ?? n?.commentSnippet ?? null;

  // read flag
  const readFlag = typeof n.read === "boolean" ? n.read : false;

  // timestamp
  const timestamp = (n?.created_at ?? n?.createdAt ?? n?.timestamp ?? null) as string | null;

  return {
    postId,
    action,
    actor,
    postSnippet: n?.post?.snippet ?? n?.post_snippet ?? n?.postSnippet ?? null,
    postImage: n?.post?.image ?? n?.post_image ?? n?.postImage ?? null,
    postAuthorName:
      n?.post?.authorName ?? n?.post_author_name ?? n?.postAuthorName ?? null,
    postAuthorApodo:
      n?.post?.authorApodo ??
      n?.post_author_apodo ??
      n?.postAuthorApodo ??
      null,
    timestamp,
    notificationId: n?.id ?? n?.notification?.id ?? null,
    source: undefined,
    persisted: undefined,
    read: readFlag,
    commentId: commentId ?? null,
    commentSnippet: commentSnippet ?? null,
  };
}