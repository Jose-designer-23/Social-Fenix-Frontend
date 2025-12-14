import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/features/auth/services/AuthContext";
import { emitPostInteraction } from "./EmitNotification";
import { Button } from "@/components/ui/button";
import { Repeat2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface RepostButtonProps {
  postId: number;
  initialCount: number;
  initialReposted: boolean;
  postSnippet?: string | null;
  postImageUrl?: string | null;
  postAuthorName?: string | null;
  postAuthorApodo?: string | null;
  onOpenReactions?: () => void;
}

const RepostButton: React.FC<RepostButtonProps> = ({
  postId,
  initialCount,
  initialReposted,
  postSnippet = null,
  postImageUrl = null,
  postAuthorName = null,
  postAuthorApodo = null,
  onOpenReactions,
}) => {
  const { user, getToken } = useAuth();
  const [count, setCount] = useState<number>(initialCount ?? 0);
  const [reposted, setReposted] = useState<boolean>(initialReposted ?? false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setCount(initialCount ?? 0);
    setReposted(initialReposted ?? false);
  }, [initialCount, initialReposted]);

  const handleToggle = async () => {
    if (!user) {
      console.warn("Intento de repost sin estar autenticado");
      return;
    }
    if (loading) return;

    const prevReposted = reposted;
    const prevCount = count;
    const newReposted = !prevReposted;

    setReposted(newReposted);
    setCount(prevCount + (newReposted ? 1 : -1));
    setLoading(true);

    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(`${API_BASE}/reposts/${postId}`, {}, { headers });

      const action = res.data?.action;
      const notificationId = res.data?.notificationId ?? res.data?.notification?.id ?? null;

      if (action === "reposted") {
        setReposted(true);
        emitPostInteraction({
          postId,
          action: "repost",
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
      } else if (action === "unreposted") {
        setReposted(false);
        emitPostInteraction({
          postId,
          action: "unrepost",
          actor: {
            id: Number(user.id),
            nombre: user.nombre,
            apodo: user.apodo,
            avatar: user.avatar ?? null,
          },
          postSnippet,
          timestamp: new Date().toISOString(),
          notificationId: typeof notificationId === "number" ? Number(notificationId) : null,
        });
      }

      if (typeof res.data?.repostsCount === "number") {
        setCount(res.data.repostsCount);
      }
    } catch (err) {
      console.error("Error toggling repost:", err);
      setReposted(prevReposted);
      setCount(prevCount);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center transition-colors">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          handleToggle();
        }}
        className={`h-9 w-9 Dark-Hover-Interacciones cursor-pointer ${reposted ? "text-green-500" : "text-gray-500 hover:text-green-500"} hover:scale-110 transition-transform`}
        aria-pressed={reposted}
        disabled={loading}
        title={reposted ? "Quitar repost" : "Repostear"}
      >
        <Repeat2 className="h-5 w-5" />
      </Button>

      {onOpenReactions ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenReactions();
          }}
          className="text-sm select-none ml-1 cursor-pointer Dark-texto-blanco text-gray-600 hover:underline"
          aria-label="Ver quien republicó"
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

export default RepostButton;