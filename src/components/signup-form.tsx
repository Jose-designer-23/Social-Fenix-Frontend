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
//Usamos expresiones regulares para validar apodo y contraseña
const APODO_REGEX = /^[a-zA-Z0-9_]+$/;
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

// Creamos los estados y funciones necesarias para el formulario de registro
export function SignupForm({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
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
    if (!nombre.trim()) return "El nombre es obligatorio.";

    if (nombre.trim().length > 100)
      return "El nombre no puede exceder los 100 caracteres.";

    if (!apodo.trim()) return "El apodo es obligatorio.";

    if (apodo.trim().length < 3)
      return "El apodo debe tener al menos 3 caracteres.";

    if (apodo.trim().length > 50)
      return "El apodo no puede exceder los 50 caracteres.";

    if (!APODO_REGEX.test(apodo.trim()))
      return "El apodo solo puede contener letras, números y guiones bajos (_).";

    if (!correoElectronico.trim())
      return "El correo electrónico es obligatorio.";

    if (!/^\S+@\S+\.\S+$/.test(correoElectronico.trim()))
      return "El formato del correo electrónico no es válido.";

    if (!contrasena) return "La contraseña es obligatoria.";

    if (contrasena.length < 8)
      return "La contraseña debe tener al menos 8 caracteres.";

    if (contrasena.length > 100)
      return "La contraseña no puede exceder los 100 caracteres.";

    if (!PASSWORD_REGEX.test(contrasena)) {
      return "La contraseña debe contener al menos una minúscula, una mayúscula, un número y un carácter especial.";
    }
    if (contrasena !== confirmContrasena)
      return "Las contraseñas no coinciden.";
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
        "http://localhost:3000/user/register",
        payload
      );

      if (response?.status >= 200 && response?.status < 300) {
        setSuccessMessage("Registro exitoso. Redirigiendo al login...");
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
          "Respuesta inesperada del servidor.";
        setError(String(msg));
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const serverMessage = (err.response?.data as any)?.message;
        if (serverMessage) {
          setError(String(serverMessage));
        } else if (err.response?.status === 400) {
          setError("Datos inválidos. Revisa los campos.");
        } else if (err.response?.status === 409) {
          setError("El apodo o correo electrónico ya están en uso.");
        } else {
          setError("Error de conexión con el servidor. Inténtalo más tarde.");
        }
      } else {
        setError("Error desconocido. Inténtalo de nuevo.");
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
            <h1 className="diseño_titulo_registro">Crea tu cuenta en SocialFénix</h1>
            <p className="diseño_subtitulo_registro">
              Regístrate rellenando estos campos.
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
            <FieldLabel htmlFor="nombre">Nombre completo</FieldLabel>
            <Input
              id="nombre"
              type="text"
              className="estilo_inputs_registro"
              value={nombre}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setNombre(e.target.value)
              }
              disabled={isLoading}
              placeholder="Ej. Juan Pérez"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="apodo">Nombre de usuario</FieldLabel>
            <Input
              id="apodo"
              type="text"
              className="estilo_inputs_registro"
              value={apodo}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setApodo(e.target.value)
              }
              disabled={isLoading}
              placeholder="Ej. juan_perez"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="correo">Correo electrónico</FieldLabel>
            <Input
              id="correo"
              type="email"
              className="estilo_inputs_registro"
              value={correoElectronico}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setCorreoElectronico(e.target.value)
              }
              disabled={isLoading}
              placeholder="ejemplo@correo.com"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="contrasena">Contraseña</FieldLabel>
            <Input
              id="contrasena"
              type="password"
              className="estilo_inputs_registro"
              value={contrasena}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setContrasena(e.target.value)
              }
              disabled={isLoading}
              placeholder="8+ letras, mayús, minús, num, c.esp"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="confirmContrasena">
              Confirma la contraseña
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
              placeholder="Repite tu contraseña"
            />
          </Field>

          <Field>
            <Button type="submit" className=" estilo_boton_registro transition-colors-duration-200" disabled={isLoading}>
              {isLoading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </Field>

          <Field>
            <div className="pregunta_tienes_cuenta">
              ¿Ya tienes cuenta?{" "}
              <a href="/login" className="diseño_enlace_registro transition-colors-duration-200">
                Inicia sesión
              </a>
            </div>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}

export default SignupForm;
