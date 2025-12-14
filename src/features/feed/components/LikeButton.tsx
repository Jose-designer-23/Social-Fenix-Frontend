import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/features/auth/services/AuthContext";
import { emitPostInteraction } from "./EmitNotification";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

interface LikeButtonProps {
  postId: number;
  initialCount: number;
  initialLiked: boolean;
  postSnippet?: string | null;
  postImageUrl?: string | null;
  postAuthorName?: string | null;
  postAuthorApodo?: string | null;
  onOpenReactions?: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const LikeButton: React.FC<LikeButtonProps> = ({
  postId,
  initialCount,
  initialLiked,
  postSnippet = null,
  postImageUrl = null,
  postAuthorName = null,
  postAuthorApodo = null,
  onOpenReactions,
}) => {
  const { user, getToken } = useAuth();
  const [count, setCount] = useState<number>(initialCount ?? 0);
  const [liked, setLiked] = useState<boolean>(initialLiked ?? false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setCount(initialCount ?? 0);
    setLiked(initialLiked ?? false);
  }, [initialCount, initialLiked]);

  const handleToggle = async () => {
    if (!user) {
      console.warn("Intento de like sin estar autenticado");
      return;
    }
    if (loading) return;

    const prevLiked = liked;
    const prevCount = count;
    const newLiked = !prevLiked;

    // UI optimista
    setLiked(newLiked);
    setCount(prevCount + (newLiked ? 1 : -1));
    setLoading(true);

    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(
        `${API_BASE}/likes/${postId}`,
        {},
        { headers }
      );

      // El backend devuelve action y, opcionalmente, notificationId o notification object
      const action = res.data?.action;
      const notificationId = res.data?.notificationId ?? res.data?.notification?.id ?? null;

      if (action === "liked") {
        setLiked(true);
        // Emitimos evento centralizado incluyendo notificationId si existe
        emitPostInteraction({
          postId,
          action: "like",
          actor: {
            id: Number(user.id),
            nombre: user.nombre,
            apodo: user.apodo,
            avatar: user.avatar ?? null,
          },
          postSnippet: postSnippet ?? null,
          postImage: postImageUrl ?? null,
          postAuthorName: postAuthorName ?? null,
          postAuthorApodo: postAuthorApodo ?? null,
          timestamp: new Date().toISOString(),
          notificationId: typeof notificationId === "number" ? Number(notificationId) : null,
        });
      } else if (action === "unliked") {
        setLiked(false);
        emitPostInteraction({
          postId,
          action: "unlike",
          actor: {
            id: Number(user.id),
            nombre: user.nombre,
            apodo: user.apodo,
            avatar: user.avatar ?? null,
          },
          postSnippet: postSnippet ?? null,
          postImage: postImageUrl ?? null,
          timestamp: new Date().toISOString(),
          notificationId: typeof notificationId === "number" ? Number(notificationId) : null,
        });
      }

      if (typeof res.data?.likesCount === "number") {
        setCount(res.data.likesCount);
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      // Revertir optimista
      setLiked(prevLiked);
      setCount(prevCount);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center transition-colors ">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          handleToggle();
        }}
        className={`h-9 w-9 Dark-Hover-Interacciones cursor-pointer z-10 ${liked ? "text-red-500" : "text-gray-500  hover:text-red-500"} hover:scale-110 transition-transform`}
        aria-pressed={liked}
        disabled={loading}
        title={liked ? "Quitar like" : "Dar like"}
      >
        <Heart className="h-5 w-5" />
      </Button>

            {/* Contador clickable sólo si onOpenReactions está definido */}
      {onOpenReactions ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenReactions();
          }}
          className="text-sm select-none ml-1 cursor-pointer Dark-texto-blanco text-gray-600 hover:underline"
          aria-label="Ver quien dio like"
          type="button"
        >
          {count}
        </button>
      ) : (
        <span className="text-sm select-none ml-1">{count}</span>
      )}
    </div>
  );
};

export default LikeButton;