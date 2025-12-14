import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/services/AuthContext";
import { Button } from "@/components/ui/button";
import Avatar from "../../user-profile/components/Avatar";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface AuthorItem {
  id?: number;
  nombre?: string | null;
  apodo?: string | null;
  avatar?: string | null;
  // aliases por si vienen con otro nombre
  avatar_url?: string | null;
  profile_picture?: string | null;
  picture?: string | null;
  image?: string | null;
  url?: string | null;
}

interface ReactionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
  type: "likes" | "reposts";
  scrollThreshold?: number;
  // Datos del propietario del post para ocultar el botón de follow cuando el owner aparece en la lista
  ownerApodo?: string | null;
  ownerId?: number | null;
}

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  ""
);

/** Helpers locales (reutiliza tus utilidades si las tienes) */
function extractAvatarFromAuthor(author?: any): string | null {
  if (!author || typeof author !== "object") return null;
  const keys = ["avatar", "avatar_url", "profile_picture", "picture", "image", "url"];
  for (const k of keys) {
    const v = author[k];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return null;
}

function initialFromAuthor(author?: any): string {
  if (!author || typeof author !== "object") return "U";
  const apodo = typeof author.apodo === "string" && author.apodo.trim() ? author.apodo.trim()[0] : undefined;
  const nombre = typeof author.nombre === "string" && author.nombre.trim() ? author.nombre.trim()[0] : undefined;
  const ch = apodo ?? nombre ?? "U";
  return String(ch).toUpperCase();
}

/**
 * Normaliza respuestas variadas del backend a AuthorItem parcial.
 */
function normalizeRawAuthor(a: any): AuthorItem {
  if (!a) return {};
  const userCandidates = [
    a.user,
    a.autor,
    a.actor,
    a.usuario,
    a.profile,
    a.author,
    a.owner,
    a.autor?.user,
    a.user?.user,
    a,
  ].filter(Boolean);

  let chosen: any = userCandidates[0];

  for (const c of userCandidates) {
    if (c && typeof c === "object") {
      if (c.apodo || c.nombre || c.id || c.avatar || c.usuario_id) {
        chosen = c;
        break;
      }
    }
  }

  const idRaw = chosen?.id ?? chosen?.usuario_id ?? chosen?.userId ?? chosen?.author_id ?? a?.usuario_id ?? a?.userId ?? a?.author_id;
  const id = Number(idRaw) || undefined;

  const apodo =
    chosen?.apodo ??
    chosen?.username ??
    chosen?.handle ??
    chosen?.nick ??
    a?.apodo ??
    a?.username ??
    a?.handle ??
    null;

  const nombre =
    chosen?.nombre ??
    chosen?.name ??
    chosen?.displayName ??
    a?.nombre ??
    a?.name ??
    null;

  const avatar = extractAvatarFromAuthor(chosen) ?? extractAvatarFromAuthor(a) ?? null;

  return {
    id,
    apodo: typeof apodo === "string" && apodo.trim() ? apodo.trim() : null,
    nombre: typeof nombre === "string" && nombre.trim() ? nombre.trim() : null,
    avatar,
  };
}

const ReactionListModal: React.FC<ReactionListModalProps> = ({
  isOpen,
  onClose,
  postId,
  type,
  scrollThreshold = 8,
  ownerApodo = null,
  ownerId = null,
}) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<AuthorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [myFollowingsSet, setMyFollowingsSet] = useState<Set<string>>(new Set());
  const [savingApodo, setSavingApodo] = useState<string | null>(null);

  // cache simple para evitar pedir el mismo usuario varias veces
  const userCacheRef = useRef<Map<number, AuthorItem>>(new Map());

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const fetchList = async () => {
      setLoading(true);
      try {
        const url =
          type === "likes"
            ? `${API_BASE}/posts/${postId}/likes`
            : `${API_BASE}/posts/${postId}/reposts`;

        const res = await axios.get(url);
        let raw: any = res.data ?? [];

        // Normalizar envelope: si no es array intentar encontrar arrays en propiedades
        if (!Array.isArray(raw)) {
          if (Array.isArray(res.data?.likes)) raw = res.data.likes;
          else if (Array.isArray(res.data?.reposts)) raw = res.data.reposts;
          else if (Array.isArray(res.data?.data)) raw = res.data.data;
          else {
            const firstArray = Object.values(res.data || {}).find((v: any) => Array.isArray(v));
            if (firstArray) raw = firstArray;
            else if (Array.isArray(res.data)) raw = res.data;
          }
        }

        if (!Array.isArray(raw)) raw = [];

        const normalized: AuthorItem[] = raw.map((a: any) => normalizeRawAuthor(a));

        if (cancelled) return;
        setItems(normalized);

        // Complement fetch: si hay ids sin apodo/nombre pedir /user/id/:id
        const idsToFetch = Array.from(
          new Set(
            normalized
              .filter((it) => it.id && (!it.apodo && !it.nombre))
              .map((it) => it.id as number)
          )
        ).filter((id) => !userCacheRef.current.has(id));

        if (idsToFetch.length > 0) {
          await Promise.all(
            idsToFetch.map(async (id) => {
              try {
                const r = await axios.get(`${API_BASE}/user/id/${id}`);
                const payload = r.data?.user ?? r.data ?? null;
                if (payload) {
                  const fetched: AuthorItem = {
                    id: Number(payload.id) || id,
                    apodo: payload.apodo ?? payload.username ?? payload.handle ?? null,
                    nombre: payload.nombre ?? payload.name ?? null,
                    avatar:
                      payload.avatar ??
                      payload.avatar_url ??
                      payload.profile_picture ??
                      null,
                  };
                  userCacheRef.current.set(id, fetched);
                } else {
                  userCacheRef.current.set(id, { id });
                }
              } catch (err) {
                userCacheRef.current.set(id, { id });
              }
            })
          );

          if (cancelled) return;
          setItems((prev) =>
            prev.map((it) => {
              if (it.id && (!it.apodo && !it.nombre)) {
                const cached = userCacheRef.current.get(it.id);
                if (cached) {
                  return {
                    ...it,
                    apodo: cached.apodo ?? it.apodo,
                    nombre: cached.nombre ?? it.nombre,
                    avatar: cached.avatar ?? it.avatar,
                  };
                }
              }
              return it;
            })
          );
        }
      } catch (err) {
        console.error(`Error cargando ${type} de post ${postId}:`, err);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchList();

    return () => {
      cancelled = true;
    };
  }, [isOpen, postId, type]);

  useEffect(() => {
    if (!isOpen) return;
    if (!currentUser) {
      setMyFollowingsSet(new Set());
      return;
    }
    let cancelled = false;
    const fetchMyFollowings = async () => {
      try {
        const res = await axios.get(`${API_BASE}/follows/following/${currentUser.id}`);
        const array = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        const apodos = new Set<string>(
          array
            .map((u: any) => u?.apodo)
            .filter((v: unknown): v is string => typeof v === "string" && v.trim().length > 0)
        );
        if (!cancelled) setMyFollowingsSet(apodos);
      } catch (err) {
        console.error("Error cargando mis followings:", err);
        if (!cancelled) setMyFollowingsSet(new Set());
      }
    };
    fetchMyFollowings();
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentUser]);

  const handleUserClick = (apodo?: string | null) => {
    if (!apodo) return;
    onClose();
    navigate(`/profile/${apodo}`);
  };

  const handleToggleFollow = async (e: React.MouseEvent, apodo?: string | null) => {
    e.stopPropagation();
    if (!apodo) return;
    if (!currentUser) {
      navigate("/login");
      return;
    }
    // evitar seguirte a ti mismo
    if (currentUser.apodo === apodo) return;
    setSavingApodo(apodo);
    try {
      const res = await axios.post(`${API_BASE}/follows/${apodo}`);
      const action = res.data?.action as string;
      if (action === "followed") {
        setMyFollowingsSet((prev) => new Set(prev).add(apodo));
      } else if (action === "unfollowed") {
        setMyFollowingsSet((prev) => {
          const copy = new Set(prev);
          copy.delete(apodo);
          return copy;
        });
      }
    } catch (err) {
      console.error("Error toggle follow:", err);
      alert("No se pudo completar la acción. Inténtalo de nuevo.");
    } finally {
      setSavingApodo(null);
    }
  };

  const title = type === "likes" ? "Le gustó a" : "Re-publicado por";
  const listWrapperClass = items.length > scrollThreshold ? "overflow-auto max-h-[50vh] px-4" : "px-4";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md  w-full max-h-[80vh] overflow-hidden [&>button]:hidden">
        <DialogHeader className="sticky Dark-BG-reacciones top-0 z-20 bg-white border-b">
          <div className="flex items-center justify-between w-full px-4 py-3">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
              <Badge variant="secondary" className="text-sm">
                {items.length}
              </Badge>
            </div>

            <button
              onClick={() => onClose()}
              className="p-1 rounded-full hover:bg-gray-100 active:scale-95 active:shadow-inner active:opacity-90 transition-colors transform duration-300"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-gray-600 cursor-pointer" />
            </button>
          </div>
        </DialogHeader>

        <div className={listWrapperClass} role="list" aria-label={title}>
          {loading ? (
            <div className="text-center text-gray-500 py-8">Cargando {title.toLowerCase()}...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-gray-500 py-6">Aún no hay usuarios.</div>
          ) : (
            <ul className="space-y-2 py-3">
              {items.map((u, idx) => {
                // apodo real (para operaciones) y display name separado
                const apodoReal = u.apodo ?? null;
                const displayName = u.nombre ?? apodoReal ?? (u.id ? `user${u.id}` : `user-${idx}`);
                const imFollowing = apodoReal ? myFollowingsSet.has(apodoReal) : false;

                // avatar puede venir en distintos campos
                const avatarUrl = extractAvatarFromAuthor(u) ?? u.avatar ?? null;

                const key = u.id ? `id-${u.id}` : apodoReal ? `ap-${apodoReal}` : `idx-${idx}`;

                // Detectar si el listado es el owner del post => no mostrar botón de follow
                const isOwner =
                  (ownerId != null && u.id != null && Number(u.id) === Number(ownerId)) ||
                  (ownerApodo != null && apodoReal != null && String(apodoReal) === String(ownerApodo));

                // Detectar si el listado corresponde al viewer (usuario actual) => ocultar botón también
                const isViewer =
                  currentUser != null &&
                  ((u.id != null && Number(u.id) === Number(currentUser.id)) ||
                    (apodoReal != null && String(apodoReal) === String(currentUser.apodo)));

                return (
                  <li
                    key={key}
                    className="flex Dark-Hover items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleUserClick(apodoReal ?? undefined)}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-12 h-12 shrink-0">
                        <Avatar
                          src={avatarUrl}
                          alt={displayName}
                          size={48}
                          className="rounded-full"
                          initials={initialFromAuthor(u)}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="font-medium Dark-texto-blanco text-gray-900 truncate">{displayName}</div>
                        <div className="text-sm Dark-apodo text-gray-500 truncate">@{apodoReal ?? displayName}</div>
                      </div>
                    </div>

                    <div className="flex items-center ml-4">
                      {/* No mostrar el botón de seguir si es el owner del post o si es el propio viewer */}
                      {!isOwner && !isViewer ? (
                        <Button
                          size="sm"
                          className={
                            imFollowing
                              ? "bg-linear-to-br from-[#fa8f3d] to-[#f13e0d] text-white font-bold"
                              : "border-2 bg-transparent border-orange-500 text-orange-500 font-bold"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!apodoReal) return;
                            if (currentUser?.apodo === apodoReal) return;
                            handleToggleFollow(e, apodoReal);
                          }}
                          disabled={savingApodo === apodoReal || !apodoReal || currentUser?.apodo === apodoReal}
                        >
                          {savingApodo === apodoReal ? "..." : imFollowing ? "Siguiendo" : "Seguir"}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="sticky Dark-BG-reacciones bottom-0 z-20 bg-white border-t p-4">
          <div className="w-full flex justify-end">
            <DialogClose asChild>
              <Button className="cursor-pointer Dark-Hover" variant="ghost">Cerrar</Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReactionListModal;