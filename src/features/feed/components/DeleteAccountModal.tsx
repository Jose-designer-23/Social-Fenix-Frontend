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
import { useTranslation } from "react-i18next";

/**
 * Modal de advertencia para eliminar la cuenta.
 * Mantiene la API previa: open / onOpenChange opcionales (para integrarlo en menús).
 */
interface DeleteAccountModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();
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

      toast.success(t("DeleteAccountModal.success"));
      // Limpiamos la sesión y redirigimos al login
      try {
        logout();
      } catch {}
      navigate("/login");
    } catch (err: any) {
      console.error("Error borrando cuenta:", err);
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        t("DeleteAccountModal.error");
      toast.error(String(msg));
    } finally {
      setIsDeleting(false);
      if (typeof onOpenChange === "function") onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        {/* El trigger normalmente lo deja el consumidor; dejamos un span por compatibilidad */}
        <span />
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("DeleteAccountModal.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("DeleteAccountModal.description")}
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
            {t("DeleteAccountModal.cancel")}
          </Button>

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="cursor-pointer active:shadow-inner active:opacity-90 hover:bg-red-700 transition-colors transform duration-300"
          >
            {isDeleting
              ? t("DeleteAccountModal.deleting")
              : t("DeleteAccountModal.delete")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAccountModal;