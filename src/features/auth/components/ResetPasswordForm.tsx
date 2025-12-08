import { useState, type FormEvent, type ChangeEvent, useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Misma regex que usas en SignupForm
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

export default function ResetPasswordForm() {
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
    if (!token || !token.trim()) return "El token es obligatorio.";

    if (!newPassword) return "La contraseña es obligatoria.";

    if (newPassword.length < 8)
      return "La contraseña debe tener al menos 8 caracteres.";

    if (newPassword.length > 100)
      return "La contraseña no puede exceder los 100 caracteres.";

    if (!PASSWORD_REGEX.test(newPassword)) {
      return "La contraseña debe contener al menos una minúscula, una mayúscula, un número y un carácter especial.";
    }

    if (newPassword !== confirmPassword) return "Las contraseñas no coinciden.";

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

      toast.success("Contraseña cambiada con éxito");
      navigate("/login");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as any)?.message ??
          "Error desconocido. Inténtalo de nuevo.";
        setError(String(msg));
        toast.error(String(msg));
      } else {
        setError("Error desconocido. Inténtalo de nuevo.");
        toast.error("Error desconocido. Inténtalo de nuevo.");
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
            <h1 className="diseño_titulo_formulario">Restablecer contraseña</h1>
            <p className="diseño_subtitulo_formulario">
              Introduce tu nueva contraseña. Si accediste desde el enlace del correo, el token ya estará prellenado.
            </p>
          </div>

          {error && (
            <div role="alert" className="error_formulario">
              {error}
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="token" className="estilo_etiqueta_contraseña_olvidada">
              Token (desde el enlace)
            </FieldLabel>
            <Input
              id="token"
              type="text"
              value={token}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setToken(e.target.value)}
              disabled={isLoading}
              className="relleno_input_formulario"
            />
            <p className="text-sm text-slate-600 mt-2">
              Si llegaste desde el correo de recuperación, no necesitas cambiar este valor.
            </p>
          </Field>

          <Field>
            <FieldLabel htmlFor="newPassword" className="estilo_etiqueta_contraseña_olvidada">
              Nueva contraseña
            </FieldLabel>
            <Input
              id="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
              disabled={isLoading}
              className="relleno_input_formulario"
              placeholder="8+ letras, mayús, minús, num, c.esp"
            />
            <p className="text-sm text-slate-600 mt-2">
              La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas, un número y un carácter especial.
            </p>
          </Field>

          <Field>
            <FieldLabel htmlFor="confirmPassword" className="estilo_etiqueta_contraseña_olvidada">
              Confirma la nueva contraseña
            </FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="relleno_input_formulario"
              placeholder="Repite tu nueva contraseña"
            />
          </Field>

          <Field>
            <Button
              type="submit"
              disabled={isLoading}
              className="estilo_boton_inicio_sesion"
            >
              {isLoading ? "Restableciendo..." : "Restablecer contraseña"}
            </Button>
          </Field>

          <Field>
            <div className="diseño_pregunta_registro">
              ¿Recordaste tu contraseña?{" "}
              <a href="/login" className="diseño_enlace_registro">
                Inicia sesión
              </a>
            </div>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}