import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { isChromeOnly } from "@/lib/isChromeOnly";
import { useTranslation } from "react-i18next";

export type LandingFeaturesHandle = {
  openAndShowFirst: () => void;
  next: () => void;
  show?: (index: number) => void;
};

type Props = {
  onSlideChange?: (index: number) => void;
};

type SlideMeta = {
  key: string; // slug key used for translation
  img: string;
};

const slidesMeta: SlideMeta[] = [
  { key: "feed", img: "/img/Feed-4.png" },
  { key: "comments", img: "/img/Comentarios-4.png" },
  { key: "notifications", img: "/img/Notificaciones-5.png" },
  { key: "profile", img: "/img/Perfil-4.png" },
  { key: "chat", img: "/img/Chat-4.png" },
];

const LAST_INDEX = slidesMeta.length - 1;
const MOBILE_BREAKPOINT = 1000; // <=1000px => carousel mode

const LandingFeatures = forwardRef<LandingFeaturesHandle, Props>(({ onSlideChange }, ref) => {
  const { t } = useTranslation();

  const slideElsRef = useRef<HTMLElement[]>([]);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const currentSlideRef = useRef<number>(0);

  const [isCarousel, setIsCarousel] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });

  // Ref para ignorar updates por scroll cuando hacemos scroll programático
  const programmaticScrollRef = useRef<boolean>(false);
  const programmaticTimeoutRef = useRef<number | null>(null);

  // touch handling for carousel
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  // Detect Chrome once (cliente)
  const chromeOnly = typeof navigator !== "undefined" && isChromeOnly();
  // Timeout mayor solo para Chrome
  const PROGRAMMATIC_TIMEOUT = chromeOnly ? 1000 : 800;

  // Añadimos clase en <html> para scoping CSS solo a Chrome
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    if (chromeOnly) {
      html.classList.add("is-chrome");
    } else {
      html.classList.remove("is-chrome");
    }
    return () => {
      html.classList.remove("is-chrome");
    };
  }, [chromeOnly]);

  // Keep ref in sync
  useEffect(() => {
    currentSlideRef.current = currentSlide;
    if (typeof onSlideChange === "function") onSlideChange(currentSlide);
  }, [currentSlide, onSlideChange]);

  // Resize listener toggles mode
  useEffect(() => {
    const onResize = () => {
      const nowCarousel = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsCarousel(nowCarousel);
    };
    window.addEventListener("resize", onResize);
    // inicial
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // SCROLL MODE: update active slide based on center proximity
  useEffect(() => {
    if (isCarousel) return; // solo en modo desktop
    let ticking = false;

    const updateActiveSlide = () => {
      // ignorar si estamos en scroll programático
      if (programmaticScrollRef.current) return;

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

    // initial check
    updateActiveSlide();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isCarousel]);

  // scrollToSlide helper (desktop) / carousel change (mobile)
  const scrollToSlide = (index: number) => {
    const clamped = Math.max(0, Math.min(index, LAST_INDEX));
    if (isCarousel) {
      // en carousel solo actualizamos índice (la UI renderará la imagen)
      setCurrentSlide(clamped);
      currentSlideRef.current = clamped;
      return;
    }
    const el = document.getElementById(`landing-slide-${clamped}`);
    if (el) {
      // Actualizamos el estado inmediatamente para que el panel derecho se sincronice
      setCurrentSlide(clamped);
      currentSlideRef.current = clamped;

      // marcamos que vamos a hacer un scroll programático para que el detector ignore cambios momentáneos
      programmaticScrollRef.current = true;
      if (programmaticTimeoutRef.current) {
        window.clearTimeout(programmaticTimeoutRef.current);
      }
      // tiempo suficiente para que el scroll smooth termine y el navegador estabilice layout
      programmaticTimeoutRef.current = window.setTimeout(() => {
        programmaticScrollRef.current = false;
        programmaticTimeoutRef.current = null;
      }, PROGRAMMATIC_TIMEOUT);

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
    show(index: number) {
      scrollToSlide(index);
    },
  }));

  // limpia timeouts si desmonta el componente
  useEffect(() => {
    return () => {
      if (programmaticTimeoutRef.current) {
        window.clearTimeout(programmaticTimeoutRef.current);
        programmaticTimeoutRef.current = null;
      }
    };
  }, []);

  const setSlideRef = (index: number, el: HTMLElement | null) => {
    slideElsRef.current[index] = el as HTMLElement;
  };

  // Carousel controls & touch handlers
  const prevCarousel = () => {
    setCurrentSlide((p) => Math.max(0, p - 1));
  };
  const nextCarousel = () => {
    setCurrentSlide((p) => Math.min(LAST_INDEX, p + 1));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    if (touchStartX.current === null) return;
    const threshold = 50; // pixels
    if (touchDeltaX.current > threshold) {
      // swipe right => prev
      prevCarousel();
    } else if (touchDeltaX.current < -threshold) {
      // swipe left => next
      nextCarousel();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  return (
    <section id="landing-features" className="landing_features bg-[#130c2b]">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* LEFT: image slider / carousel */}
        <div className="image-slider w-full">
          {isCarousel ? (
            // CAROUSEL MODE (mobile)
            <div
              className="relative w-full md:mt-60 lg:mt-60 flex items-center justify-center"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <div className="w-full max-w-3xl mx-auto">
                <div className="relative overflow-hidden">
                  <img
                    src={slidesMeta[currentSlide].img}
                    alt={t(`landing.slides.${slidesMeta[currentSlide].key}.title`)}
                    className="landing-img block mx-auto"
                    draggable={false}
                  />

                  {/* prev / next overlays (solo visibles si hay slide anterior/siguiente) */}
                  <button
                    aria-label={t("landing.controls.prev")}
                    onClick={prevCarousel}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 cursor-pointer rounded-full bg-white/90 flex items-center justify-center shadow-md"
                    style={{ display: currentSlide === 0 ? "none" : undefined }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    aria-label={t("landing.controls.next")}
                    onClick={nextCarousel}
                    className="absolute right-2 top-1/2 cursor-pointer -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md"
                    style={{ display: currentSlide === LAST_INDEX ? "none" : undefined }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* dots bajo la imagen (mobile) */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {slidesMeta.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentSlide(idx)}
                        className={`w-2.5 h-2.5 rounded-full ${idx === currentSlide ? "bg-white" : "bg-white/30"}`}
                        aria-label={t("landing.controls.goTo", { index: idx + 1 })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // DESKTOP MODE (scroll sections)
            <>
              {slidesMeta.map((s, i) => (
                <section
                  id={`landing-slide-${i}`}
                  key={i}
                  ref={(el) => setSlideRef(i, el)}
                  className="landing_slide snap-start relative w-full min-h-screen flex items-center justify-center"
                >
                  <img
                    src={s.img}
                    alt={t(`landing.slides.${s.key}.title`)}
                    className="landing-img block mx-auto"
                    draggable={false}
                  />

                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
                    <button
                      type="button"
                      aria-label={i < LAST_INDEX ? t("landing.controls.next") : t("landing.controls.backToLogin")}
                      onClick={() => {
                        if (i < LAST_INDEX) scrollToSlide(i + 1);
                        else {
                          const loginEl = document.getElementById("login-section");
                          if (loginEl) loginEl.scrollIntoView({ behavior: "smooth" });
                          else window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                      className="w-12 h-12 cursor-pointer rounded-full bg-white/90 flex items-center justify-center shadow-lg text-slate-800 hover:bg-white/95"
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
            </>
          )}
        </div>

        {/* RIGHT: panel textual */}
        <aside className="flex flex-col justify-center items-center md:items-start text-center md:text-left text-white px-4 md:sticky md:top-0 md:h-screen">
          <div className="mx-auto md:mx-0">
            <h2 className="text-4xl md:text-4xl lg:text-5xl font-extrabold mb-6">
              {t(`landing.slides.${slidesMeta[currentSlide].key}.title`)}
            </h2>

            {t(`landing.slides.${slidesMeta[currentSlide].key}.features_count`, { returnObjects: false }) !== "0" &&
            Array.isArray(((): unknown => {
              // We will attempt to read features as an array from translations using returnObjects
              // but as a safe fallback we use desc if no features array exists.
              return t(`landing.slides.${slidesMeta[currentSlide].key}.features`, { returnObjects: true });
            })()) ? (
              <ol className="list-decimal text-justify list-inside space-y-3 text-lg leading-relaxed max-w-xl">
                {(
                  t(`landing.slides.${slidesMeta[currentSlide].key}.features`, { returnObjects: true }) as string[]
                ).map((f, idx) => (
                  <li key={idx} className="ml-2">
                    {f}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-lg leading-relaxed max-w-xl">
                {t(`landing.slides.${slidesMeta[currentSlide].key}.desc`)}
              </p>
            )}

            <div className="mt-8 flex gap-2">
              {slidesMeta.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToSlide(idx)}
                  className={`w-3 h-3 rounded-full ${idx === currentSlide ? "bg-white" : "bg-white/30"}`}
                  aria-label={t("landing.controls.goTo", { index: idx + 1 })}
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