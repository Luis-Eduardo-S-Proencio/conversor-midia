import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test as base, type Page } from '@playwright/test'
import { preview } from 'vite'
import { button, download, expectImage, fileInput, fixture, openImageTool } from './image-tool.ts'
import { OPEN_TIMEOUT, audioSignature, probeAudio, trackCspViolations, videoFixture } from './video-tool.ts'

const DIST = fileURLToPath(new URL('../../dist', import.meta.url))

/**
 * Cada teste tem a própria prévia do build (mesmos cabeçalhos do vercel.json), que é desligada para
 * simular a falta de internet. O modo offline do Playwright não serve: no Firefox ele não alcança os
 * pedidos do service worker. Servidor desligado vale igual em todos os motores.
 */
interface Site {
  url: string
  stop: () => Promise<void>
}

/** Prévia de uma pasta de build; com `port`, na mesma origem de uma prévia anterior (um "deploy" novo). */
async function startSite({ outDir = DIST, port = 0 }: { outDir?: string; port?: number } = {}): Promise<Site> {
  const server = await preview({ logLevel: 'silent', build: { outDir }, preview: { port, strictPort: port !== 0, open: false } })
  const url = server.resolvedUrls?.local[0]
  if (!url) throw new Error('A prévia não informou o endereço.')
  let stopped = false
  return {
    url,
    stop: async () => {
      if (stopped) return
      stopped = true
      await server.close()
    },
  }
}

const test = base.extend<{ site: Site }>({
  // oxlint-disable-next-line no-empty-pattern -- o Playwright exige a desestruturação mesmo sem dependências
  site: async ({}, provide) => {
    const site = await startSite()
    await provide(site)
    await site.stop()
  },
  // Cada prévia tem a sua porta, logo a sua origem: o teste começa sem service worker nem cache.
  baseURL: async ({ site }, provide) => provide(site.url),
})

// Os outros testes bloqueiam o service worker (playwright.config.ts) para cada um começar do zero;
// aqui ele é o assunto.
test.use({ serviceWorkers: 'allow' })

/** MP3 sem internet: o Worker de vídeo e o codificador vêm do cache. Com vários navegadores ao mesmo tempo, demora. */
const PROCESS_TIMEOUT = 30_000

/** Abre o app com internet e espera o service worker guardar os arquivos e assumir a página. */
async function cacheApp(page: Page) {
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
}

/** Desliga o servidor e confere que a rede caiu de fato, inclusive para o service worker. */
async function goOffline(site: Site, page: Page) {
  await site.stop()
  const outcome = await page.evaluate(() =>
    fetch(`/fora-do-cache-${Date.now()}.txt`).then(
      () => 'respondeu',
      () => 'falhou',
    ),
  )
  expect(outcome).toBe('falhou')
}

test.describe('Sem internet', () => {
  test('o app abre em qualquer rota, inclusive as páginas carregadas sob demanda', async ({ page, site }, testInfo) => {
    test.skip(!['desktop', 'firefox', 'webkit'].includes(testInfo.project.name), 'não depende da largura')
    await cacheApp(page)
    await goOffline(site, page)

    // Endereço digitado direto (navegação nova), não só links dentro do app.
    const videos = await page.goto('/videos')
    expect(videos?.fromServiceWorker()).toBe(true)
    // A página guardada mantém os cabeçalhos de segurança do servidor (ver security.spec.ts).
    const headers = videos?.headers() ?? {}
    expect(headers['content-security-policy']).toContain("default-src 'self'")
    expect(headers['x-content-type-options']).toBe('nosniff')
    await expect(page.getByRole('heading', { level: 1, name: 'Vídeos' })).toBeVisible()

    await page.goto('/sobre')
    await expect(page.getByRole('heading', { level: 1, name: 'Sobre', exact: true })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Sobre', exact: true })).toBeVisible()

    // Arquivo do site aberto direto continua sendo ele, não a página do app.
    await page.goto('/licencas/lame-lgpl.txt')
    await expect(page.getByText('GNU LIBRARY GENERAL PUBLIC LICENSE')).toBeVisible()
  })

  test('converte uma imagem', async ({ page, site }, testInfo) => {
    test.skip(!['desktop', 'firefox', 'webkit'].includes(testInfo.project.name), 'não depende da largura')
    await cacheApp(page)
    await goOffline(site, page)

    await openImageTool(page, '/imagens/converter', 'Converter imagem')
    await fileInput(page).setInputFiles(fixture('quadrantes.png'))
    await page.getByRole('radio', { name: 'WEBP' }).click()
    await button(page, 'Converter').click()

    await expect(page.getByRole('heading', { name: 'Imagem convertida' })).toBeFocused()
    const result = await download(page, button(page, 'Baixar imagem'))
    expect(result.name).toBe('quadrantes.webp')
    expectImage(result.bytes, 'webp', 64, 64)
  })

  test('extrai o som em MP3 (Worker de vídeo e codificador em WebAssembly)', async ({ page, site }, testInfo) => {
    test.skip(!['desktop', 'firefox', 'webkit'].includes(testInfo.project.name), 'não depende da largura')
    const violations = await trackCspViolations(page)
    await cacheApp(page)
    await goOffline(site, page)

    await page.goto('/videos/extrair-audio')
    await expect(page.getByRole('heading', { level: 1, name: 'Extrair áudio' })).toBeVisible()
    await fileInput(page).setInputFiles(videoFixture('segundos.mp4'))
    const mp3 = page.getByRole('radio', { name: 'MP3' })
    await expect(mp3).toBeVisible({ timeout: OPEN_TIMEOUT })
    test.skip(await mp3.isDisabled(), 'este motor não consegue gerar MP3 a partir deste som (a página explica)')
    await mp3.click()
    await button(page, 'Extrair áudio').click()

    await expect(page.getByRole('heading', { name: 'Áudio extraído' })).toBeFocused({ timeout: PROCESS_TIMEOUT })
    const result = await download(page, button(page, 'Baixar áudio'))
    expect(audioSignature(result.bytes)).toBe('mp3')
    expect((await probeAudio(result.bytes)).duration).toBeCloseTo(4, 1)
    expect(violations).toEqual([])
  })
})

/** Nome do cache da versão gravada no sw.js de uma pasta de build. */
async function cacheNameIn(dir: string): Promise<string> {
  const version = /"version":"([^"]+)"/.exec(await readFile(join(dir, 'sw.js'), 'utf8'))?.[1]
  if (!version) throw new Error('sw.js sem versão')
  return `media-tools-${version}`
}

