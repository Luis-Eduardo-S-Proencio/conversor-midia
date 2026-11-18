import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

interface VercelHeaderRule {
  source: string
  headers: Array<{ key: string; value: string }>
}

/**
 * Os mesmos cabeçalhos de segurança da Vercel (vercel.json) na prévia local, que é onde os
 * testes E2E rodam: assim a CSP de produção é testada antes do deploy. O servidor de
 * desenvolvimento fica sem eles, porque o recarregamento automático usa scripts embutidos.
 */
function productionHeaders(): Record<string, string> {
  const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as { headers?: VercelHeaderRule[] }
  const rule = config.headers?.find((entry) => entry.source === '/(.*)')
  return Object.fromEntries((rule?.headers ?? []).map(({ key, value }) => [key, value]))
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Workers como módulos ES: permitem carregar bibliotecas sob demanda dentro deles (ex.: fflate).
  worker: { format: 'es' },
  build: {
    // Fontes sempre como arquivos: embutidas em base64 (data:) seriam bloqueadas pela CSP (font-src 'self').
    assetsInlineLimit: (filePath) => (filePath.endsWith('.woff2') ? false : undefined),
  },
  preview: { headers: productionHeaders() },
})
