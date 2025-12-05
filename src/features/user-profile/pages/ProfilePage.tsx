import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/services/AuthContext";
import toast from "react-hot-toast";
import { Mail } from "lucide-react";

// Tipos
import { FeedItem } from "../../feed/types/feed";
import { CommentFromApi } from "../../feed/types/comment";
import PostCard from "../../feed/components/PostCard";
import EditProfileModal from "../components/EditProfileModal";
import FollowListModal from "../components/FollowListModal";
import ChatModal from "../../feed/chat/components/ChatModal";

// --- Tipado del ProfileDto (responde /user/by-apodo/:apodo) ---
interface ProfileDto {
  id: number;
  apodo: string;
  nombre: string;
  biografia: string | null;
  url: string | null;
  avatar: string | null;
  portada: string | null;
  fecha_creacion: string | Date;
  isFollowing: boolean;
  postsCount: number;
  followingsCount: number;
  followersCount: number;
}

type ActiveTab = "posts" | "replies" | "reposts" | "likes" | "media";

const API_BASE = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

// Hook para cargar perfil por apodo
const useProfileData = (
  apodo: string | undefined,
  isAuthenticated: boolean
) => {
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!apodo) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get<ProfileDto>(
        `${API_BASE}/user/by-apodo/${apodo}`
      );
      setProfile(res.data);
    } catch (err) {
      console.error("Error cargando perfil:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [apodo, isAuthenticated]);

  return { profile, loading, refetchProfile: fetchProfile };
};

function normalizeFeedItem(
  raw: any,
  activeTab: ActiveTab = "posts"
): FeedItem | CommentFromApi {
  // Encontramos el autor en varias formas que puede venir del backend
  const findAuthorObj = (obj: any) => {
    if (!obj) return null;
    const candidates = [
      obj.apodo,
      obj.autor,
      obj.author,
      obj.user,
      obj.usuario,
      obj.creator,
      obj.owner,
      obj.profile,
      obj.autor?.data,
      obj.user?.user,
      obj.post?.autor,
      obj.author?.data,
      obj.owner?.data,
    ];
    return candidates.find(Boolean) ?? null;
  };

  // Normalizamos el alias de avatar
  const extractAvatar = (o: any): string | null => {
    if (!o || typeof o !== "object") return null;
    return (
      o.avatar ??
      o.avatar_url ??
      o.profile_picture ??
      o.picture ??
      o.image ??
      o.url ??
      null
    );
  };

  // --------------- Comentario envuelto ---------------
  if (raw && raw.type === "comment" && raw.recurso) {
    const c: any = raw.recurso;
    const originalPostId =
      c.postOriginal?.id ?? c.post?.id ?? c.post_id ?? null;

    // Intentamos encontrar al autor en las muchas formas posibles
    const rawAuthor = findAuthorObj(c) ?? null;

    const authorId =
      Number(
        rawAuthor?.id ??
          rawAuthor?.userId ??
          rawAuthor?.profileId ??
          rawAuthor?.usuario_id ??
          0
      ) || 0;

    const authorNombre =
      rawAuthor?.nombre ??
      rawAuthor?.name ??
      rawAuthor?.displayName ??
      rawAuthor?.fullName ??
      "";

    const authorApodo =
      rawAuthor?.apodo ??
      rawAuthor?.username ??
      rawAuthor?.nick ??
      rawAuthor?.handle ??
      (typeof rawAuthor === "string" ? rawAuthor : "") ??
      "desconocido";

    // Normalizamos avatar del autor del comentario
    const authorAvatar =
      extractAvatar(rawAuthor) ?? extractAvatar(c.autor) ?? null;

    const isFromLikesTab = activeTab === "likes";

    const normalizedComment: FeedItem = {
      id: Number(c.id),
      contenido: c.contenido ?? c.content ?? "",
      url_imagen: c.url_imagen ?? c.image_url ?? c.image ?? null,
      fecha_creacion:
        c.fecha_creacion ?? c.created_at ?? new Date().toISOString(),
      fecha_actualizacion:
        c.fecha_actualizacion ??
        c.updated_at ??
        c.fecha_creacion ??
        new Date().toISOString(),
      apodo: {
        id: authorId,
        nombre: authorNombre,
        apodo: authorApodo,
        avatar: authorAvatar,
      },
      sortDate: raw.likeDate ?? c.fecha_creacion ?? c.created_at,
      type: "comment",
      liked: isFromLikesTab || !!(c.liked ?? false),
      likesCount: Math.max(
        Number(c.likesCount ?? c.likes ?? 0),
        isFromLikesTab || !!c.liked ? 1 : 0
      ),
      repostsCount: 0,
      reposted: false,
      commentsCount: Number(c.commentsCount ?? c.repliesCount ?? 0),
      originalPostId: Number(originalPostId) || null,
    };

    return normalizedComment;
  }

  // --------------- Post / Repost / Wrapper ---------------
  let post = raw;
  if (raw?.recurso) post = raw.recurso;
  else if (raw?.post) post = raw.post;
  else if (raw?.postOriginal) post = raw.postOriginal;
  if (post?.recurso) post = post.recurso;

  const authorObj = findAuthorObj(post) ?? null;

  const fallbackId = Number(
    authorObj?.id ??
      post?.userId ??
      post?.autor_id ??
      post?.user_id ??
      post?.apodo?.id ??
      0
  );
  const fallbackNombre =
    authorObj?.nombre ??
    authorObj?.name ??
    authorObj?.displayName ??
    post?.nombre ??
    post?.name ??
    "";
  const fallbackApodo =
    authorObj?.apodo ??
    authorObj?.username ??
    authorObj?.nick ??
    authorObj?.handle ??
    "";

  // Normalizamos avatar del autor del post usando varios posibles lugares
  const fallbackAvatar =
    extractAvatar(authorObj) ??
    extractAvatar(post?.apodo) ??
    extractAvatar(post?.author) ??
    extractAvatar(post) ??
    null;

  const apodo = {
    id: fallbackId,
    nombre: fallbackNombre,
    apodo: fallbackApodo,
    avatar: fallbackAvatar,
  };

  const normalized: FeedItem = {
    id: Number(post?.id ?? raw?.id ?? 0),
    contenido: post?.contenido ?? post?.content ?? "",
    url_imagen:
      post?.url_imagen ??
      post?.image_url ??
      post?.image ??
      (Array.isArray(post?.media) && post.media[0]?.url) ??
      null,
    fecha_creacion:
      post?.fecha_creacion ?? post?.created_at ?? new Date().toISOString(),
    fecha_actualizacion:
      post?.fecha_actualizacion ??
      post?.updated_at ??
      post?.fecha_creacion ??
      new Date().toISOString(),
    apodo,
    sortDate:
      post?.sortDate ??
      post?.fecha_creacion ??
      post?.created_at ??
      new Date().toISOString(),
    type:
      raw?.type === "repost" ||
      post?.type === "repost" ||
      raw?.isRepost ||
      post?.isRepost
        ? "repost"
        : "post",
    isRepost: !!(raw?.isRepost || post?.isRepost || raw?.repost),
    repostedBy:
      raw?.repostedBy ?? raw?.reposted_by ?? raw?.reposted_by_user ?? undefined,
    repostDate: raw?.repostDate ?? raw?.reposted_at ?? undefined,
    likesCount: Number(post?.likesCount ?? post?.likes ?? raw?.likes ?? 0),
    liked: !!(
      post?.liked ??
      post?.liked_by_user ??
      raw?.liked ??
      raw?.liked_by_user ??
      false
    ),
    repostsCount: Number(post?.repostsCount ?? post?.reposts ?? 0),
    reposted: !!(
      post?.reposted ??
      post?.reposted_by_user ??
      raw?.reposted ??
      false
    ),
    commentsCount: Number(post?.commentsCount ?? post?.comments ?? 0),
  };

  return normalized;
}

// Componente principal
const ProfilePage: React.FC = () => {
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); // <-- estado para abrir el chat modal
  const [chatOtherUser, setChatOtherUser] = useState<{
    id: number;
    nombre?: string | null;
    apodo?: string | null;
    avatar?: string | null;
  } | null>(null);

  const navigate = useNavigate();
  const params = useParams<{ apodo?: string }>();

  const profileApodo = params.apodo ?? currentUser?.apodo;

  const {
    profile: ProfileData,
    loading: isProfileLoading,
    refetchProfile,
  } = useProfileData(profileApodo, !!currentUser);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: ActiveTab =
    (searchParams.get("tab") as ActiveTab) || "posts";
  const [feedContent, setFeedContent] = useState<(FeedItem | CommentFromApi)[]>(
    []
  );
  const [isFeedLoading, setIsFeedLoading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState<null | "avatar" | "cover">(null);

  // refs/estados para scrollable tabs en pantallas pequeñas ---
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width:600px)").matches
      : false
  );

  // lista de tabs (usada para renderizar)
  const tabs: ActiveTab[] = ["posts", "replies", "reposts", "likes", "media"];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width:600px)");
    const onChange = (e: MediaQueryListEvent) => {
      setIsSmallScreen(e.matches);
      // debounce corto para permitir reflow
      setTimeout(updateScrollButtons, 50);
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange as any);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateScrollButtons = () => {
    const el = tabsContainerRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 1);
  };

  useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const onScroll = () => updateScrollButtons();
    const onResize = () => updateScrollButtons();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // Check inicial
    setTimeout(updateScrollButtons, 0);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [isSmallScreen, feedContent.length]);

  const scrollTabsBy = (distance: number) => {
    const el = tabsContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: distance, behavior: "smooth" });
    // Actualizamos los botones después de un pequeño retraso (luego de un progreso de desplazamiento suave)
    setTimeout(updateScrollButtons, 300);
  };

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ProfileData) return;
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (currentUser.apodo === ProfileData.apodo) return;
    try {
      await axios.post(`${API_BASE}/follows/${ProfileData.apodo}`);
      await refetchProfile();
    } catch (err) {
      console.error("Error follow:", err);
      alert("No se pudo completar la acción de seguimiento.");
    }
  };

  // Abrimos el modal de mensaje con este usuario ---
  const handleOpenMessage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!ProfileData) return;
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (currentUser.apodo === ProfileData.apodo) {
      // No enviar mensajes a uno mismo
      return;
    }

    setChatOtherUser({
      id: ProfileData.id,
      nombre: ProfileData.nombre,
      apodo: ProfileData.apodo,
      avatar: ProfileData.avatar,
    });
    setIsChatOpen(true);
  };

  // Funciones para abrir el file picker (avatar/cover)
  const openAvatarPicker = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    avatarInputRef.current?.click();
  };
  const openCoverPicker = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    coverInputRef.current?.click();
  };

  // Manejo del upload -> subimos a /uploads/server-upload y luego actualizamos el perfil con PATCH /user/profile/:id
  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "avatar" | "cover"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // validaciones básicas (tipo/tamaño)
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato no soportado. Usa JPG/PNG/WEBP.");
      e.currentTarget.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      // límite 8MB para avatar/portada por defecto
      toast.error("Archivo demasiado grande (máx 8MB).");
      e.currentTarget.value = "";
      return;
    }

    setUploading(kind === "avatar" ? "avatar" : "cover");
    const token = localStorage.getItem("authToken") ?? "";

    try {
      // Subimos archivo al endpoint de uploads (server-upload) y obtenemos la publicUrl
      const fm = new FormData();
      fm.append("file", file);
      fm.append("folder", kind === "avatar" ? "avatars" : "covers");

      const uploadRes = await axios.post(
        `${API_BASE}/uploads/server-upload`,
        fm,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            // axios establecerá Content-Type multipart/form-data
          },
          onUploadProgress: (evt) => {
            //Aqui podríamos ver la barra de progueso si queremos
          },
        }
      );

      const publicUrl = uploadRes?.data?.publicUrl;
      if (!publicUrl) {
        throw new Error("No se obtuvo publicUrl del servidor de uploads.");
      }

      // Llamamos al endpoint de actualización de perfil del usuario autenticado
      // Usamos el id del usuario autenticado desde currentUser si está disponible
      const userIdToPatch = currentUser?.id ?? ProfileData?.id;
      if (!userIdToPatch) {
        throw new Error("Usuario no identificado para actualizar perfil.");
      }

      const payload: any =
        kind === "avatar" ? { avatar: publicUrl } : { portada: publicUrl };

      await axios.patch(`${API_BASE}/user/profile/${userIdToPatch}`, payload, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });

      toast.success(
        kind === "avatar" ? "Avatar actualizado" : "Portada actualizada"
      );

      // Refrescamos datos del perfil para que UI recoja la nueva URL
      await refetchProfile();
    } catch (err: any) {
      console.error("Error al subir/actualizar imagen de perfil:", err);
      toast.error(
        err?.response?.data?.message ?? err.message ?? "Error subiendo imagen"
      );
    } finally {
      setUploading(null);
      // Restablecemos la entrada para que al seleccionar nuevamente el mismo archivo se active el cambio
      try {
        if (kind === "avatar") {
          if (avatarInputRef.current) avatarInputRef.current.value = "";
        } else {
          if (coverInputRef.current) coverInputRef.current.value = "";
        }
      } catch {}
    }
  };

  // Función para manejar el cierre del modal después de guardar
  const handleEditSuccess = async () => {
    setIsEditModalOpen(false);
    await refetchProfile();
  };

  const fetchFeedContent = useCallback(async () => {
    if (!ProfileData) return;
    const userId = ProfileData.id;
    let url = "";
    switch (activeTab) {
      case "posts":
      case "media":
        url = `/posts/user/${userId}`;
        break;
      case "replies":
        url = `/posts/user/${userId}/comments`;
        break;
      case "reposts":
        url = `/posts/user/${userId}/reposts`;
        break;
      case "likes":
        url = `/posts/user/${userId}/likes`;
        break;
      default:
        url = `/posts/user/${userId}`;
    }

    setIsFeedLoading(true);
    try {
      const res = await axios.get(`${API_BASE}${url}`);
      const raw = res.data;

      let items: any[] = [];

      if (Array.isArray(raw)) {
        items = raw;
      } else if (Array.isArray(raw.posts)) {
        items = raw.posts;
      } else if (Array.isArray(raw.reposts)) {
        items = raw.reposts;
      } else if (Array.isArray(raw.likes)) {
        items = raw.likes;
      } else if (Array.isArray(raw.replies)) {
        items = raw.replies;
      } else if (Array.isArray(raw.data)) {
        items = raw.data;
      } else {
        const firstArray = Object.values(raw).find((v: any) =>
          Array.isArray(v)
        ) as any[] | undefined;
        items = firstArray ?? [];
      }

      const normalized = items.map((item) =>
        normalizeFeedItem(item, activeTab)
      );
      const finalData =
        activeTab === "media"
          ? normalized.filter((it: any) => Boolean((it as any).url_imagen))
          : normalized;
      setFeedContent(finalData);
    } catch (err) {
      console.error("Error al cargar pestaña:", err);
      setFeedContent([]);
    } finally {
      setIsFeedLoading(false);
    }
  }, [activeTab, ProfileData]);

  const handleTabChange = (tab: ActiveTab) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());

    if (tab === "posts") {
      newSearchParams.delete("tab");
    } else {
      newSearchParams.set("tab", tab);
    }

    setSearchParams(newSearchParams);
  };

  useEffect(() => {
    if (ProfileData) fetchFeedContent();
  }, [activeTab, ProfileData, fetchFeedContent]);

  const handlePostDeleted = useCallback(
    (ev: CustomEvent<{ postId: number }>) => {
      const id = ev.detail.postId;
      setFeedContent((prev) => prev.filter((item) => (item as any).id !== id));
      setTimeout(() => {
        fetchFeedContent();
        refetchProfile();
      }, 500);
    },
    [fetchFeedContent, refetchProfile]
  );

  useEffect(() => {
    window.addEventListener(
      "post:deleted" as any,
      handlePostDeleted as EventListener
    );
    const genericHandler = () => {
      setTimeout(() => {
        refetchProfile();
        fetchFeedContent();
      }, 300);
    };
    window.addEventListener("post:changed" as any, genericHandler);
    return () => {
      window.removeEventListener(
        "post:deleted" as any,
        handlePostDeleted as EventListener
      );
      window.removeEventListener("post:changed" as any, genericHandler);
    };
  }, [handlePostDeleted, fetchFeedContent, refetchProfile]);

  if (isAuthLoading) {
    return (
      <div className="loading-state p-8 text-center">Cargando sesión...</div>
    );
  }

  if (isProfileLoading) {
    return (
      <div className="loading-state p-8 text-center">
        Cargando perfil de @{profileApodo}...
      </div>
    );
  }

  if (!ProfileData) {
    return (
      <div className="not-found-state p-8 text-center text-red-600">
        No se pudo cargar el perfil de @{profileApodo}.
      </div>
    );
  }

  const isOwner = !!currentUser && currentUser.apodo === ProfileData.apodo;

  const renderFeedContent = () => {
    if (isFeedLoading)
      return (
        <div className="p-4 text-center text-gray-500">
          Cargando {activeTab}...
        </div>
      );
    if (feedContent.length === 0) {
      let msg = "";
      switch (activeTab) {
        case "posts":
          msg = isOwner
            ? "Aún no has hecho publicaciones."
            : "Aún no hay publicaciones.";
          break;
        case "replies":
          msg = "Aún no hay comentarios.";
          break;
        case "reposts":
          msg = "Aún no hay reposteos.";
          break;
        case "likes":
          msg = "Aún no hay likes.";
          break;
        case "media":
          msg = "Aún no hay multimedia.";
          break;
      }
      return <div className="p-4 text-center text-gray-500 italic">{msg}</div>;
    }

    return (
      <div className="space-y-4">
        {feedContent.map((item) => (
          <PostCard
            key={(item as any).id}
            post={item as FeedItem}
            clickable={true}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="profile-container bg-white min-h-screen rounded-2xl">
      <header className="profile-header relative mb-16">
        {/* COVER: Overlay hover + click */}
        <div
          className={`cover-photo h-48 bg-gray-300 bg-cover bg-center group relative rounded-t-2xl`}
          style={{
            backgroundImage: `url(${
              ProfileData.portada || "placeholder-cover.jpg"
            })`,
          }}
        >
          {/*La superposición solo se muestra al propietario */}
          {isOwner && (
            <div
              className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer"
              onClick={openCoverPicker}
              title="Editar portada"
            >
              <span className="text-white font-semibold bg-black/40 px-3 py-1 rounded">
                {uploading === "cover" ? "Subiendo..." : "Editar portada"}
              </span>
            </div>
          )}
        </div>

        {/* AVATAR: Posicionado y con overlay */}
        <div className="absolute top-36 left-4">
          <div className="relative group inline-block">
            <img
              src={ProfileData.avatar || "placeholder-avatar.png"}
              alt={`Foto de ${ProfileData.apodo}`}
              className="profile-avatar w-32 h-32 rounded-full border-4 border-white shadow-md object-cover"
            />
            {isOwner && (
              <div
                className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer"
                onClick={openAvatarPicker}
                title="Editar avatar"
              >
                <span className="text-white font-semibold bg-black/40 px-2 py-1 rounded">
                  {uploading === "avatar" ? "Subiendo..." : "Editar avatar"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Entradas de archivos invisibles */}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelected(e, "avatar")}
        />
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelected(e, "cover")}
        />

        <div className="action-buttons flex justify-end p-4 pt-2 space-x-3">
          {isOwner ? (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="btn btn-edit bg-indigo-600 text-white px-4 py-2 
              rounded-full font-bold active:scale-95 active:shadow-inner active:opacity-90 transition transform duration-150
              hover:bg-linear-to-bl hover:from-[#ce016e] hover:via-[#e63f58] hover:to-[#e37d01] cursor-pointer"
            >
              Editar perfil
            </button>
          ) : (
            <>
              <button
                onClick={handleToggleFollow}
                className={`btn btn-follow px-4 py-2 rounded-full transition ${
                  ProfileData.isFollowing
                    ? "bg-linear-to-br from-[#fa8f3d]/80 to-[#f13e0d] text-white font-bold cursor-pointer active:scale-95 active:shadow-inner active:opacity-90 transition-colors transform duration-300 hover:bg-linear-to-bl hover:from-[#ce016e] hover:via-[#e63f58] hover:to-[#e37d01]"
                    : "border-2 border-orange-500 cursor-pointer text-orange-500 font-bold active:shadow-inner active:opacity-90 transition-colors transform duration-300 hover:bg-linear-to-bl hover:from-[#ce016e] hover:via-[#e63f58] hover:to-[#e37d01] hover:text-white"
                }`}
              >
                {ProfileData.isFollowing ? "Siguiendo" : "Seguir"}
              </button>

              {/* Botón para enviar un mensaje directo al usuario */}
              <button
                onClick={handleOpenMessage}
                className="px-4 py-2 cursor-pointer rounded-full  font-bold bg-linear-to-bl from-[#ce016e] via-[#e63f58] to-[#e37d01] text-white hover:opacity-95 active:opacity-90 active:shadow-inner active:scale-95 transition transform duration-150"
              >
                <span className="inline-flex items-center gap-2">
                  <Mail className="w-4 h-4 sm:hidden" />{" "}
                  {/* icono solo en móvil */}
                  <span className="hidden sm:inline">Enviar mensaje</span>{" "}
                  {/* texto solo en >= sm */}
                </span>
              </button>
            </>
          )}
        </div>
      </header>

      <section className="profile-info px-4 -mt-10">
        <h1 className="name text-2xl font-bold text-gray-900">
          {ProfileData.nombre}
        </h1>
        <p className="username text-gray-500 mb-2">@{ProfileData.apodo}</p>
        <p className="bio text-gray-800 mb-3">{ProfileData.biografia}</p>
        <div className="profile-meta text-sm text-gray-500 flex items-center space-x-4 mb-4">
          {ProfileData.url && (
            <span className="meta-item link">
              🔗{" "}
              <a
                href={ProfileData.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline"
              >
                {ProfileData.url}
              </a>
            </span>
          )}
          <span className="meta-item joined">
            📅 Se unió en{" "}
            {new Date(ProfileData.fecha_creacion).toLocaleDateString("es-ES", {
              year: "numeric",
              month: "long",
            })}
          </span>
        </div>
        <div className="follow-stats flex space-x-4 mb-6">
          <button
            onClick={() => setIsFollowingModalOpen(true)}
            className="stat-item text-gray-900 hover:underline"
          >
            <span className="count font-bold">
              {ProfileData.followingsCount}
            </span>{" "}
            <span className="label text-gray-500 cursor-pointer">
              Siguiendo
            </span>
          </button>
          <button
            onClick={() => setIsFollowersModalOpen(true)}
            className="stat-item text-gray-900 hover:underline"
          >
            <span className="count font-bold">
              {ProfileData.followersCount}
            </span>{" "}
            <span className="label text-gray-500 cursor-pointer">
              Seguidores
            </span>
          </button>
        </div>
      </section>

      {/* NAV: pestañas. En pantallas pequeñas se hace deslizable horizontalmente */}
      <nav className="profile-tabs border-b border-gray-200 sticky top-0 bg-white z-10">
        {/* Wrapper relative para poder posicionar flechas */}
        <div className="relative group">
          {isSmallScreen ? (
            <>
              {/* Contenedor scrollable */}
              <div
                ref={tabsContainerRef}
                className="overflow-x-auto overflow-y-hidden whitespace-nowrap px-2 "
                style={{
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`inline-block mr-2 mb-0 py-4 px-3 font-semibold text-sm rounded-md transition duration-200  ${
                      activeTab === tab
                        ? "text-indigo-600 border-b-2 border-indigo-600 cursor-pointer"
                        : "text-gray-500 hover:bg-gray-100 cursor-pointer"
                    }`}
                  >
                    {tab === "posts"
                      ? `Publicaciones (${ProfileData.postsCount})`
                      : tab === "replies"
                      ? "Comentarios"
                      : tab === "reposts"
                      ? "Re-publicaciones"
                      : tab === "likes"
                      ? "Likes"
                      : "Multimedia"}
                  </button>
                ))}
              </div>

              {/* Flecha izquierda */}
              <button
                aria-hidden={!canScrollLeft}
                onClick={() => scrollTabsBy(-150)}
                className={`absolute left-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex items-center justify-center bg-white shadow transition-opacity duration-150 ${
                  canScrollLeft
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                } group-hover:opacity-100`}
                title="Desplazar a la izquierda"
                style={{ transform: "translateY(-50%)", marginLeft: 6 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.707 14.707a1 1 0 01-1.414 0L7.586 11l3.707-3.707a1 1 0 011.414 1.414L10.414 11l2.293 2.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Flecha derecha */}
              <button
                aria-hidden={!canScrollRight}
                onClick={() => scrollTabsBy(150)}
                className={`absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex items-center justify-center bg-white shadow transition-opacity duration-150 ${
                  canScrollRight
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                } group-hover:opacity-100`}
                title="Desplazar a la derecha"
                style={{ transform: "translateY(-50%)", marginRight: 6 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 5.293a1 1 0 011.414 0L12.414 9l-3.707 3.707a1 1 0 11-1.414-1.414L9.586 9 7.293 6.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </>
          ) : (
            // Pantallas grandes: Render normal no scrollable
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`tab p-4 font-semibold text-sm transition duration-200 ${
                    activeTab === tab
                      ? "active text-indigo-600 border-b-2 border-indigo-600 cursor-pointer"
                      : "text-gray-500 hover:bg-gray-100 cursor-pointer"
                  }`}
                >
                  {tab === "posts"
                    ? `Publicaciones (${ProfileData.postsCount})`
                    : tab === "replies"
                    ? "Comentarios"
                    : tab === "reposts"
                    ? "Re-publicaciones"
                    : tab === "likes"
                    ? "Likes"
                    : "Multimedia"}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="profile-content px-4 pb-8">{renderFeedContent()}</div>

      {isEditModalOpen && (
        <EditProfileModal
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      <FollowListModal
        isOpen={isFollowingModalOpen}
        onClose={() => setIsFollowingModalOpen(false)}
        userId={ProfileData.id}
        type="following"
      />
      <FollowListModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        userId={ProfileData.id}
        type="followers"
      />

      {/* Chat modal: se abre al pulsar "Enviar mensaje" */}
      {chatOtherUser && (
        <ChatModal
          otherUser={chatOtherUser}
          open={isChatOpen}
          onOpenChange={(v) => {
            setIsChatOpen(v);
            if (!v) {
              // limpiar selección al cerrar
              setChatOtherUser(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default ProfilePage;
