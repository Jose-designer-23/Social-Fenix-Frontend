import React from "react";
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
import { useTranslation } from "react-i18next";

interface Props {
  children: React.ReactNode; // trigger (asChild)
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  isProcessing?: boolean;
  title?: string;
  description?: string;
}

/**
 * Componente pequeño y reutilizable que muestra un AlertDialog para confirmar eliminación.
 * Uso: envolver el botón/trigger como child ,
 * o pasar un solo elemento como children; evitar pasar un Fragment.
 */
const CommentDeleteModal: React.FC<Props> = ({
  children,
  isOpen,
  onOpenChange,
  onConfirm,
  isProcessing = false,
  title,
  description,
}) => {
  const { t } = useTranslation();

  const resolvedTitle = title ?? t("CommentDeleteModal.title");
  const resolvedDescription = description ?? t("CommentDeleteModal.description");
  const cancelLabel = t("CommentDeleteModal.cancel");
  const deletingLabel = t("CommentDeleteModal.deleting");
  const deleteLabel = t("CommentDeleteModal.delete");

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      {/* El trigger lo controlará el padre; aquí solo renderizamos el diálogo */}
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">{resolvedTitle}</AlertDialogTitle>
          <AlertDialogDescription>{resolvedDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              // Llamamos al handler externo; puede ser async
              const res = onConfirm();
              return res;
            }}
            disabled={isProcessing}
            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
          >
            {isProcessing ? deletingLabel : deleteLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CommentDeleteModal;