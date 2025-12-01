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
  title = "Confirmar eliminación",
  description = "¿Estás seguro de que deseas eliminar este comentario?",
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      {/* El trigger lo controlará el padre; aquí solo renderizamos el diálogo */}
      {/* No clonamos children ni inyectamos props en el elemento trigger */}
      {/* El padre ya deberá usar su propio trigger (ej. DropdownMenuItem) y controlar isOpen */}
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              // Llamamos al handler externo; puede ser async
              const res = onConfirm();
              return res;
            }}
            disabled={isProcessing}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isProcessing ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CommentDeleteModal;