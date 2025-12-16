import { useState, type ComponentPropsWithoutRef, type FormEvent, type ChangeEvent } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/services/AuthContext.tsx";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function LoginForm({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  const { t } = useTranslation();
  const [identificador, setIdentificador] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Usamos el hook de autenticación (tipado)
  const { setUser, setToken, refetchUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/user/login`, { //http://localhost:3000 para desarrollo
        identificador,
        contrasena,
      });

      const data = response.data ?? {};
      const token =
        data.access_token ?? data.token ?? data.accessToken ?? data?.result?.access_token ?? null;

      const userData = data.user ?? data.userData ?? null;

      if (!token) {
        setError(t("errors.NO_TOKEN"));
        setIsLoading(false);
        return;
      }

      // Guardar token y dejar que el AuthProvider haga loadUserProfile()
      await setToken(token);

      // Si backend devolvió usuario parcial, opcionalmente lo seteamos (pero preferimos refetch)
      if (userData && setUser) {
        setUser(userData);
      }

      // Asegurarnos de tener el perfil completo (con avatar) antes de navegar
      try {
        await refetchUser();
      } catch {
        // si falla, navegamos igualmente: al reload/next mount el AuthProvider lo volverá a intentar
      }

      setIdentificador("");
      setContrasena("");
      navigate("/feed");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as any)?.message ??
          t("errors.CONNECTION");
        setError(String(msg));
      } else {
        setError(t("errors.UNKNOWN"));
      }
      setContrasena("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("estructura_diseño_formulario", className)} {...props}>
      <form className={cn("margenes_estructura_formulario")} onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="estructura_titulo_fromulario">
            <h1 className="diseño_titulo_formulario">{t("login.title")}</h1>
            <p className="diseño_subtitulo_formulario">
              {t("login.subtitle")}
            </p>
          </div>

          {error && <div className="error_formulario" role="alert" aria-live="polite">{error}</div>}

          <Field className="estructura_campo_usuario_formulario">
            <FieldLabel className="estilo_etiqueta_usuario_formulario" htmlFor="identificador">
              <p className="negrita">{t("login.emailOrUsername")}</p>
            </FieldLabel>
            <Input
              id="identificador"
              type="text"
              required
              value={identificador}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setIdentificador(e.target.value)}
              disabled={isLoading}
              className="relleno_input_formulario"
              placeholder={t("login.emailOrUsername") as string}
              aria-label={t("login.emailOrUsername")}
            />
          </Field>

          <Field className="estructura_campo_contraseña_formulario">
            <div className="diseño_campo_contraseña_formulario">
              <FieldLabel className="estilo_etiqueta_contraseña_formulario" htmlFor="contrasena">
                {t("login.password")}
              </FieldLabel>
              <a href="/forgot-password" className="estilo_enlace_contraseña_olvidada">
                {t("login.forgotPassword")}
              </a>
            </div>
            <Input
              id="contrasena"
              type="password"
              required
              value={contrasena}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setContrasena(e.target.value)}
              disabled={isLoading}
              className="relleno_input_formulario"
              aria-label={t("login.password")}
            />
          </Field>

          <Field className={"estructura_boton_inicio_sesion"}>
            <Button type="submit" disabled={isLoading} className="estilo_boton_inicio_sesion transition-colors-durantion-200">
              {isLoading ? t("buttons.loading") : t("buttons.login")}
            </Button>
          </Field>

          <Field>
            <div className="diseño_pregunta_registro">
              {t("noAccount.text")}{" "}
              <a href="/register" className="diseño_enlace_registro transition-colors-duration-200">
                {t("noAccount.register")}
              </a>
            </div>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}

export default LoginForm;