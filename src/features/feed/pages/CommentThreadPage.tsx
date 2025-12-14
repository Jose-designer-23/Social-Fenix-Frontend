import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CommentItem from "../components/CommentItem";
import type { CommentFromApi } from "../types/comment";
import { useAuth } from "@/features/auth/services/AuthContext";
import { toast } from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/**
 * Página dedicada para mostrar un comentario y su hilo.
 * Ruta: /feed/post/:postId/comment/:commentId
 */
const CommentThreadPage: React.FC = () => {
  const { postId, commentId } = useParams<{
    postId: string;
    commentId: string;
  }>();
  const navigate = useNavigate();
  const [thread, setThread] = useState<CommentFromApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fetchThread: Cargamos el comentario raíz con su árbol de replies
  const fetchThread = useCallback(
    async (idToFetch?: string | number) => {
      const cid = idToFetch ?? commentId;
      if (!cid) return;
      setLoading(true);
      setError(null);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("authToken")
            : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_BASE}/comments/${cid}`, { headers });
        const raw = res.data?.comment ?? res.data;

        // Normalizamos el nodo (convertir replies -> children, calcular repliesCount, aplicar recursivamente)
        const normalizeNode = (node: any): CommentFromApi => {
          if (!node || typeof node !== "object") return node;
          // Preferimos children, si no existen usamos replies (algún endpoint usa replies)
          const children = Array.isArray(node.children)
            ? node.children
            : Array.isArray(node.replies)
            ? node.replies
            : [];
        // Normalizamos cada hijo recursivamente
          const normalizedChildren = children.map((ch: any) =>
            normalizeNode(ch)
          );
          const normalized: CommentFromApi = {
            ...node,
            children: normalizedChildren,
            // repliesCount preferida si ya existe, si no usamos length de children
            repliesCount:
              typeof node.repliesCount === "number"
                ? node.repliesCount
                : normalizedChildren.length,
          };
          // Aseguramos que autor puede contener avatar (ya lo hace backend normalmente)
          if (normalized.autor && typeof normalized.autor === "object") {
            // no mutamos propiedades no necesarias; dejamos avatar si viene
          }
          return normalized;
        };

        const normalizedRoot = normalizeNode(raw) as CommentFromApi;
        setThread(normalizedRoot);
      } catch (err: any) {
        console.error("Error cargando hilo:", err);
        setError(
          err?.response?.data?.message ||
            err.message ||
            "Error al cargar el hilo"
        );
        setThread(null);
      } finally {
        setLoading(false);
      }
    },
    [commentId]
  );

  // Insert (Para insertar replies optimísticamente)
  const insertReplyRecursively = (
    node: CommentFromApi,
    parentId: number,
    newComment: CommentFromApi
  ): boolean => {
    if (!node) return false;
    node.children = node.children ?? node.replies ?? [];
    if (node.id === parentId) {
      node.children.unshift({
        ...newComment,
        children: newComment.children ?? [],
      });
      // Ajustamos repliesCount si existe
      if (typeof node.repliesCount === "number") node.repliesCount += 1;
      return true;
    }
    const children = node.children ?? [];
    for (const ch of children) {
      const ok = insertReplyRecursively(
        ch as CommentFromApi,
        parentId,
        newComment
      );
      if (ok) {
        // Si hemos insertado en un descendiente, aumentar repliesCount del nodo actual opcionalmente
        if (typeof node.repliesCount === "number") node.repliesCount += 1;
        return true;
      }
    }
    return false;
  };

  // Remove helper: Eliminamos recursivamente el nodo con id `targetId`.
  // Retorna true si se realizó la eliminación (y ajusta repliesCount del padre).
  const removeCommentRecursively = (
    node: CommentFromApi,
    targetId: number
  ): boolean => {
    if (!node) return false;
    node.children = node.children ?? node.replies ?? [];
    const idx = node.children.findIndex((c) => c.id === targetId);
    if (idx !== -1) {
      node.children.splice(idx, 1);
      if (typeof node.repliesCount === "number" && node.repliesCount > 0)
        node.repliesCount -= 1;
      return true;
    }
    for (const ch of node.children) {
      const removed = removeCommentRecursively(ch as CommentFromApi, targetId);
      if (removed) {
        // Si eliminamos en un descendiente, opcionalmente ajustamos repliesCount del nodo actual
        if (typeof node.repliesCount === "number" && node.repliesCount > 0)
          node.repliesCount -= 1;
        return true;
      }
    }
    return false;
  };

  /**
   * HANDLE: cuando se crea una nueva respuesta en el hilo.
   * - Insertamos optimistamente si se recibe el objeto comment.
   * - Si se recibe solo un id, recarga el hilo y scrollea al id.
   */
  const handleNewReply = useCallback(
    async (newCommentOrId?: any) => {
      try {
        if (typeof newCommentOrId === "number") {
          await fetchThread(newCommentOrId);
          setTimeout(() => {
            const el = document.getElementById(`comment-${newCommentOrId}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("ring-2", "ring-indigo-300");
              setTimeout(
                () => el.classList.remove("ring-2", "ring-indigo-300"),
                2000
              );
            }
          }, 100);
          return;
        }

        const raw = newCommentOrId;
        const newComment =
          raw && ((raw.comment ?? raw) as CommentFromApi | null);
        if (!newComment || !newComment.id) {
          await fetchThread();
          return;
        }

        const parentId =
          (newComment.parentComment && (newComment.parentComment as any).id) ??
          null;
        if (!parentId) {
          await fetchThread();
          setTimeout(() => {
            const el = document.getElementById(`comment-${newComment.id}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("ring-2", "ring-indigo-300");
              setTimeout(
                () => el.classList.remove("ring-2", "ring-indigo-300"),
                2000
              );
            }
          }, 100);
          return;
        }

        if (!thread) {
          await fetchThread();
          return;
        }

        const copy = JSON.parse(JSON.stringify(thread)) as CommentFromApi;
        const inserted = insertReplyRecursively(
          copy,
          parentId as number,
          newComment
        );
        if (!inserted) {
          await fetchThread();
          return;
        }
        setThread(copy);
        setTimeout(() => {
          const el = document.getElementById(`comment-${newComment.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-2", "ring-indigo-300");
            setTimeout(
              () => el.classList.remove("ring-2", "ring-indigo-300"),
              2000
            );
          }
        }, 80);
      } catch (err) {
        console.error("[handleNewReply] error:", err);
        await fetchThread();
      }
    },
    [fetchThread, thread]
  );

  /**
   * HANDLE: Cuando borramos un comentario dentro del hilo.
   * - Si el id borrado es el comentario raíz del hilo: navegamos (volvemos al post).
   * - Si es un hijo: lo eliminamos del árbol `thread` en memoria y actualizamos state.
   */
  const handleDeleted = useCallback(
    async (deletedId: number) => {
      try {
        if (!thread) {
          // Si no hay thread en memoria, recargamos la vista principal
          await fetchThread();
          return;
        }

        // Si borraron el comentario raíz (el que estamos viendo), salimos del hilo
        if (thread.id === deletedId) {
          toast.success("Comentario eliminado. Volviendo a la publicación...");
          // Navegamos a la página del post. Si no tienes ruta, usa navigate(-1).
          if (postId) navigate(`/feed/post/${postId}`);
          else navigate(-1);
          return;
        }

        // Si es un hijo, eliminamos recursivamente y actualizamos estado
        const copy = JSON.parse(JSON.stringify(thread)) as CommentFromApi;
        const removed = removeCommentRecursively(copy, deletedId);
        if (!removed) {
          // Si no lo encontramos, recargamos el hilo desde servidor por seguridad
          console.warn(
            "[handleDeleted] no se encontró el id en el árbol local, recargando hilo"
          );
          await fetchThread();
          return;
        }
        setThread(copy);
        toast.success("Comentario eliminado correctamente.");
      } catch (err) {
        console.error("[handleDeleted] error:", err);
        // fallback: recargar hilo
        await fetchThread();
      }
    },
    [fetchThread, thread, navigate, postId]
  );

 // Cargamos hilo al montar / cuando cambia commentId
  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  // Renders
  if (loading) return <div className="p-8 text-center">Cargando hilo...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!thread)
    return <div className="p-8 text-center">Hilo no encontrado.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-4">
        <Button
          variant="outline"
          className="bg-white Dark-boton"
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2" />
          <p className="active:scale-95 active:shadow-inner active:opacity-90 transition-colors transform duration-300 cursor-pointer font-bold">
            Volver
          </p>
        </Button>
      </div>

      <div className="mb-6">
        {/* Renderizamos el comentario raíz con sus replies; reutiliza CommentItem */}
        <CommentItem
          comment={thread}
          postId={Number(postId ?? thread?.post?.id ?? -1)}
          showReplies={true}
          remainingDepth={1}
          onReplySuccess={handleNewReply} // Para nuevas replies
          onDeleted={handleDeleted} // Para borrar dentro del hilo
        />
      </div>
    </div>
  );
};

export default CommentThreadPage;
