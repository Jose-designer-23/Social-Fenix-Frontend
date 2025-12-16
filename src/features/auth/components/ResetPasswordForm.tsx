import { useState, type FormEvent, type ChangeEvent, useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Misma regex que usas en SignupForm
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

export default function ResetPasswordForm() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get("token") ?? "";
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Sincronizar si la query cambia
    setToken(initialToken);
  }, [initialToken]);

  const validateClient = (): string | null => {
    if (!token || !token.trim()) return t("ResetPasswordForm.errors.tokenRequired");

    if (!newPassword) return t("ResetPasswordForm.errors.passwordRequired");

    if (newPassword.length < 8)
      return t("ResetPasswordForm.errors.passwordTooShort", { min: 8 });

    if (newPassword.length > 100)
      return t("ResetPasswordForm.errors.passwordTooLong", { max: 100 });

    if (!PASSWORD_REGEX.test(newPassword)) {
      return t("ResetPasswordForm.errors.passwordRequirements");
    }

    if (newPassword !== confirmPassword) return t("ResetPasswordForm.errors.passwordsMismatch");

    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const clientErr = validateClient();
    if (clientErr) {
      setError(clientErr);
      return;
    }

    setIsLoading(true);

    try {
      await axios.post(`${API_BASE}/auth/reset-password`, {
        token: token.trim(),
        newPassword,
      });

      toast.success(t("ResetPasswordForm.success"));
      navigate("/login");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as any)?.message ??
          t("ResetPasswordForm.errors.unknownError");
        setError(String(msg));
        toast.error(String(msg));
      } else {
        setError(t("ResetPasswordForm.errors.unknownError"));
        toast.error(t("ResetPasswordForm.errors.unknownError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="estructura_diseño_formulario">
      <form className="margenes_estructura_formulario" onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="estructura_titulo_fromulario">
            <h1 className="diseño_titulo_formulario">{t("ResetPasswordForm.title")}</h1>
            <p className="diseño_subtitulo_formulario">{t("ResetPasswordForm.subtitle")}</p>
          </div>

          {error && (
            <div role="alert" className="error_formulario">
              {error}
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="token" className="estilo_etiqueta_contraseña_olvidada">
              {t("ResetPasswordForm.tokenLabel")}
            </FieldLabel>
            <Input
              id="token"
              type="text"
              value={token}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setToken(e.target.value)}
              disabled={isLoading}
              className="relleno_input_formulario"
              placeholder={t("ResetPasswordForm.tokenPlaceholder")}
            />
            <p className="text-sm text-slate-600 mt-2">
              {t("ResetPasswordForm.tokenHelper")}
            </p>
          </Field>

          <Field>
            <FieldLabel htmlFor="newPassword" className="estilo_etiqueta_contraseña_olvidada">
              {t("ResetPasswordForm.newPasswordLabel")}
            </FieldLabel>
            <Input
              id="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
              disabled={isLoading}
              className="relleno_input_formulario"
              placeholder={t("ResetPasswordForm.newPasswordPlaceholder")}
            />
            <p className="text-sm text-slate-600 mt-2">
              {t("ResetPasswordForm.newPasswordHelp")}
            </p>
          </Field>

          <Field>
            <FieldLabel htmlFor="confirmPassword" className="estilo_etiqueta_contraseña_olvidada">
              {t("ResetPasswordForm.confirmPasswordLabel")}
            </FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="relleno_input_formulario"
              placeholder={t("ResetPasswordForm.confirmPasswordPlaceholder")}
            />
          </Field>

          <Field>
            <Button
              type="submit"
              disabled={isLoading}
              className="estilo_boton_inicio_sesion"
            >
              {isLoading ? t("ResetPasswordForm.submitting") : t("ResetPasswordForm.submitButton")}
            </Button>
          </Field>

          <Field>
            <div className="diseño_pregunta_registro">
              {t("ResetPasswordForm.rememberedQuestion")}{" "}
              <a href="/login" className="diseño_enlace_registro">
                {t("ResetPasswordForm.loginLink")}
              </a>
            </div>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}