import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Avatar from "../../user-profile/components/Avatar.tsx";
import { X } from "lucide-react";
import { User } from "../../auth/services/AuthContext";
import CommentPostArea from "./CommentPostArea";
import { FeedItem } from "../types/feed";
import {
  getAvatarUrlFromAuthor,
  getInitialFromAuthor,
} from "../../../utils/avatar";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CommentModalProps {
  children: React.ReactNode;
  post: FeedItem;
  currentUser: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Opcionales para delegar el diálogo de borrado aquí
  isDeleteOpen?: boolean;
  onDeleteOpenChange?: (open: boolean) => void;
  onConfirmDelete?: () => Promise<any> | any;
  isProcessingDelete?: boolean;
}

const CommentModal: React.FC<CommentModalProps> = ({
  children,
  post,
  currentUser,
  open,
  onOpenChange,
  isDeleteOpen = false,
  onDeleteOpenChange,
  onConfirmDelete,
  isProcessingDelete = false,
}) => {
  // Avatar del autor del post (usar post.apodo)
  const postAuthor = (post.apodo ?? null) as unknown;
  const postAuthorAvatar = getAvatarUrlFromAuthor(postAuthor);
  const postAuthorInitial = getInitialFromAuthor(postAuthor);

  // Recibimos opcionalmente el comentario (objeto o id) que ha sido creado
  const handleCommentSuccess = (newCommentOrId?: any) => {
    // Cierra el modal
    onOpenChange(false);

    // Dispara evento local para quien lo necesite
    try {
      const ev = new CustomEvent("comment:created", { detail: newCommentOrId });
      window.dispatchEvent(ev);
    } catch (e) {
      const ev2 = document.createEvent("CustomEvent");
      ev2.initCustomEvent("comment:created", false, false, newCommentOrId);
      window.dispatchEvent(ev2);
    }

    // También emitimos el evento global que usa NotificationsButton
    try {
      const actor = {
        id: Number(currentUser.id),
        nombre: currentUser.nombre,
        apodo: currentUser.apodo,
        avatar: currentUser.avatar ?? null,
      };
      window.dispatchEvent(
        new CustomEvent("post:interaction", {
          detail: {
            postId: post.id,
            action: "comment",
            actor,
            postSnippet: post.contenido ?? null,
            postImage: post.url_imagen ?? null,
            postAuthorName: post.apodo?.nombre ?? null,
            postAuthorApodo: post.apodo?.apodo ?? null,
            comment: newCommentOrId ?? null,
            timestamp: new Date().toISOString(),
          },
        })
      );
    } catch (e) {
      // noop
    }
  };

  const SimplifiedPostCard = () => {
    const renderMedia = (url?: string | null) => {
      if (!url) return null;
      const isVideo = /\.(mp4|webm|ogv|ogg)(\?.*)?$/i.test(url);
      if (isVideo) {
        return (
          <div className="mt-3 flex justify-center">
            <div className="w-full max-w-3xl mx-auto">
              <video
                controls
                playsInline
                preload="metadata"
                className="w-full h-auto rounded-xl border border-gray-100 object-contain max-h-60 bg-black"
              >
                <source src={url} type="video/mp4" />
                Tu navegador no soporta la reproducción de vídeo.
              </video>
            </div>
          </div>
        );
      }

      return (
        <div className="mt-3 flex justify-center">
          <div className="w-full max-w-3xl mx-auto">
            <img
              src={url}
              alt="Contenido del post"
              className="w-full h-auto rounded-xl border border-gray-100 object-cover max-h-60"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://placehold.co/600x400/ECEFF1/AD1457?text=Imagen+no+disponible";
              }}
            />
          </div>
        </div>
      );
    };

    return (
      <div className="border-b pb-4 mb-4">
        <div className="flex space-x-3 items-start">
          <div className="shrink-0 pt-1">
            <Avatar
              src={postAuthorAvatar ?? undefined}
              alt={
                (post.apodo && (post.apodo.nombre || post.apodo.apodo)) || "avatar"
              }
              size={40}
              className="shrink-0 rounded-full"
              initials={postAuthorInitial}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <span className="font-bold Dark-texto-blanco text-gray-900 truncate">
                {post.apodo.nombre}
              </span>
              <span className="text-sm Dark-apodo text-gray-500 truncate">
                @{post.apodo.apodo}
              </span>
              <span className="text-sm Dark-punto-fecha text-gray-500">•</span>
              <span className="text-sm Dark-punto-fecha text-gray-500 flex-none">
                {/* fecha */}
              </span>
            </div>

            <div className="mt-1 Dark-texto-blanco text-gray-800 wrap-break-words">
              <p>{post.contenido}</p>
              {renderMedia(post.url_imagen)}
            </div>

            <div className="mt-3 text-sm Dark-respondiendo-a text-gray-500">
              Respondiendo a{" "}
              <span className="text-indigo-600 Dark-Enlace hover:underline cursor-pointer">
                @{post.apodo.apodo}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>

        <DialogContent className="sm:max-w-[600px] [&>button]:hidden p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-4 border-b border-gray-100 flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-bold">Comentar</DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors active:scale-95 active:shadow-inner active:opacity-90 transform duration-300"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-gray-600 cursor-pointer" />
            </button>
          </DialogHeader>

          <div className="p-4 overflow-y-auto max-h-[80vh]">
            <SimplifiedPostCard />

            <CommentPostArea
              user={currentUser}
              postId={post.id}
              onCommentSuccess={handleCommentSuccess}
              isModalContext={true}
            />
          </div>
        </DialogContent>
      </Dialog>

      {onDeleteOpenChange && onConfirmDelete && (
        <AlertDialog open={isDeleteOpen} onOpenChange={onDeleteOpenChange}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">
                Confirmar Eliminación
              </AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de querer borrar este recuerdo?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessingDelete}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  // Llamamos al handler externo y, si devuelve info, la usamos para el evento
                  try {
                    const result = await onConfirmDelete();
                    // Emitimos evento global indicando que se borró un comentario (o lo que corresponda)
                    try {
                      const actor = {
                        id: Number(currentUser.id),
                        nombre: currentUser.nombre,
                        apodo: currentUser.apodo,
                        avatar: currentUser.avatar ?? null,
                      };
                      window.dispatchEvent(
                        new CustomEvent("post:interaction", {
                          detail: {
                            postId: post.id,
                            action: "delete_comment",
                            actor,
                            deletedComment: result ?? null,
                            timestamp: new Date().toISOString(),
                          },
                        })
                      );
                    } catch (e) {
                      // noop
                    }
                    return result;
                  } catch (e) {
                    // si falla la eliminación, no emitimos
                    console.error("Error eliminando:", e);
                    throw e;
                  }
                }}
                disabled={isProcessingDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isProcessingDelete ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default CommentModal;
