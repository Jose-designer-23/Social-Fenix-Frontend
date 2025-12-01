import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import PostCard from "../components/PostCard";
import { useAuth } from "@/features/auth/services/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { FeedItem } from "../types/feed";
import CreatePostArea from "../components/CreatePostArea";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const PAGE_SIZE = 20;

export default function FeedPage() {
  const { user, isLoading: isAuthLoading, getToken } = useAuth();

  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [isLoadingMore, setIsLoadingMore] = useState(false); 
  const [error, setError] = useState<string | null>(null);

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false); 

  // Normalizamos posts recibidos del backend
  const normalizePosts = (fetchedPosts: any[]): FeedItem[] =>
    fetchedPosts.map((p: any) => ({
      ...p,
      likesCount: Number(p.likesCount ?? p.likes ?? 0),
      liked: Boolean(p.liked ?? p.liked_by_user ?? p.likedByUser ?? false),
      repostsCount: Number(p.repostsCount ?? p.reposts ?? 0),
      reposted: Boolean(p.reposted ?? p.reposted_by_user ?? p.isRepost ?? false),
      commentsCount: Number(p.commentsCount ?? p.commentCount ?? 0),
    }));

  // Función de búsqueda: Si el cursor === null -> primera página, de lo contrario página siguiente
  const fetchPosts = useCallback(
    async (userId: number, token: string, cursor: string | null = null, replace = false) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      if (!cursor) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const url = `${API_BASE}/posts/feed/${userId}`;
        const params: Record<string, string | number> = { limit: PAGE_SIZE };
        if (cursor) params.cursor = cursor;

        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });

        // API puede devolver { data, nextCursor, hasMore } o directamente an array (compat)
        const payload = res.data ?? {};
        const fetchedRaw: any[] = Array.isArray(payload) ? payload : payload.data ?? [];
        const fetched = normalizePosts(fetchedRaw);

        setPosts((prev) => {
          if (replace) return fetched;
          // evitar duplicados por id+type
          const existingKeys = new Set(prev.map((p) => `${p.type}-${p.id}`));
          const toAdd = fetched.filter((p) => !existingKeys.has(`${p.type}-${p.id}`));
          return [...prev, ...toAdd];
        });

        // Actualizamos cursor/hasMore según respuesta
        const newNextCursor = payload.nextCursor ?? null;
        const newHasMore = typeof payload.hasMore === "boolean" ? payload.hasMore : fetched.length === PAGE_SIZE;

        setNextCursor(newNextCursor);
        setHasMore(newHasMore);
      } catch (err) {
        console.error("Error al obtener el feed:", err);
        let errorMessage = "Error desconocido al cargar las publicaciones.";
        if (axios.isAxiosError(err)) {
          errorMessage = err.response?.data?.message || err.message;
          if (err.response?.status === 401 || err.response?.status === 403) {
            setError("Sesión expirada o no autorizado. Redirigiendo...");
            return;
          }
        }
        setError(`Error al cargar el feed: ${errorMessage}`);
      } finally {
        if (!cursor) setIsLoading(false);
        else setIsLoadingMore(false);
        fetchingRef.current = false;
      }
    },
    []
  );

  // Carga inicial y cuando la autenticación está lista
  useEffect(() => {
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }
    const token = getToken();
    if (user && user.id && token) {
      // first page: no cursor, replace list
      fetchPosts(user.id, token, null, true);
    } else if (!user && !isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthLoading, user, getToken, fetchPosts]);

 // Escuchar la creación/eliminación de publicaciones -> actualizar la primera página
  useEffect(() => {
    const handlePostCreated = () => {
      const token = getToken();
      if (user && user.id && token) {
        // reload first page
        fetchPosts(user.id, token, null, true);
      }
    };
    const handlePostDeleted = () => {
      const token = getToken();
      if (user && user.id && token) {
        fetchPosts(user.id, token, null, true);
      }
    };
    window.addEventListener("post:created", handlePostCreated);
    window.addEventListener("post:deleted", handlePostDeleted);
    return () => {
      window.removeEventListener("post:created", handlePostCreated);
      window.removeEventListener("post:deleted", handlePostDeleted);
    };
  }, [user, fetchPosts, getToken]);

  // IntersectionObserver para desplazamiento infinito: pregunta a la página siguiente cuando el centinela es visible
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const ent = entries[0];
        if (ent.isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          const token = getToken();
          if (user && user.id && token) {
            fetchPosts(user.id, token, nextCursor, false);
          }
        }
      },
      { root: null, rootMargin: "300px", threshold: 0.1 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, nextCursor, user, getToken, fetchPosts]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>Sesión no encontrada. Esperando redirección...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error al Cargar el Feed</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 border-t border-gray-200 rounded-2xl">
      <div className="mb-4">
        <CreatePostArea user={user} />
      </div>

      {posts.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-xl">
          <h2 className="text-xl font-bold text-gray-700">¡Bienvenido a SocialFénix!</h2>
          <p className="mt-2 text-gray-500">
            Parece que aún no hay publicaciones en tu feed. Sigue a más gente o crea tu primera publicación.
          </p>
        </div>
      ) : (
        <>
          {posts.map((item) => (
            <PostCard
              key={`${item.type}-${item.id}-${item.repostDate ?? item.sortDate ?? ""}`}
              post={item}
            />
          ))}

          {/* Centinela para desplazamiento infinito */}
          <div ref={sentinelRef} className="h-12 flex items-center justify-center">
            {isLoadingMore ? (
              <div className="space-y-2">
                <Skeleton className="h-24 w-full rounded-xl" />
                <div className="text-sm text-gray-500 text-center">Cargando más…</div>
              </div>
            ) : !hasMore ? (
              <div className="text-sm text-gray-400">No hay más publicaciones</div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}