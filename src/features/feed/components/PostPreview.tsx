import React from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  postId: number;
  snippet?: string | null;
  imageUrl?: string | null;
  authorName?: string | null;
  authorApodo?: string | null;
  onClick?: (postId: number) => void;
}

const PostPreview: React.FC<Props> = ({ postId, snippet, imageUrl, authorName, authorApodo, onClick }) => {
  const navigate = useNavigate();
  const handleClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onClick) return onClick(postId);
    navigate(`/feed/post/${postId}`);
  };

  return (
    <div
      className="mt-3 p-3 Dark-Card rounded-md border-2 border-gray-300/60 bg-white hover:bg-gray-50 cursor-pointer flex gap-3 items-start"
      onClick={handleClick}
      role="button"
      aria-label="Ver publicación relacionada"
    >
      {imageUrl ? (
        <div className="w-16 h-16 shrink-0 overflow-hidden rounded-md bg-gray-50">
          <img
            src={imageUrl}
            alt="preview"
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      ) : (
        <div className="w-16 h-16 shrink-0 rounded-md bg-gray-50 border flex items-center justify-center text-xs text-gray-400">
          tx
        </div>
      )}

      <div className="flex-1 min-w-0 ">
        {authorName || authorApodo ? (
          <div className="text-sm font-medium Dark-texto-blanco text-gray-900 truncate">
            {authorName ?? authorApodo}
          </div>
        ) : null}
        <div className="text-sm Dark-previsual-post text-gray-600 mt-1 line-clamp-3 wrap-break-words">
          {snippet ?? "—"}
        </div>
      </div>
    </div>
  );
};

export default PostPreview;