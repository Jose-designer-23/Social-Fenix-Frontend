import React from "react";
import EditProfileForm from "../components/EditProfileForm"; // Ajusta la ruta
import { useTranslation } from "react-i18next";

interface EditProfileModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();

  // Función que llama al onClose local, y a la función de éxito de la página de perfil
  const handleSuccessAndClose = () => {
    onSuccess(); // Recarga el perfil en ProfilePage
    onClose(); // Cierra el modal
  };

  return (
    // Overlay (Fondo oscuro transparente)
    <div
      className="fixed inset-0 bg-black/50 bg-opacity-90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("EditProfileModal.title")}
    >
      {/* Contenedor del Modal */}
      {/* Detenemos la propagación para que hacer clic dentro no cierre el modal */}
      <div
        className="bg-white Dark-Card rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="p-4 border-b Dark-borde-EDPerfil Dark-Card flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">{t("EditProfileModal.title")}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:hover:text-white cursor-pointer hover:text-gray-900 text-2xl"
            aria-label={t("EditProfileModal.closeAria")}
          >
            &times;
          </button>
        </div>

        {/* Contenido del Formulario */}
        {/* El formulario ahora debe recibir una prop 'onSave' para cerrar el modal */}
        <div className="p-4">
          <EditProfileForm onSave={handleSuccessAndClose} />
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;