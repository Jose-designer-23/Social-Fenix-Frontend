/// <reference types="vite/client" />

// Amplía los tipos de ImportMetaEnv para declarar tus VITE_*
// variables con sus tipos concretos.
// Si no quieres declarar variables específicas puedes dejar
// solo la referencia a "vite/client" y Vite proveerá tipos genéricos.

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_PUBLIC_PATH?: string;
  // Añade aquí tus variables de entorno públicas que empiecen con VITE_
  // readonly VITE_MY_FLAG?: 'on' | 'off';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}