import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/services/AuthContext";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface UpdateFormData {
  nombre: string;
  apodo: string;
  correo_electronico: string;
  biografia: string;
  url: string;
}

interface EditProfileFormProps {
  onSave: () => void;
}

const API_BASE = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

const EditProfileForm: React.FC<EditProfileFormProps> = ({ onSave }) => {
  const { t } = useTranslation();
  const { user: currentUser, refetchUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<UpdateFormData>({
    nombre: "",
    apodo: "",
    correo_electronico: "",
    biografia: "",
    url: "",
  });

  // Rastreamos qué campos ha editado realmente el usuario
  const [touched, setTouched] = useState<
    Partial<Record<keyof UpdateFormData, boolean>>
  >({});

  const [isSaving, setIsSaving] = useState(false);

  // Sincronizamos el formulario cuando currentUser esté disponible o cambie
  useEffect(() => {
    if (!currentUser) return;
    setFormData({
      nombre: currentUser.nombre || "",
      apodo: currentUser.apodo || "",
      correo_electronico: (currentUser as any).correo_electronico || "",
      biografia: (currentUser as any).biografia || "",
      url: (currentUser as any).url || "",
    });
    // resetear 'touched' porque acabamos de cargar valores frescos
    setTouched({});
  }, [currentUser]);

  // Redirigimos a login si no hay usuario.
  useEffect(() => {
    if (currentUser === null) {
      navigate("/login", { replace: true });
    }
  }, [currentUser, navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name as keyof UpdateFormData]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSaving(true);

    // Incluimos solo los campos que el usuario tocó.
    const payload: Partial<UpdateFormData> = {};
    (Object.keys(formData) as Array<keyof UpdateFormData>).forEach((key) => {
      if (touched[key]) {
        // incluir el campo incluso si es una cadena vacía (usuario lo dejó vacío intencionadamente)
        payload[key] = formData[key];
      }
    });

    try {
      // Enviamos PATCH parcial con solo los campos cambiados
      await axios.patch(`${API_BASE}/user/profile/${currentUser.id}`, payload);

      toast.success(t("EditProfileForm.success"));

      // Refrescamos usuario en el contexto
      await refetchUser();
      onSave();

      // Navegamos usando el apodo actualizado si el usuario lo cambió; si no, usar el apodo actual
      const newApodo = (payload.apodo ?? formData.apodo) || currentUser.apodo;
      navigate(`/profile/${newApodo}`, { replace: true });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
          t("EditProfileForm.error") ??
          "Error al actualizar el perfil. Inténtalo de nuevo."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-3xl font-extrabold mb-6 Dark-texto-blanco text-gray-900">
        {t("EditProfileForm.title")}
      </h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white Dark-Card p-6 shadow-xl rounded-lg space-y-4"
      >
        <div>
          <label
            htmlFor="nombre"
            className="block text-sm font-semibold Dark-texto-blanco text-gray-700 mb-1"
          >
            {t("EditProfileForm.nameLabel")}
          </label>
          <input
            id="nombre"
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            maxLength={100}
            className="mt-1 block w-full border border-gray-300 rounded-md p-3 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label
            htmlFor="biografia"
            className="block Dark-texto-blanco text-sm font-semibold text-gray-700 mb-1"
          >
            {t("EditProfileForm.bioLabel")}
          </label>
          <textarea
            id="biografia"
            name="biografia"
            value={formData.biografia}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full border border-gray-300 rounded-md p-3 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label
            htmlFor="url"
            className="block Dark-texto-blanco text-sm font-semibold text-gray-700 mb-1"
          >
            {t("EditProfileForm.urlLabel")}
          </label>
          <input
            id="url"
            type="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            maxLength={255}
            className="mt-1 block w-full border border-gray-300 rounded-md p-3 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder={t("EditProfileForm.urlPlaceholder")}
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full Dark-Editar-Perfil bg-indigo-600 cursor-pointer text-white py-3 rounded-full text-lg font-bold disabled:bg-gray-400 active:scale-95 active:shadow-inner active:opacity-90 transition transform duration-150
              hover:bg-linear-to-bl hover:from-[#ce016e] hover:via-[#e63f58] hover:to-[#e37d01]"
        >
          {isSaving ? t("EditProfileForm.saving") : t("EditProfileForm.save")}
        </button>
      </form>
    </div>
  );
};

export default EditProfileForm;