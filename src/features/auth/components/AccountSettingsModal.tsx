import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Avatar from "../../user-profile/components/Avatar.tsx";
import { useAuth } from "../../auth/services/AuthContext.tsx";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Reglas de validación compartidas (coinciden con tus DTOs)
const APODO_REGEX = /^[a-zA-Z0-9_]+$/;
const APODO_MIN = 3;
const APODO_MAX = 50;
const NEW_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

interface AccountSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { user, getToken, refetchUser } = useAuth();

  const [apodo, setApodo] = useState<string>("");
  const [correo, setCorreo] = useState<string>("");

  const [editApodo, setEditApodo] = useState(false);
  const [editCorreo, setEditCorreo] = useState(false);

  const [editPassword, setEditPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setApodo(user.apodo ?? "");
      setCorreo(user.correo_electronico ?? "");
    }
    if (!open) {
      // Reset cuando se cierre
      setEditApodo(false);
      setEditCorreo(false);
      setEditPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setServerError(null);
      setLoading(false);
    }
  }, [user, open]);

  const avatarUrl = user?.avatar ?? null;
  const fallbackInitial = (
    user?.apodo?.[0] ??
    user?.nombre?.[0] ??
    "U"
  ).toUpperCase();

  const validateEmail = (value?: string) =>
    !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const apodoIsValid = (value: string) => {
    const v = value.trim();
    if (v.length < APODO_MIN || v.length > APODO_MAX) return false;
    return APODO_REGEX.test(v);
  };

  const newPasswordIsValid = (value: string) => {
    return NEW_PASSWORD_REGEX.test(value);
  };

  const hasProfileChanges = useMemo(() => {
    if (!user) return false;
    const apodoChanged =
      editApodo && apodo.trim() !== (user.apodo ?? "").trim();
    const correoChanged =
      editCorreo && correo.trim() !== (user.correo_electronico ?? "").trim();
    return apodoChanged || correoChanged;
  }, [editApodo, editCorreo, apodo, correo, user]);

  const hasPasswordChange = useMemo(() => {
    return (
      editPassword && currentPassword.trim() !== "" && newPassword.trim() !== ""
    );
  }, [editPassword, currentPassword, newPassword]);

  const hasChanges = hasProfileChanges || hasPasswordChange;

  const handleSave = async () => {
    if (!user) return;
    setServerError(null);

    // Validaciones cliente
    if (editApodo && !apodoIsValid(apodo)) {
      setServerError(
        `El apodo debe tener entre ${APODO_MIN}-${APODO_MAX} caracteres y sólo letras, números y _.`
      );
      return;
    }
    if (editCorreo && !validateEmail(correo)) {
      setServerError("Introduce un correo válido.");
      return;
    }
    if (editPassword) {
      if (!currentPassword || !newPassword) {
        setServerError("Rellena ambas contraseñas.");
        return;
      }
      if (!newPasswordIsValid(newPassword)) {
        setServerError(
          "La nueva contraseña debe tener al menos 8 caracteres, incluir mayúscula, minúscula, número y carácter especial."
        );
        return;
      }
    }

    setLoading(true);

    try {
      const token = getToken();
      const headers = {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };

      // Para cambiar la contraseña si quieres cambiarla
      if (hasPasswordChange) {
        try {
          await axios.post(
            `${API_BASE_URL}/auth/change-password`,
            {
              currentPassword,
              newPassword,
            },
            { headers }
          );
          toast.success("Contraseña actualizada correctamente.");
        } catch (err: any) {
          // Si falla el cambio de contraseña, mostramos el error y abortamos (no aplicamos cambios de perfil)
          const msg =
            err?.response?.data?.message ??
            err?.response?.data?.error ??
            err?.message ??
            "Error al cambiar la contraseña.";
          setServerError(String(msg));
          toast.error(String(msg));
          setLoading(false);
          return;
        }
      }

      // Para actualizar el correo y el nombre de usuario
      if (hasProfileChanges) {
        const payload: Record<string, any> = {};
        if (editApodo && apodo.trim() !== (user.apodo ?? "").trim()) {
          payload.apodo = apodo.trim();
        }
        if (
          editCorreo &&
          correo.trim() !== (user.correo_electronico ?? "").trim()
        ) {
          payload.correo_electronico = correo.trim();
        }

        if (Object.keys(payload).length > 0) {
          try {
            await axios.patch(
              `${API_BASE_URL}/user/profile/${user.id}`,
              payload,
              { headers }
            );
            toast.success("Datos de perfil actualizados.");
          } catch (err: any) {
            const msg =
              err?.response?.data?.message ??
              err?.response?.data?.error ??
              err?.message ??
              "Error al actualizar perfil.";
            setServerError(String(msg));
            toast.error(String(msg));
            setLoading(false);
            return;
          }
        }
      }

      // Al llegar aqui cerramos el modal y refrescamos el usuario
      try {
        await refetchUser();
      } catch {
        // no bloquear si falla el refetch
        console.warn("refetchUser falló después de actualizar perfil.");
      }

      onOpenChange(false);
    } catch (err) {
      console.error("Error guardando cambios de cuenta:", err);
      setServerError("Error desconocido al guardar cambios.");
      toast.error("Error desconocido al guardar cambios.");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    onOpenChange(false);
    // reset local
    if (user) {
      setApodo(user.apodo ?? "");
      setCorreo(user.correo_electronico ?? "");
    }
    setEditApodo(false);
    setEditCorreo(false);
    setEditPassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setServerError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] [&>button]:hidden p-0 overflow-hidden rounded-xl">
        <DialogHeader className="p-4 border-b border-gray-100 flex items-center justify-between ">
          <div className="flex items-center space-x-3">
            <Avatar
              src={avatarUrl ?? undefined}
              alt={user?.nombre || user?.apodo || "avatar"}
              size={40}
              initials={fallbackInitial}
            />
            <div>
              <DialogTitle className="text-lg font-bold">
                Datos de la cuenta
              </DialogTitle>
              <p className="text-sm text-gray-500">
                Actualiza tu apodo, correo o contraseña.
              </p>
            </div>
            <button
              onClick={closeModal}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4 ">
          {/* Apodo */}
          <div>
            <label className="text-sm text-gray-700 font-medium">Apodo</label>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="text-sm text-gray-900">{user?.apodo}</div>
                {editApodo && (
                  <div className="mt-2">
                    <Input
                      value={apodo}
                      onChange={(e) =>
                        setApodo((e.target as HTMLInputElement).value)
                      }
                      placeholder="Nuevo apodo"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {apodo.length} / {APODO_MAX}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Button
                  className={
                    editApodo
                      ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer active:scale-95 active:shadow-inner active:opacity-90 transition-colors transform duration-300 mt-2"
                      : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95 active:shadow-inner active:opacity-90 transition-colors transform duration-300"
                  }
                  onClick={() => {
                    setEditApodo((s) => !s);
                    setServerError(null);
                    // al activar edición, apodo ya está cargado en el value
                  }}
                >
                  {editApodo ? "Cancelar" : "Cambiar nombre de usuario"}
                </Button>
              </div>
            </div>
          </div>

          {/* Correo */}
          <div>
            <label className="text-sm text-gray-700 font-medium">
              Correo electrónico
            </label>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="text-sm text-gray-900">
                  {user?.correo_electronico}
                </div>
                {editCorreo && (
                  <div className="mt-2">
                    <Input
                      value={correo}
                      onChange={(e) =>
                        setCorreo((e.target as HTMLInputElement).value)
                      }
                      placeholder="Nuevo correo electrónico"
                      type="email"
                    />
                  </div>
                )}
              </div>

              <div>
                <Button
                  className={
                    editCorreo
                      ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer active:scale-95 active:shadow-inner active:opacity-90 transition-colors transform duration-300 mt-7"
                      : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95 active:shadow-inner active:opacity-90 transition-colors transform duration-300"
                  }
                  onClick={() => {
                    setEditCorreo((s) => !s);
                    setServerError(null);
                  }}
                >
                  {editCorreo ? "Cancelar" : "Cambiar correo electrónico"}
                </Button>
              </div>
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="text-sm text-gray-700 font-medium">
              Contraseña
            </label>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="text-sm text-gray-900">********</div>
                {editPassword && (
                  <div className="mt-2 space-y-2">
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) =>
                        setCurrentPassword((e.target as HTMLInputElement).value)
                      }
                      placeholder="Contraseña actual"
                    />
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword((e.target as HTMLInputElement).value)
                      }
                      placeholder="Nueva contraseña"
                    />
                    <p className="text-xs text-gray-500">
                      La nueva contraseña debe tener al menos 8 caracteres,
                      incluir mayúscula, minúscula, número y carácter especial.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Button
                  className={
                    editPassword
                      ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer active:scale-95 active:shadow-inner active:opacity-90 transition-colors transform duration-300 mt-8"
                      : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95 active:shadow-inner active:opacity-90 transition-colors transform duration-300"
                  }
                  onClick={() => {
                    setEditPassword((s) => !s);
                    setServerError(null);
                    setCurrentPassword("");
                    setNewPassword("");
                  }}
                >
                  {editPassword ? "Cancelar" : "Cambiar contraseña"}
                </Button>
              </div>
            </div>
          </div>

          {serverError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
              {serverError}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <Button
            variant="outline"
            className="bg-gray-200 hover:bg-gray-300 cursor-pointer"
            onClick={closeModal}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || loading}
            className="font-bold cursor-pointer active:shadow-inner active:opacity-90 transition-colors transform duration-300 hover:bg-linear-to-bl hover:from-[#ce016e] hover:via-[#e63f58] hover:to-[#e37d01] hover:text-white"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSettingsModal;
