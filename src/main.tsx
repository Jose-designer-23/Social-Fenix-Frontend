// main.tsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import './i18n';

// Obtenemos el elemento root en una variable
const rootElement = document.getElementById('root');

// Comprobamos si el elemento existe (¡Esto elimina el error!)
if (!rootElement) {
  // Opcional: lanzar un error si no se encuentra
  throw new Error("El elemento 'root' no fue encontrado en el documento HTML.");
}

// Usamos el elemento encontrado para crear la raíz
// Usamos 'as HTMLElement' para asegurar a TS que es un elemento HTML válido
createRoot(rootElement as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);