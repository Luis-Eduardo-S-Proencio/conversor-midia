import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

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

/** Arquivos das fontes usadas logo na primeira tela (texto e títulos), só o subconjunto latino. */
const PRELOADED_FONTS = [/inter-latin-wght-normal-[\w-]+\.woff2$/, /bricolage-grotesque-latin-wght-normal-[\w-]+\.woff2$/]

/**
 * Preload das duas fontes principais no index.html do build: o navegador as baixa junto com o
 * CSS, em vez de só descobrir que precisa delas depois de montar a página (o texto não "pula").
 */
function preloadFonts(): Plugin {
  return {
    name: 'media-tools:preload-fonts',
    apply: 'build',
    transformIndexHtml(_html, context) {
      const files = Object.keys(context.bundle ?? {}).filter((file) => PRELOADED_FONTS.some((pattern) => pattern.test(file)))
      return files.map((file) => ({
        tag: 'link',
        attrs: { rel: 'preload', href: `/${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
        injectTo: 'head',
      }))
    },
  }
}

/** Versão mostrada no Sobre: a do package.json, num lugar só. */
const APP_VERSION = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), preloadFonts()],
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  // Workers como módulos ES: permitem carregar bibliotecas sob demanda dentro deles (ex.: fflate).
  worker: { format: 'es' },
  build: {
    // Fontes sempre como arquivos: embutidas em base64 (data:) seriam bloqueadas pela CSP (font-src 'self').
    assetsInlineLimit: (filePath) => (filePath.endsWith('.woff2') ? false : undefined),
  },
  preview: { headers: productionHeaders() },
})
