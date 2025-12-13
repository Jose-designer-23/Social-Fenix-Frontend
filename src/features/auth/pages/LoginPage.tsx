import { useRef, useState, useEffect } from "react";
import { LoginForm } from "@/components/login-form.tsx";
import LandingFeatures, { LandingFeaturesHandle } from "@/features/landing/LandingFeatures.tsx";

export default function LoginPage() {
  const landingRef = useRef<LandingFeaturesHandle | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Estado que indica si la sección de landing está visible en viewport
  const [landingVisible, setLandingVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById("landing-features");
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setLandingVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.15 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scrollToLanding = () => {
    const lastIndex = 4; // 5 slides (0..4)
    if (currentSlide < lastIndex) {
      const el = document.getElementById("landing-features");
      const isVisible = el
        ? (el.getBoundingClientRect().top >= 0 && el.getBoundingClientRect().top < window.innerHeight)
        : false;

      if (!isVisible) {
        if (landingRef.current && typeof landingRef.current.openAndShowFirst === "function") {
          landingRef.current.openAndShowFirst();
        } else {
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }
        return;
      }

      // section already visible -> advance to next slide
      if (landingRef.current && typeof landingRef.current.next === "function") {
        landingRef.current.next();
      }
      return;
    }

    // If on last slide -> go back to login
    const loginEl = document.getElementById("login-section");
    if (loginEl) loginEl.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div id="login-section" className="estructura_login">
        {/* Columna izquierda */}
        <div className="estructura_columna_formulario">
          <div className="estructura_slogan">
            <img src="/img/Slogan_17.png" alt="Imagen del slogan" className="diseño_slogan" />
          </div>

          <div className="estructura_caja_formulario">
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

      {/* Landing features section */}
      <LandingFeatures ref={landingRef} onSlideChange={(idx) => setCurrentSlide(idx)} />

      {/* Botón fijo en el login que controla las diapositivas
          Se renderiza sólo cuando la sección landing NO está visible para evitar duplicar la flecha */}
      {!landingVisible && (
        <button
          aria-label={currentSlide < 4 ? "Ver características" : "Volver al inicio"}
          className="scroll_down_button"
          onClick={scrollToLanding}
          type="button"
        >
          {currentSlide < 4 ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          )}
        </button>
      )}
    </>
  );
}