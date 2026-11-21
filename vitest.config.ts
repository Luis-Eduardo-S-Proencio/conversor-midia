import { playwright } from '@vitest/browser-playwright'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Dois projetos: lógica pura roda em Node; componentes rodam em navegador real
// (jsdom não implementa Canvas nem layout, então não serve para a interface).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            // Sem isto o Vitest troca todo CSS por vazio, inclusive `tokens.css?raw`.
            css: true,
            include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
          },
        },
        {
          extends: true,
          // Importado só sob demanda, dentro do Worker: sem isto o Vite o descobre no meio dos testes e
          // recarrega a página, derrubando os que estiverem rodando.
          optimizeDeps: { include: ['@mediabunny/mp3-encoder'] },
          test: {
            name: 'browser',
            include: ['src/**/*.test.tsx'],
            setupFiles: ['./src/test/setup-browser.ts'],
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: 'chromium' }],
            },
          },
        },
      ],
    },
  }),
)
