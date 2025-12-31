import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import PostCard from "../components/PostCard";
import { useAuth } from "@/features/auth/services/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Terminal, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

// Página para mostrar resultados de búsqueda de publicaciones

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const DEFAULT_LIMIT = 100;

const SearchPostPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const navigate = useNavigate();
  const { isLoading: isAuthLoading, getToken } = useAuth();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    const trimmed = String(query ?? "").trim();
    if (!trimmed || trimmed.length < 2) {
      setPosts([]);
      setTotal(0);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = getToken?.();
      const url = `${API_BASE.replace(/\/+$/, "")}/posts/search/simple`;
      const res = await axios.get(url, {
        params: { q: trimmed, limit: DEFAULT_LIMIT },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      // Respuesta esperada: { message, posts, total }
      const payload = res.data ?? {};
      const fetched = Array.isArray(payload.posts)
        ? payload.posts
        : Array.isArray(payload.data)
        ? payload.data
        : [];

      setPosts(fetched);
      setTotal(typeof payload.total === "number" ? payload.total : fetched.length);
    } catch (err: any) {
      console.error("Error buscando posts:", err);
      let msg = t("SearchPage.unknownError", "Unknown error while searching.");
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.message ?? err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      setPosts([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [query, getToken, t]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleBack = () => {
    navigate("/feed");
  };

  // Normalizar posts a la forma que espera PostCard (si hace falta)
  const normalizePost = (p: any) => {
    // El PostCard acepta FeedItem shape; muchos campos ya vienen desde backend.
    return {
      ...p,
      // asegurar strings en fechas
      fecha_creacion: p.fecha_creacion ?? p.createdAt ?? new Date().toISOString(),
      fecha_actualizacion: p.fecha_actualizacion ?? p.updatedAt ?? new Date().toISOString(),
      // apodo / author shape
      apodo: p.apodo ?? p.author ?? null,
      // counts/flags
      likesCount: Number(p.likesCount ?? p.likes ?? 0),
      liked: Boolean(p.liked ?? p.liked_by_user ?? false),
      repostsCount: Number(p.repostsCount ?? p.reposts ?? 0),
      reposted: Boolean(p.reposted ?? p.reposted_by_user ?? false),
      commentsCount: Number(p.commentsCount ?? p.commentCount ?? 0),
      type: p.type ?? "post",
    };
  };

  return (
    <div className="space-y-6 border-t border-gray-200 rounded-2xl">
      <div className="flex items-center justify-between rounded-2xl bg-white/30 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label={t("SearchPage.backAria")}
            className="h-9 w-9 rounded-full Dark-boton-buscar Dark-outline cursor-pointer active:scale-95 active:shadow-inner active:opacity-90 transition transform duration-150"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <h2 className="text-lg font-bold">
            {query ? (
              <>
                {t("SearchPage.headingPrefix")}{" "}
                <span className="font-bold text-green-900 Dark-texto-buscar">"{query}"</span>
              </>
            ) : (
              t("SearchPage.title")
            )}
          </h2>
        </div>

        <div className="text-sm text-black font-bold Dark-texto-blanco pr-3">
          {isLoading ? null : total !== null ? t("SearchPage.resultsCount", { count: total }) : null}
        </div>
      </div>

      <div>
        {isAuthLoading || isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>{t("SearchPage.errorTitle")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : posts.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-700">{t("SearchPage.noResultsTitle")}</h3>
            <p className="mt-2 text-gray-500">{t("SearchPage.noResultsDesc")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((p: any) => (
              <PostCard key={`post-${p.id}`} post={normalizePost(p)} />
            ))}

          </div>
        )}
      </div>
    </div>
  );
};
export default SearchPostPage;