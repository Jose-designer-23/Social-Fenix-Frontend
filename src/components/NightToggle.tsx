import useNightMode from "./useNightMode";

export default function NightToggle() {
  const { isNight, setIsNight } = useNightMode(false);

  function toggle() {
    setIsNight(!isNight);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isNight}
      title={isNight ? "Desactivar modo noche" : "Activar modo noche"}
      className={`
        flex cursor-pointer items-center justify-center w-10 h-10 rounded-full
        transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
        ${isNight ? "bg-gray-700 text-white hover:bg-gray-600 focus:ring-gray-500" : "bg-yellow-300 text-black hover:bg-linear-to-bl hover:from-[#ce016e] hover:via-[#e63f58] hover:to-[#e37d01] hover:text-white focus:ring-yellow-500"}
      `}
    >
      {/* Luna para modo noche */}
      {isNight ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21.752 15.002A9.718 9.718 0 0 1 12 22C6.486 22 2 17.514 2 12c0-4.86 3.657-8.86 8.39-9.7a.75.75 0 0 1 .842.94A7.5 7.5 0 1 0 21.81 14.16c.44.03.7.44.-.008.84z" />
        </svg>
      ) : (
        // Sol para modo claro
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zM1 13h3v-2H1v2zm10-9h2V1h-2v3zm7.66 2.05l1.79-1.8-1.41-1.41-1.8 1.79 1.42 1.42zM17 13h3v-2h-3v2zM12 7a5 5 0 100 10 5 5 0 000-10zm4.24 10.16l1.8 1.79 1.41-1.41-1.79-1.8-1.42 1.42zM6.76 19.16l-1.79 1.8 1.41 1.41 1.8-1.79-1.42-1.42zM12 23h2v-3h-2v3z" />
        </svg>
      )}
    </button>
  );
}