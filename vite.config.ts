import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Workers como módulos ES: permitem carregar bibliotecas sob demanda dentro deles (ex.: fflate).
  worker: { format: 'es' },
})
