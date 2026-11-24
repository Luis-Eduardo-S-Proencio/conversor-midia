import { defineConfig, devices } from '@playwright/test'

// O app é testado no build de produção (preview); a vitrine só existe no servidor de desenvolvimento.
const PREVIEW_URL = 'http://localhost:4173'
const DEV_URL = 'http://localhost:5173'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'retain-on-failure', locale: 'pt-BR' },
  projects: [
    {
      name: 'desktop',
      testIgnore: /design-system/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, baseURL: PREVIEW_URL },
    },
    {
      name: 'tablet',
      testIgnore: /design-system/,
      use: { browserName: 'chromium', viewport: { width: 768, height: 1024 }, hasTouch: true, baseURL: PREVIEW_URL },
    },
    {
      name: 'mobile',
      testIgnore: /design-system/,
      use: {
        browserName: 'chromium',
        viewport: { width: 360, height: 780 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        baseURL: PREVIEW_URL,
      },
    },
    // Os codificadores de imagem e de vídeo variam entre motores: as ferramentas também rodam no Firefox e no WebKit.
    {
      name: 'firefox',
      // Só arquivos de teste: o auxiliar video-tool.ts também tem "video" no nome.
      testMatch: /(convert|compress|resize|rotate|crop|video-edit|video-crop|video-compress|video-audio|video-resize|video-convert|video-gif|compare-result)\.spec\.ts$/,
      timeout: 60_000, // o Firefox abre páginas mais devagar neste ambiente, sobretudo em paralelo
      // Com muitos Firefox ao mesmo tempo, a suíte completa travava de vez em quando fora do código do app
      // (envio de arquivos, download, abertura da página) e nunca isolada. Dois por vez evitam a disputa.
      workers: 2,
      use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 }, baseURL: PREVIEW_URL },
    },
    {
      name: 'webkit',
      testMatch: /(convert|compress|resize|rotate|crop|video-edit|video-crop|video-compress|video-audio|video-resize|video-convert|video-gif|compare-result)\.spec\.ts$/,
      use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 }, baseURL: PREVIEW_URL },
    },
    {
      name: 'vitrine',
      testMatch: /design-system/,
      use: { ...devices['Desktop Chrome'], baseURL: DEV_URL },
    },
  ],
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: PREVIEW_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: DEV_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