/**
 * Simula um deploy na pasta: versão nova no sw.js (como se algum arquivo tivesse mudado) e uma marca no
 * index.html, para saber qual versão a página abriu.
 */
async function publishRelease(dir: string, release: number): Promise<void> {
  const swPath = join(dir, 'sw.js')
  const sw = await readFile(swPath, 'utf8')
  await writeFile(swPath, sw.replace(/"version":"([0-9a-f]+)(-\d+)?"/, `"version":"$1-${release}"`))
  const htmlPath = join(dir, 'index.html')
  const html = (await readFile(htmlPath, 'utf8')).replace(/<meta name="release"[^>]*>/, '')
  await writeFile(htmlPath, html.replace('</head>', `<meta name="release" content="${release}"></head>`))
}

const versionCaches = (page: Page) =>
  page.evaluate(async () => (await caches.keys()).filter((name) => name.startsWith('media-tools-')).sort())

/** A versão nova está ativa e assumiu a página, sem outra instalando ou esperando. */
const updateSettled = (page: Page) =>
  page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    return (
      registration?.active?.state === 'activated' &&
      !registration.installing &&
      !registration.waiting &&
      navigator.serviceWorker.controller === registration.active
    )
  })

test.describe('Versão nova', () => {
  test('assume sozinha, abre na próxima vez e mantém guardada só a anterior', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'firefox', 'webkit'].includes(testInfo.project.name), 'não depende da largura')
    const dir = await mkdtemp(join(tmpdir(), 'media-tools-sw-'))
    let site: Site | undefined
    try {
      await cp(DIST, dir, { recursive: true })
      site = await startSite({ outDir: dir })
      const { url } = site
      const port = Number(new URL(url).port)
      await page.goto(url)
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready
      })
      const names = [await cacheNameIn(dir)]
      await expect.poll(() => versionCaches(page)).toEqual(names)

      for (const release of [2, 3]) {
        await site.stop()
        await publishRelease(dir, release)
        names.push(await cacheNameIn(dir))
        site = await startSite({ outDir: dir, port })

        // O navegador procura versão nova ao abrir o app; aqui, pedido direto, para não depender de quando.
        await page.evaluate(async () => {
          await (await navigator.serviceWorker.ready).update()
        })
        // Ficam a versão nova e a anterior (abas antigas ainda podem pedir arquivos dela); as outras saem.
        await expect.poll(() => versionCaches(page)).toEqual(names.slice(-2).sort())
        // Abrir de novo só depois de a versão nova terminar de assumir (no Firefox, antes disso a
        // página ainda pode vir da anterior; na vida real, a próxima abertura é bem depois).
        await expect.poll(() => updateSettled(page)).toBe(true)
        await page.reload()
        await expect(page.locator('meta[name="release"]')).toHaveAttribute('content', String(release))
      }
    } finally {
      await site?.stop()
      await rm(dir, { recursive: true, force: true })
    }
  })
})
