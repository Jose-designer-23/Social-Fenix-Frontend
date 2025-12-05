import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/features/auth/services/AuthContext";

import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

interface LikeCommentButtonProps {
  commentId: number;
  initialCount: number;
  initialLiked: boolean;
}

const LikeCommentButton: React.FC<LikeCommentButtonProps> = ({ commentId, initialCount, initialLiked }) => {
  const { user } = useAuth();

  const [count, setCount] = useState<number>(initialCount ?? 0);
  const [liked, setLiked] = useState<boolean>(initialLiked ?? false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setCount(initialCount ?? 0);
    setLiked(initialLiked ?? false);
  }, [initialCount, initialLiked]);

  const handleToggle = async () => {
    if (!user) {
      console.warn('Intento de like de comentario sin estar autenticado');
      return;
    }

    if (loading) return;

    const prevLiked = liked;
    const prevCount = count;
    const newLiked = !prevLiked;

    // Optimistic UI
    setLiked(newLiked);
    setCount(prevCount + (newLiked ? 1 : -1));
    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(
        `https://social-fenix-backend.onrender.com/like-comment/likes/${commentId}`, //http://localhost:3000/ Para desarrollo
        {},
        { headers }
      );

      const action = res.data?.action;
      if (action === 'liked') setLiked(true);
      else if (action === 'unliked') setLiked(false);

      if (typeof res.data?.likesCount === 'number') {
        setCount(res.data.likesCount);
      }
    } catch (err) {
      console.error('Error toggling comment like:', err);
      setLiked(prevLiked);
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
        onClick={handleToggle}
        className={`h-8 w-8 ${liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'} hover:scale-110 transition-transform`}
        aria-pressed={liked}
        disabled={loading}
        title={liked ? 'Quitar like' : 'Dar like'}
      >
        <Heart className="h-4 w-4" />
      </Button>

      <span className="text-sm select-none ml-2">{count}</span>
    </div>
  );
};

export default LikeCommentButton;