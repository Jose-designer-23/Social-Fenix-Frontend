import { useState, type FormEvent, type ChangeEvent } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function ForgotPasswordForm() {
  const [correo, setCorreo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/auth/forgot-password`, {
        correo_electronico: correo,
      });

      // Si devuelve 200 -> asumimos éxito
      toast.success("Correo enviado con éxito");
      // Mantener en la misma página o redirigir a login según prefieras:
      navigate("/login");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const message =
          (err.response?.data as any)?.message ??
          "Error desconocido. Inténtalo de nuevo.";

        if (status === 404) {
          // Caso: correo no asociado
          toast.error("Ese correo electrónico no está asociado a ninguna cuenta.");
        } else {
          toast.error(String(message));
        }
      } else {
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
            <h1 className="diseño_titulo_formulario">Recuperar contraseña</h1>
            <p className="diseño_subtitulo_formulario">
              Introduce el correo asociado a tu cuenta y te enviaremos un enlace para restablecerla.
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="correo" className="estilo_etiqueta_contraseña_olvidada">
              Correo electrónico
            </FieldLabel>
            <Input
              id="correo"
              type="email"
              required
              value={correo}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCorreo(e.target.value)}
              disabled={isLoading}
              className="relleno_input_formulario"
            />
            <p className="text-sm text-slate-600 mt-2">
              Revisa tu carpeta de spam, posiblemente el correo esté en spam.
            </p>
          </Field>

          <Field>
            <Button type="submit" disabled={isLoading} className="estilo_boton_inicio_sesion">
              {isLoading ? "Enviando..." : "Enviar correo de recuperación"}
            </Button>
          </Field>

          <Field>
            <div className="diseño_pregunta_registro">
              ¿Recuerdas tu contraseña?{" "}
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