import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/services/AuthContext";
import { Button } from "@/components/ui/button";
// Usamos el Avatar "custom" igual que en ReactionListModal para consistencia
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

interface UserItem {
  id: number;
  nombre: string;
  apodo: string;
  avatar?: string | null;
  // posibles aliases
  avatar_url?: string | null;
  profile_picture?: string | null;
  picture?: string | null;
  image?: string | null;
  url?: string | null;
}

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  type: "following" | "followers";
  scrollThreshold?: number;
}

const API_BASE = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

/** Helpers para avatar / iniciales (mismos que ReactionListModal) */
function extractAvatarFromAuthor(author?: any): string | null {
  if (!author || typeof author !== "object") return null;
  const keys = [
    "avatar",
    "avatar_url",
    "profile_picture",
    "picture",
    "image",
    "url",
  ];
  for (const k of keys) {
    const v = author[k];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return null;
}

function initialFromAuthor(author?: any): string {
  if (!author || typeof author !== "object") return "U";
  const apodo =
    typeof author.apodo === "string" && author.apodo.trim()
      ? author.apodo.trim()[0]
      : undefined;
  const nombre =
    typeof author.nombre === "string" && author.nombre.trim()
      ? author.nombre.trim()[0]
      : undefined;
  const ch = apodo ?? nombre ?? "U";
  return String(ch).toUpperCase();
}

const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  onClose,
  userId,
  type,
  scrollThreshold = 8,
}) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [myFollowingsSet, setMyFollowingsSet] = useState<Set<string>>(
    new Set()
  );
  const [savingApodo, setSavingApodo] = useState<string | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Carga inicial
  useEffect(() => {
    if (!isOpen) return;
    const fetchList = async () => {
      setLoading(true);
      try {
        const url = `${API_BASE}/follows/${
          type === "following" ? "following" : "followers"
        }/${userId}`;
        const res = await axios.get<UserItem[]>(url);
        const data = res.data || [];
        if (mountedRef.current) setItems(data);
      } catch (err) {
        console.error("Error cargando lista de follows:", err);
        if (mountedRef.current) setItems([]);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    fetchList();
  }, [isOpen, userId, type]);

  // Cargamos a quién sigo yo (para marcar "Siguiendo")
  useEffect(() => {
    if (!isOpen) return;
    if (!currentUser) {
      setMyFollowingsSet(new Set());
      return;
    }
    let cancelled = false;
    const fetchMyFollowings = async () => {
      try {
        // Pedimos como UserItem[] (o el tipo correspondiente en tu proyecto)
        const res = await axios.get<UserItem[]>(
          `${API_BASE}/follows/following/${currentUser.id}`
        );

        // Si res.data es array lo usamos, si no usamos vacío
        const array: UserItem[] = Array.isArray(res.data) ? res.data : [];

        const apodos = new Set<string>(
          array
            .map((u) => u?.apodo)
            .filter(
              (v): v is string => typeof v === "string" && v.trim().length > 0
            )
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

  const handleUserClick = (apodo: string) => {
    onClose();
    navigate(`/profile/${apodo}`);
  };

  const handleToggleFollow = async (e: React.MouseEvent, apodo: string) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate("/login");
      return;
    }
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
        if (type === "following") {
          setItems((prev) => prev.filter((u) => u.apodo !== apodo));
        }
      }
    } catch (err) {
      console.error("Error toggle follow:", err);
      alert("No se pudo completar la acción. Inténtalo de nuevo.");
    } finally {
      setSavingApodo(null);
    }
  };

  const title = type === "following" ? "Siguiendo" : "Seguidores";

  const listWrapperClass =
    items.length > scrollThreshold ? "overflow-auto max-h-[50vh] px-4" : "px-4";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* Usamos [&>button]:hidden para que Radix/Shadcn no muestre su botón automático */}
      <DialogContent className="sm:max-w-md w-full max-h-[80vh] overflow-hidden [&>button]:hidden">
        {/* Header sticky: queda visible al hacer scroll en la lista */}
        <DialogHeader className="sticky Dark-BG-reacciones top-0 z-20 bg-white border-b">
          <div className="flex items-center justify-between w-full px-4 py-3">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg  font-semibold">
                {title}
              </DialogTitle>
              <Badge variant="secondary" className="text-sm">
                {items.length}
              </Badge>
            </div>

            {/* X personalizada igual que en CommentModal */}
            <button
              onClick={() => onClose()}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-gray-600 cursor-pointer" />
            </button>
          </div>
        </DialogHeader>

        {/* Zona de lista: si items.length > threshold será scrollable */}
        <div className={listWrapperClass} role="list" aria-label={title}>
          {loading ? (
            <div className="text-center text-gray-500 py-8">
              Cargando {title.toLowerCase()}...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center text-gray-500 py-6">
              {type === "following"
                ? "No sigues a nadie todavía."
                : "Aún no tienes seguidores."}
            </div>
          ) : (
            <ul className="space-y-2  py-3">
              {items.map((u) => {
                const imFollowing = myFollowingsSet.has(u.apodo);
                // avatar puede venir en distintos campos
                const avatarUrl =
                  extractAvatarFromAuthor(u) ?? u.avatar ?? null;

                return (
                  <li
                    key={u.id}
                    className="flex  items-center justify-between p-2 rounded Dark-lista-seguidores hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleUserClick(u.apodo)}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-12 h-12 shrink-0">
                        <Avatar
                          src={avatarUrl}
                          alt={`Avatar ${u.apodo}`}
                          size={48}
                          className="rounded-full"
                          initials={initialFromAuthor(u)}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium Dark-texto-blanco text-gray-900 truncate">
                          {u.nombre}
                        </div>
                        <div className="text-sm Dark-apodo-perfil text-gray-500 truncate">
                          @{u.apodo}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center ml-4">
                      <Button
                        size="sm"
                        className={
                          imFollowing
                            ? "bg-linear-to-br from-[#fa8f3d] to-[#f13e0d] text-white font-bold cursor-pointer active:scale-95 active:shadow-inner active:opacity-90 transition-colors transform duration-300 hover:bg-linear-to-bl hover:from-[#ce016e] hover:via-[#e63f58] hover:to-[#e37d01]"
                            : "border-2 bg-transparent border-orange-500 cursor-pointer text-orange-500 font-bold active:shadow-inner active:opacity-90 transition-colors transform duration-300 hover:bg-linear-to-bl hover:from-[#ce016e] hover:via-[#e63f58] hover:to-[#e37d01] hover:text-white"
                        }
                        onClick={(e) => handleToggleFollow(e, u.apodo)}
                        disabled={savingApodo === u.apodo}
                      >
                        {savingApodo === u.apodo
                          ? "..."
                          : imFollowing
                          ? "Siguiendo"
                          : "Seguir"}
                      </Button>
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
              <Button className="cursor-pointer Dark-Hover-seguidores" variant="ghost">
                Cerrar
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FollowListModal;
