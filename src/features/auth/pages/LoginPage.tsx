import { useRef, useState, useEffect } from "react";
import { LoginForm } from "@/components/login-form.tsx";
import LandingFeatures, {
  LandingFeaturesHandle,
} from "@/features/landing/LandingFeatures.tsx";

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
  const el = document.getElementById("landing-features");

  // If landing section is not found, fallback to original logic (scroll to top / next)
  if (!el) {
    // If we are not at last slide, try to advance
    if (currentSlide < lastIndex) {
      if (landingRef.current && typeof landingRef.current.next === "function") {
        landingRef.current.next();
        return;
      }
    }
    // otherwise return to login
    const loginEl = document.getElementById("login-section");
    if (loginEl) loginEl.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const isVisible =
    el.getBoundingClientRect().top >= 0 &&
    el.getBoundingClientRect().top < window.innerHeight;

  // Si la sección NO está visible -> scroll hacia ella y forzamos openAndShowFirst en el landing.
  if (!isVisible) {
    // calculamos la posición absoluta del elemento (teniendo en cuenta scrollY)
    const top = el.getBoundingClientRect().top + window.scrollY;

    // offset opcional para evitar elementos fixed que oculten parte del contenido
    const OFFSET = 20;
    window.scrollTo({ top: Math.max(0, top - OFFSET), behavior: "smooth" });

    // Llamamos a openAndShowFirst si existe: primero inmediatamente (inicia carousel),
    // y otra vez tras un pequeño delay para asegurar que el slide se muestre cuando termine el scroll.
    if (landingRef.current && typeof landingRef.current.openAndShowFirst === "function") {
      try { landingRef.current.openAndShowFirst(); } catch {}
      setTimeout(() => {
        if (landingRef.current && typeof landingRef.current.openAndShowFirst === "function") {
          try { landingRef.current.openAndShowFirst(); } catch {}
        }
      }, 450); // 450ms suele ser suficiente incluso en móviles; ajustar si necesario
    }
    return;
  }

  // Si la sección ya está visible -> avanzamos slide (comportamiento previo)
  if (currentSlide < lastIndex) {
    if (landingRef.current && typeof landingRef.current.next === "function") {
      landingRef.current.next();
    }
    return;
  }

  // Si estamos en la última -> volver al login
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
            <img
              src="/img/Slogan_17.png"
              alt="Imagen del slogan"
              className="diseño_slogan"
            />
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
      <LandingFeatures
        ref={landingRef}
        onSlideChange={(idx) => setCurrentSlide(idx)}
      />
      {/* Botón fijo en el login que controla las diapositivas
          Se renderiza sólo cuando la sección landing NO está visible para evitar duplicar la flecha */}
      {!landingVisible && (
        // Contenedor fixed responsive:
        // - En pantallas >= lg (>=1024px) centrado abajo y muestra la palabra "Características".
        // - En pantallas < lg se mueve a la esquina inferior derecha, texto oculto y muestra un icono encima del botón.
        <div
          className="
            fixed z-50 pointer-events-auto flex flex-col items-center gap-2
            right-4 bottom-4
            lg:left-1/2 lg:-translate-x-1/2 lg:bottom-6
          "
        >
          <div className="text-center flex flex-col items-center">
            {/* Texto completo sólo en pantallas grandes */}
            <p className="text-white text-md font-bold select-none hidden lg:block">Características</p>

            {/* Icono (se muestra en pantallas pequeñas cuando el texto está oculto) */}
            <div className="lg:hidden">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-white/90 max-[500px]:text-black"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                role="img"
              >
                {/* Icono simple: lista/marcadores que simboliza "características" */}
                <path d="M8 6h13M8 12h13M8 18h13" />
                <path d="M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </div>
          </div>

          {/* Botón: reducido en pantallas pequeñas para no tapar enlaces */}
          <button
            aria-label={currentSlide < 4 ? "Ver características" : "Volver al inicio"}
            onClick={scrollToLanding}
            type="button"
            className="
              w-10 h-10 lg:w-12 lg:h-12 cursor-pointer rounded-full flex items-center justify-center
              bg-white/90 shadow-lg  text-slate-800 hover:bg-white/95
            "
          >
            {currentSlide < 4 ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>
      )}
    </>
  );
}
