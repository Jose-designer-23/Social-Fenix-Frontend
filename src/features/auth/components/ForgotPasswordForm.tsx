import { useState, type FormEvent, type ChangeEvent } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function ForgotPasswordForm() {
  const { t } = useTranslation();
  const [correo, setCorreo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await axios.post(`${API_BASE}/auth/forgot-password`, {
        correo_electronico: correo,
      });

      toast.success(t("ForgotPasswordForm.sentSuccess"));
      navigate("/login");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const message =
          (err.response?.data as any)?.message ??
          t("ForgotPasswordForm.unknownError");

        if (status === 404) {
          toast.error(t("ForgotPasswordForm.emailNotFound"));
        } else {
          toast.error(String(message));
        }
      } else {
        toast.error(t("ForgotPasswordForm.unknownError"));
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
            <h1 className="diseño_titulo_formulario">
              {t("ForgotPasswordForm.title")}
            </h1>
            <p className="diseño_subtitulo_formulario">
              {t("ForgotPasswordForm.subtitle")}
            </p>
          </div>

          <Field>
            <FieldLabel
              htmlFor="correo"
              className="estilo_etiqueta_contraseña_olvidada"
            >
              {t("ForgotPasswordForm.emailLabel")}
            </FieldLabel>
            <Input
              id="correo"
              type="email"
              required
              value={correo}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setCorreo(e.target.value)
              }
              disabled={isLoading}
              className="relleno_input_formulario"
              placeholder={t("ForgotPasswordForm.emailPlaceholder")}
            />
            <p className="text-sm text-slate-600 mt-2">
              {t("ForgotPasswordForm.checkSpam")}
            </p>
          </Field>

          <Field>
            <Button
              type="submit"
              disabled={isLoading}
              className="estilo_boton_inicio_sesion"
            >
              {isLoading
                ? t("ForgotPasswordForm.sending")
                : t("ForgotPasswordForm.sendButton")}
            </Button>
          </Field>

          <Field>
            <div className="diseño_pregunta_registro">
              {t("ForgotPasswordForm.rememberedQuestion")}{" "}
              <a href="/login" className="diseño_enlace_registro">
                {t("ForgotPasswordForm.loginLink")}
              </a>
            </div>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}