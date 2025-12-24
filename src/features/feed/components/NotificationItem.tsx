import React from "react";
import { useNavigate } from "react-router-dom";
import type { PostInteraction } from "@/utils/notification-mapper";
import PostPreview from "./PostPreview";

interface Props {
  interaction: PostInteraction;
  onMarkRead?: (notificationId?: number | null) => void;
}

const NotificationItem: React.FC<Props> = ({ interaction, onMarkRead }) => {
  const navigate = useNavigate();

  const actorName = interaction.actor?.nombre ?? interaction.actor?.apodo ?? "Alguien";
  const snippet = interaction.commentSnippet ?? interaction.postSnippet ?? "";

  const handleClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (onMarkRead) onMarkRead(interaction.notificationId ?? null);

    const postId = interaction.postId;
    const commentId = interaction.commentId;

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
    <div
      onClick={handleClick}
      className={`p-3 rounded-md cursor-pointer bg-white hover:bg-gray-50 border ${
        interaction.read ? "" : "ring-1 ring-indigo-200"
      }`}
      role="button"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {actorName}{" "}
                {interaction.action === "comment"
                  ? "comentó en tu publicación"
                  : interaction.action}
              </div>
              <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                {snippet ?? "—"}
              </div>
            </div>
            <div className="text-xs text-gray-400 ml-3">
              {interaction.timestamp ? new Date(interaction.timestamp).toLocaleString() : ""}
            </div>
          </div>

          {interaction.postSnippet && (
            <div className="mt-3">
              {/* Pasamos una función simple sin parámetros; PostPreview usará la navegación del padre */}
              <PostPreview
                postId={interaction.postId}
                snippet={interaction.postSnippet}
                imageUrl={interaction.postImage ?? undefined}
                authorName={interaction.postAuthorName ?? undefined}
                authorApodo={interaction.postAuthorApodo ?? undefined}
                onClick={() => {
                  // reutilizamos la misma navegación: si hay commentId vamos al hilo, sino al post
                  if (interaction.commentId && interaction.postId) {
                    navigate(`/feed/post/${interaction.postId}/comment/${interaction.commentId}`);
                  } else if (interaction.postId) {
                    navigate(`/feed/post/${interaction.postId}`);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;