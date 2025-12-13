import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type LandingFeaturesHandle = {
  openAndShowFirst: () => void;
  next: () => void;
};

type Props = {
  onSlideChange?: (index: number) => void;
};

type Slide = {
  title: string;
  desc?: string;
  img: string;
  features?: string[];
};

const slides: Slide[] = [
  {
    title: "FEED DINÁMICO",
    desc: "Resumen corto del feed.",
    features: [
      "Feed en Tiempo Real - Contenido siempre fresco y al instante.",
      "Solo lo Relevante - Los recuerdos más recientes de tu círculo.",
      "Interacciones Dinámicas - Alto engagement en cada publicación.",
      "Notificaciones Inteligentes - Alertas que se adaptan a ti",
      "Mensajería Integrada - Comunicación instantánea y fluida.",
    ],
    img: "/img/Feed.png",
  },
  {
    title: "HILO DE COMENTARIOS",
    desc: "Explicación breve de los hilos de comentarios.",
    features: [
      "Hilos Profundamente Anidados – Conversaciones organizadas hasta 4 niveles de respuesta.",
      "Reacciones Rápidas - Expresa tu opinión al instante con un like.",
    ],
    img: "/img/Comentarios.png",
  },
  {
    title: "NOTIFICACIONES EN TIEMPO REAL",
    desc: "Explicación del modal de notificaciones.",
    features: [
      "Notificaciones Instantáneas – Infórmate de las interacciones en el momento exacto.",
      "Diseño de Un Vistazo – Interfaz clara y fácil de escanear visualmente.",
      "Agrupación Inteligente – Compactamos eventos para eliminar el ruido y el spam de notificaciones.",
    ],
    img: "/img/Notificaciones.png",
  },
  {
    title: "PERFIL DE USUARIO LLENO DE VIDA",
    desc: "Explicación breve del perfil de usuario.",
    features: [
      "Control de Marca Personal – Personalización completa (avatar, portada, biografía y enlaces).",
      "Tu Portafolio Social – Resalta toda tu actividad: multimedia, likes e interacciones.",
      "Gestión de Redes Clara – Visualiza y administra tus conexiones (seguidores y seguidos) de forma sencilla.",
    ],
    img: "/img/Perfil.png",
  },
  {
    title: "CONVERSACIONES PRIVADAS",
    desc: "Explicación breve del chat privado.",
    features:[
        "Chat en Vivo – Comunicación fluida e instantánea con todos tus contactos.",
        "Alertas Fiables – Notificaciones instantáneas para que nunca pierdas el hilo.",
        "Historial Completo – Accede y retoma tus conversaciones pasadas al instante.",
        "Contexto Temporal – Cada mensaje incluye la hora exacta para una mayor claridad",
    ],
    img: "/img/Chat.png",
  },
];

const LAST_INDEX = slides.length - 1;

const LandingFeatures = forwardRef<LandingFeaturesHandle, Props>(({ onSlideChange }, ref) => {
  const slideElsRef = useRef<HTMLElement[]>([]);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const currentSlideRef = useRef<number>(0);

  useEffect(() => {
    currentSlideRef.current = currentSlide;
    if (typeof onSlideChange === "function") onSlideChange(currentSlide);
  }, [currentSlide, onSlideChange]);

  const scrollToSlide = (index: number) => {
    const el = document.getElementById(`landing-slide-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  useImperativeHandle(ref, () => ({
    openAndShowFirst() {
      scrollToSlide(0);
    },
    next() {
      const nextIdx = Math.min(currentSlideRef.current + 1, LAST_INDEX);
      scrollToSlide(nextIdx);
    },
  }));

  useEffect(() => {
    let ticking = false;

    const updateActiveSlide = () => {
      const els = slideElsRef.current.filter(Boolean);
      if (els.length === 0) return;

      const viewportCenter = window.innerHeight / 2;
      let bestIndex = currentSlideRef.current;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const distance = Math.abs(elCenter - viewportCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }

      if (bestIndex !== currentSlideRef.current) {
        setCurrentSlide(bestIndex);
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          updateActiveSlide();
          ticking = false;
        });
      }
    };

    updateActiveSlide();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const setSlideRef = (index: number, el: HTMLElement | null) => {
    slideElsRef.current[index] = el as HTMLElement;
  };

  return (
    <section id="landing-features" className="landing_features bg-[#130c2b]">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* LEFT: image slider */}
        <div className="image-slider w-full">
          {slides.map((s, i) => (
            <section
              id={`landing-slide-${i}`}
              key={i}
              ref={(el) => setSlideRef(i, el)}
              className="landing_slide snap-start relative w-full min-h-screen flex items-center justify-center"
            >
              <img
                src={s.img}
                alt={s.title}
                className="landing-img block mx-auto"
                draggable={false}
              />

              {/* botón dentro de la slide */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
                <button
                  type="button"
                  aria-label={i < LAST_INDEX ? "Siguiente" : "Volver al login"}
                  onClick={() => {
                    if (i < LAST_INDEX) scrollToSlide(i + 1);
                    else {
                      const loginEl = document.getElementById("login-section");
                      if (loginEl) loginEl.scrollIntoView({ behavior: "smooth" });
                      else window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg text-slate-800 hover:bg-white/95"
                >
                  {i < LAST_INDEX ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </button>
              </div>
            </section>
          ))}
        </div>

        {/* RIGHT: panel textual */}
        {/* IMPORTANTE: en pantallas md+ hacemos el aside STICKY y con altura 100vh para que quede fijo en el viewport */}
        <aside className="flex flex-col justify-center items-center md:items-start text-center md:text-left text-white px-4 md:sticky md:top-0 md:h-screen">
          <div className="mx-auto md:mx-0">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">{slides[currentSlide].title}</h2>

            {slides[currentSlide].features && slides[currentSlide].features.length > 0 ? (
              <ol className="list-decimal list-inside space-y-3 text-lg leading-relaxed max-w-xl">
                {slides[currentSlide].features.map((f, idx) => (
                  <li key={idx} className="ml-2">{f}</li>
                ))}
              </ol>
            ) : (
              <p className="text-lg leading-relaxed max-w-xl">{slides[currentSlide].desc}</p>
            )}

            <div className="mt-8 flex gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToSlide(idx)}
                  className={`w-3 h-3 rounded-full ${idx === currentSlide ? "bg-white" : "bg-white/30"}`}
                  aria-label={`Ir a slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
});

export default LandingFeatures;