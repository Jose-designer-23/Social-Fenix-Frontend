import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path';

// Importaciones necesarias para manejar __dirname en ES Modules
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // <-- Esto define __dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Usa el __dirname que acabas de definir
      "@": path.resolve(__dirname, "./src"),
    },
  },
});