import {
  useState,
  type ComponentPropsWithoutRef,
  type FormEvent,
  type ChangeEvent,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

// Usamos expresiones regulares para validar apodo y contraseña
const APODO_REGEX = /^[a-zA-Z0-9_]+$/;
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Creamos los estados y funciones necesarias para el formulario de registro
export function SignupForm({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  const { t } = useTranslation(); // namespace "common" por defecto
  const [nombre, setNombre] = useState("");
  const [apodo, setApodo] = useState("");
  const [correoElectronico, setCorreoElectronico] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmContrasena, setConfirmContrasena] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // Validamos los campos del formulario antes de enviarlo al servidor
  const validateClient = (): string | null => {
    if (!nombre.trim()) return t("signup.errors.nameRequired");

    if (nombre.trim().length > 100)
      return t("signup.errors.nameTooLong");

    if (!apodo.trim()) return t("signup.errors.usernameRequired");

    if (apodo.trim().length < 3)
      return t("signup.errors.usernameTooShort");

    if (apodo.trim().length > 50)
      return t("signup.errors.usernameTooLong");

    if (!APODO_REGEX.test(apodo.trim()))
      return t("signup.errors.usernamePattern");

    if (!correoElectronico.trim())
      return t("signup.errors.emailRequired");

    if (!/^\S+@\S+\.\S+$/.test(correoElectronico.trim()))
      return t("signup.errors.emailInvalid");

    if (!contrasena) return t("signup.errors.passwordRequired");

    if (contrasena.length < 8)
      return t("signup.errors.passwordTooShort");

    if (contrasena.length > 100)
      return t("signup.errors.passwordTooLong");

    if (!PASSWORD_REGEX.test(contrasena)) {
      return t("signup.errors.passwordPattern");
    }
    if (contrasena !== confirmContrasena)
      return t("signup.errors.passwordsMismatch");
    return null;
  };

  // Maneja el envío del formulario
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validación del lado del cliente
    const clientErr = validateClient();
    if (clientErr) {
      setError(clientErr);
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        nombre: nombre.trim(),
        apodo: apodo.trim(),
        correo_electronico: correoElectronico.trim(),
        contrasena: contrasena,
      };

      const response = await axios.post(
        `${API_BASE}/user/register`, //http://localhost:3000 para desarrollo
        payload
      );

      if (response?.status >= 200 && response?.status < 300) {
        setSuccessMessage(t("signup.successRedirect"));
        setNombre("");
        setApodo("");
        setCorreoElectronico("");
        setContrasena("");
        setConfirmContrasena("");

        setTimeout(() => {
          navigate("/login");
        }, 800);
      } else {
        const msg =
          (response?.data as any)?.message ??
          t("signup.errors.unexpectedServer");
        setError(String(msg));
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const serverMessage = (err.response?.data as any)?.message;
        if (serverMessage) {
          setError(String(serverMessage));
        } else if (err.response?.status === 400) {
          setError(t("signup.errors.invalidData"));
        } else if (err.response?.status === 409) {
          setError(t("signup.errors.duplicate"));
        } else {
          setError(t("signup.errors.connection"));
        }
      } else {
        setError(t("signup.errors.unknown"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("estructura_campos_formulario_registro", className)} {...props}>
      <form onSubmit={handleSubmit} className={cn("espacio_campos_registro")}>
        <FieldGroup>
          <div>
            <h1 className="diseño_titulo_registro">{t("signup.title")}</h1>
            <p className="diseño_subtitulo_registro">
              {t("signup.subtitle")}
            </p>
          </div>

          {error && (
            <div role="alert" className="estilo_error_registro">
              {error}
            </div>
          )}

          {successMessage && (
            <div role="status" className="text-success text-sm">
              {successMessage}
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="nombre">{t("signup.fields.name.label")}</FieldLabel>
            <Input
              id="nombre"
              type="text"
              className="estilo_inputs_registro"
              value={nombre}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setNombre(e.target.value)
              }
              disabled={isLoading}
              placeholder={t("signup.placeholders.name") as string}
              aria-label={t("signup.fields.name.label")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="apodo">{t("signup.fields.username.label")}</FieldLabel>
            <Input
              id="apodo"
              type="text"
              className="estilo_inputs_registro"
              value={apodo}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setApodo(e.target.value)
              }
              disabled={isLoading}
              placeholder={t("signup.placeholders.username") as string}
              aria-label={t("signup.fields.username.label")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="correo">{t("signup.fields.email.label")}</FieldLabel>
            <Input
              id="correo"
              type="email"
              className="estilo_inputs_registro"
              value={correoElectronico}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setCorreoElectronico(e.target.value)
              }
              disabled={isLoading}
              placeholder={t("signup.placeholders.email") as string}
              aria-label={t("signup.fields.email.label")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="contrasena">{t("signup.fields.password.label")}</FieldLabel>
            <Input
              id="contrasena"
              type="password"
              className="estilo_inputs_registro"
              value={contrasena}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setContrasena(e.target.value)
              }
              disabled={isLoading}
              placeholder={t("signup.placeholders.password") as string}
              aria-label={t("signup.fields.password.label")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="confirmContrasena">
              {t("signup.fields.confirmPassword.label")}
            </FieldLabel>
            <Input
              id="confirmContrasena"
              type="password"
              className="estilo_inputs_registro"
              value={confirmContrasena}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setConfirmContrasena(e.target.value)
              }
              disabled={isLoading}
              placeholder={t("signup.placeholders.confirmPassword") as string}
              aria-label={t("signup.fields.confirmPassword.label")}
            />
          </Field>

          <Field>
            <Button type="submit" className=" estilo_boton_registro transition-colors-duration-200" disabled={isLoading}>
              {isLoading ? t("signup.buttons.creating") : t("signup.buttons.create")}
            </Button>
          </Field>

          <Field>
            <div className="pregunta_tienes_cuenta">
              {t("signup.already.text")}{" "}
              <a href="/login" className="diseño_enlace_registro transition-colors-duration-200">
                {t("signup.already.login")}
              </a>
            </div>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}

export default SignupForm;