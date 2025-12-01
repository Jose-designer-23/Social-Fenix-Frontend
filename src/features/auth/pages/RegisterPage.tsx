
import { SignupForm } from "@/components/signup-form"

export default function RegisterPage() {
  return (
    // Columna de la izquierda, formulario de registro
    <div className="estructura_registro">
      <div className="estructura_caja_formulario_registro">
        <div className="estructura_formulario_registro">
          <div className="diseño_caja_formulario_registro">
            <SignupForm />
          </div>
        </div>
      </div>
      {/* // Columna de la derecha, logo*/}
      <div className="estructura_columna_logo">
        <img
          src="/img/Logo_fenix_5.png"
          alt="Imagen de bienvenida"
          className="estilo_logo tamaño_logo centrar_logo"
         
        />
      </div>
    </div>
  )
}
