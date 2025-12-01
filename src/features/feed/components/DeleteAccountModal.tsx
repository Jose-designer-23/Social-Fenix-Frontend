import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "../../auth/services/AuthContext";

// Modal de advertencia para que no elimines la cuenta sin querer
interface DeleteAccountModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { getToken, logout } = useAuth();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const token = getToken ? getToken() : localStorage.getItem("authToken");
      await axios.delete(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/user`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      toast.success("Cuenta eliminada. Hasta pronto.");
      // Limpiamos la sesión y nos redirigimos al login 
      try {
        logout();
      } catch {}
      navigate("/login");
    } catch (err: any) {
      console.error("Error borrando cuenta:", err);
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        "Error al eliminar la cuenta. Intenta de nuevo.";
      toast.error(String(msg));
    } finally {
      setIsDeleting(false);
      if (typeof onOpenChange === "function") onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        {/* El trigger normalmente lo dejamos al consumidor del componente
            (en FeedLayout usaremos un DropdownMenuItem que abre el modal).
            Aquí ponemos un fragment vacío por compatibilidad si se usa sin trigger. */}
        <span />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿De verdad quieres borrar la cuenta?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción es irreversible. Se eliminarán tus publicaciones, tu
            perfil y todos los datos asociados. Si estás seguro, confirma para
            proceder.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              if (typeof onOpenChange === "function") onOpenChange(false);
            }}
            disabled={isDeleting}
            className="cursor-pointer active:shadow-inner active:opacity-90 transition-colors transform duration-300"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="cursor-pointer active:shadow-inner active:opacity-90 hover:bg-red-700 transition-colors transform duration-300"
          >
            {isDeleting ? "Eliminando..." : "Borrar cuenta"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAccountModal;
