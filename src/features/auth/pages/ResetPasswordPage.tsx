import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";
import LanguageSwitcherLogin from "@/components/LanguageSwitcherLogin.tsx";

export default function ResetPasswordPage() {
  return (
    <div className="estructura_login">
      <div className="estructura_columna_formulario">
        <div className="absolute top-4 right-4 z-10">
          <LanguageSwitcherLogin />
        </div>
        <div className="estructura_slogan">
          <img
            src="/img/Slogan_17.png"
            alt="Imagen del slogan"
            className="diseño_slogan"
          />
        </div>

        <div className="estructura_caja_formulario">
          <div className="estilo_caja_formulario">
            <ResetPasswordForm />
          </div>
        </div>
      </div>

      <div className="estructura_columna_logo">
        <img
          src="/img/Logo_fenix_5.png"
          alt="Imagen de bienvenida"
          className="estilo_logo tamaño_logo centrar_logo"
        />
      </div>
    </div>
  );
}
