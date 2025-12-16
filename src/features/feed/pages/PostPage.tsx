import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import PostCard from "../components/PostCard";
import { FeedItem } from "../types/feed";
import type { CommentFromApi } from "../types/comment";
import CommentItem from "../components/CommentItem";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

// El tipo que se espera en la publicación
type ApiPostResponse = {
  id: number;
  contenido?: string | null;
  url_imagen?: string | null;
  fecha_creacion: string;
  fecha_actualizacion?: string | null;
  apodo: { id: number; apodo: string; nombre?: string, avatar: string | null };
  likesCount?: number;
  commentsCount?: number;
  repostsCount?: number;
  repostDate?: string | null;
  liked?: boolean;
  reposted?: boolean;
};

const buildTreeWithRepliesCount = (flat: CommentFromApi[]): CommentFromApi[] => {
  // Calculamos repliesCount (conteo de hijos directos)
  const repliesMap = new Map<number, number>();
  for (const c of flat) {
    const pid = (c.parentComment && (c.parentComment as any).id) ?? null;
    if (pid != null) {
      repliesMap.set(pid, (repliesMap.get(pid) ?? 0) + 1);
    }
  }

  //Creación de nodos iniciales añadiendo repliesCount (por seguridad no mutamos el original)
  const map = new Map<number, CommentFromApi & { children?: CommentFromApi[] }>();
  flat.forEach((c) => {
    const withCount: CommentFromApi = {
      ...c,
      repliesCount: repliesMap.get(c.id) ?? 0,
      children: [],
    };
    map.set(c.id, withCount);
  });

  // Construimos el árbol
  const roots: CommentFromApi[] = [];
  map.forEach((node) => {
    const parentId = (node.parentComment && (node.parentComment as any).id) ?? null;
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  // Orden (más recientes primero)
  const sortRec = (arr: CommentFromApi[]) => {
    arr.sort(
      (a, b) =>
        new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
    );
    arr.forEach((c) => {
      if (c.children && c.children.length) sortRec(c.children);
    });
  };
  sortRec(roots);

  return roots;
};

// Helper para insertar comentario optimistamente en el árbol local (cuando es respuesta)
function insertCommentIntoTree(tree: CommentFromApi[], parentId: number, newComment: CommentFromApi) {
  for (const node of tree) {
    if (node.id === parentId) {
      node.children = node.children ?? [];
      node.children.unshift(newComment);
      return true;
    }
    if (node.children && node.children.length) {
      const found = insertCommentIntoTree(node.children, parentId, newComment);
      if (found) return true;
    }
  }
  return false;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const PostPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<ApiPostResponse | null>(null);
  const [commentsTree, setCommentsTree] = useState<CommentFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Peticiones con headers para que el backend calcule liked/likesCount por usuario
      const [postRes, commentsRes] = await Promise.all([
        axios.get(`${API_BASE}/posts/${id}`, { headers }),
        axios.get(`${API_BASE}/comments/post/${id}`, { headers }),
      ]);

      const apiPost: ApiPostResponse =
        postRes.data && (postRes.data as any).post ? (postRes.data as any).post : postRes.data;

      setPost(apiPost);

      const flat: CommentFromApi[] = commentsRes?.data?.comments ?? [];
      const tree = buildTreeWithRepliesCount(flat);
      setCommentsTree(tree);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || err.message || t("PostPage.errorLoading"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  // Handler que recarga y/o inserta localmente y scrollea
  const handleReplyAndScroll = useCallback(
    async (newCommentOrId?: any) => {
      if (newCommentOrId && typeof newCommentOrId === "object" && newCommentOrId.id) {
        const newComment = newCommentOrId as CommentFromApi;
        const parentId = (newComment.parentComment && (newComment.parentComment as any).id) ?? null;

        if (parentId != null) {
          // Inserción local como respuesta (hijo)
          setCommentsTree((prev) => {
            const copy = JSON.parse(JSON.stringify(prev)) as CommentFromApi[];
            const inserted = insertCommentIntoTree(copy, parentId, newComment);
            if (!inserted) {
              fetchData();
              return prev;
            }
            setTimeout(() => {
              const el = document.getElementById(`comment-${newComment.id}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("ring-2", "ring-indigo-300");
                setTimeout(() => el.classList.remove("ring-2", "ring-indigo-300"), 2000);
              }
            }, 80);
            return copy;
          });
          return;
        } else {
          // Nuevo comentario raíz -> insertar al principio (más reciente primero)
          setCommentsTree((prev) => {
            const copy = JSON.parse(JSON.stringify(prev)) as CommentFromApi[];
            copy.unshift(newComment);
            setTimeout(() => {
              const el = document.getElementById(`comment-${newComment.id}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("ring-2", "ring-indigo-300");
                setTimeout(() => el.classList.remove("ring-2", "ring-indigo-300"), 2000);
              }
            }, 80);
            return copy;
          });
          return;
        }
      }

      if (typeof newCommentOrId === "number") {
        await fetchData();
        const newId = newCommentOrId as number;
        setTimeout(() => {
          const el = document.getElementById(`comment-${newId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-2", "ring-indigo-300");
            setTimeout(() => el.classList.remove("ring-2", "ring-indigo-300"), 2000);
          }
        }, 80);
        return;
      }

      await fetchData();
    },
    [fetchData]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const onCommentCreated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      handleReplyAndScroll(detail);
    };

    window.addEventListener("comment:created", onCommentCreated);
    return () => window.removeEventListener("comment:created", onCommentCreated);
  }, [handleReplyAndScroll]);

  if (loading) return <div className="p-8 text-center">{t("PostPage.loading")}</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!post) return <div className="p-8 text-center">{t("PostPage.postNotFound")}</div>;

  const author = {
    id: post.apodo?.id ?? -1,
    apodo: post.apodo?.apodo ?? "desconocido",
    nombre: post.apodo?.nombre ?? "",
    avatar: post.apodo?.avatar ?? null,
  };

  const feedPost: FeedItem = {
    id: post.id,
    contenido: post.contenido ?? "",
    url_imagen: post.url_imagen ?? null,
    fecha_creacion: post.fecha_creacion,
    fecha_actualizacion: post.fecha_actualizacion ?? post.fecha_creacion,
    apodo: author,
    type: "post",
    sortDate: post.repostDate ?? post.fecha_creacion,
    commentsCount: post.commentsCount ?? commentsTree.length,
    likesCount: post.likesCount ?? 0,
    repostsCount: post.repostsCount ?? 0,
    liked: Boolean((post as any).liked ?? false),
    reposted: Boolean((post as any).reposted ?? false),
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 ">
      <div className="mb-4">
        <Button variant="outline" className="bg-white Dark-boton cursor-pointer active:scale-95 active:shadow-inner active:opacity-90 transition-colors transform duration-300 font-bold" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2" />
          <p className="font-bold">{t("PostPage.back")}</p>
        </Button>
      </div>

      <div className="mb-6">
        <PostCard post={feedPost} clickable={false} />
      </div>

      <div className="space-y-4">
        {commentsTree.length === 0 ? (
          <div className="text-gray-500 p-4 bg-white rounded-lg">{t("PostPage.beFirstToReply")}</div>
        ) : (
          commentsTree.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={post.id}
              showReplies={false}
              onReplySuccess={handleReplyAndScroll}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default PostPage;