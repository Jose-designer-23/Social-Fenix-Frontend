import React from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Props {
  postId: number;
  commentId?: number | null;
  snippet?: string | null;
  authorName?: string | null;
  authorApodo?: string | null;
  avatar?: string | null;
  timestamp?: string | null;
  onClick?: (postId: number, commentId?: number | null) => void;
  className?: string;
}

const safeStopImmediatePropagation = (nativeEv?: Event | null) => {
  if (!nativeEv) return;
  const maybe = nativeEv as Event & { stopImmediatePropagation?: () => void };
  if (typeof maybe.stopImmediatePropagation === "function") maybe.stopImmediatePropagation();
};

const CommentPreview: React.FC<Props> = ({
  postId,
  commentId,
  snippet,
  authorName,
  authorApodo,
  avatar,
  timestamp,
  onClick,
  className = "",
}) => {
  const navigate = useNavigate();

  const handleNavigate = React.useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
        // detener listeners nativos/otros
        // @ts-ignore - nativeEvent exists on React synthetic events
        safeStopImmediatePropagation((e as any).nativeEvent as Event);
      }

      if (typeof onClick === "function") {
        onClick(postId, commentId ?? null);
        return;
      }

      if (commentId) {
        navigate(`/feed/post/${postId}/comment/${commentId}`);
      } else {
        navigate(`/feed/post/${postId}`);
      }
    },
    [navigate, onClick, postId, commentId]
  );

  return (
    <div
      className={`mt-2 p-3 bg-gray-50 rounded-md border cursor-pointer flex items-start gap-3 ${className}`}
      role="button"
      tabIndex={0}
      data-comment-snippet="true"
      onPointerDown={(e) => {
        // set stopImmediatePropagation before capture handlers run / to avoid parent clicks
        safeStopImmediatePropagation((e.nativeEvent as Event) ?? null);
      }}
      onClick={(e) => handleNavigate(e)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleNavigate(e);
        }
      }}
      aria-label={authorName || authorApodo ? `${authorName ?? authorApodo} comentario` : "Comentario"}
    >
      <div className="w-10 h-10 shrink-0">
        {avatar ? (
          <Avatar className="h-10 w-10 border">
            <img src={avatar} alt={authorApodo ?? authorName ?? "Usuario"} className="w-full h-full object-cover rounded-full" onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.display = "none"; }} />
            <AvatarFallback>{(authorApodo || authorName || "U")[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">
            {(authorApodo || authorName || "U")[0]?.toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium truncate">
            {authorName ?? authorApodo ?? "Usuario"}
          </div>
          {timestamp ? (
            <div className="ml-2 text-xs text-gray-400 whitespace-nowrap">
              <time dateTime={timestamp}>{new Date(timestamp).toLocaleString()}</time>
            </div>
          ) : null}
        </div>

        <div className="text-sm text-gray-800 mt-1 line-clamp-3 wrap-break-words">
          {snippet ?? "—"}
        </div>
      </div>
    </div>
  );
};

export default CommentPreview;