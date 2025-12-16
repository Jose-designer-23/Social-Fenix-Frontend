import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CommentItem from "../components/CommentItem";
import type { CommentFromApi } from "../types/comment";
import { useAuth } from "@/features/auth/services/AuthContext";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/**
 * Página dedicada para mostrar un comentario y su hilo.
 * Ruta: /feed/post/:postId/comment/:commentId
 */
const CommentThreadPage: React.FC = () => {
  const { t } = useTranslation();
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
          const children = Array.isArray(node.children)
            ? node.children
            : Array.isArray(node.replies)
            ? node.replies
            : [];
          const normalizedChildren = children.map((ch: any) =>
            normalizeNode(ch)
          );
          const normalized: CommentFromApi = {
            ...node,
            children: normalizedChildren,
            repliesCount:
              typeof node.repliesCount === "number"
                ? node.repliesCount
                : normalizedChildren.length,
          };
          return normalized;
        };

        const normalizedRoot = normalizeNode(raw) as CommentFromApi;
        setThread(normalizedRoot);
      } catch (err: any) {
        console.error("Error cargando hilo:", err);
        setError(
          err?.response?.data?.message ||
            err.message ||
            t("CommentThreadPage.errorLoading")
        );
        setThread(null);
      } finally {
        setLoading(false);
      }
    },
    [commentId, t]
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
        if (typeof node.repliesCount === "number") node.repliesCount += 1;
        return true;
      }
    }
    return false;
  };

  // Remove helper: Eliminamos recursivamente el nodo con id `targetId`.
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
        if (typeof node.repliesCount === "number" && node.repliesCount > 0)
          node.repliesCount -= 1;
        return true;
      }
    }
    return false;
  };

  /**
   * HANDLE: cuando se crea una nueva respuesta en el hilo.
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
   */
  const handleDeleted = useCallback(
    async (deletedId: number) => {
      try {
        if (!thread) {
          await fetchThread();
          return;
        }

        // Si borraron el comentario raíz (el que estamos viendo), salimos del hilo
        if (thread.id === deletedId) {
          toast.success(t("CommentThreadPage.deletedAndReturning"));
          if (postId) navigate(`/feed/post/${postId}`);
          else navigate(-1);
          return;
        }

        // Si es un hijo, eliminamos recursivamente y actualizamos estado
        const copy = JSON.parse(JSON.stringify(thread)) as CommentFromApi;
        const removed = removeCommentRecursively(copy, deletedId);
        if (!removed) {
          console.warn(
            "[handleDeleted] no se encontró el id en el árbol local, recargando hilo"
          );
          await fetchThread();
          return;
        }
        setThread(copy);
        toast.success(t("CommentThreadPage.deletedOk"));
      } catch (err) {
        console.error("[handleDeleted] error:", err);
        await fetchThread();
      }
    },
    [fetchThread, thread, navigate, postId, t]
  );

  // Cargamos hilo al montar / cuando cambia commentId
  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  // Event listener para replies creadas en otros módulos
  useEffect(() => {
    const onCommentCreated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      handleNewReply(detail);
    };

    window.addEventListener("comment:created", onCommentCreated);
    return () => window.removeEventListener("comment:created", onCommentCreated);
  }, [handleNewReply]);

  // Renders
  if (loading) return <div className="p-8 text-center">{t("CommentThreadPage.loading")}</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!thread)
    return <div className="p-8 text-center">{t("CommentThreadPage.threadNotFound")}</div>;

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
            {t("CommentThreadPage.back")}
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