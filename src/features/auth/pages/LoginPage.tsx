//src/features/auth/pages/LoginPage.jsx

import { LoginForm } from "@/components/login-form.tsx" 

export default function LoginPage() {
  return (
    <div className="estructura_login">
      {/* Columna izquierda */}
      <div className="estructura_columna_formulario">
        {/* bg-linear-to-br from-[#faea3d] to-[#d0522f] Para degradado del fenix */}

        <div className="estructura_slogan">
           <img
                src="/img/Slogan_17.png"
                alt="Imagen del slogan"
                className="diseño_slogan"
            
            /> 
        </div>

        <div className="estructura_caja_formulario">
          {/* Aumenté el max width y centré con mx-auto */}
          <div className="estilo_caja_formulario">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Columna derecha - imagen de bienvenida */}
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