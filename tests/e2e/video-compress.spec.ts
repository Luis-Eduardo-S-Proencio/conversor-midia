import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { button, download, expectNoAxeViolations, fileInput } from './image-tool.ts'
import {
  OPEN_TIMEOUT,
  UNSUPPORTED_DECODING,
  canDecodeVideo,
  expectVideoFormat,
  frameColors,
  horizontalOverflow,
  probeVideo,
  smallTouchTargets,
  trackOutgoingRequests,
  videoFixture,
} from './video-tool.ts'

// Vídeos de teste (tests/fixtures/videos): "detalhado.mp4" (976 × 736, 1 s, com som) tem os quadrantes vermelho,
// verde, azul e amarelo com textura, em qualidade alta: comprimir reduz bastante. "ja-comprimido.mp4" tem textura
// numa taxa baixa: no nível Leve, o resultado não fica menor e o original é mantido.
const KEPT_ORIGINAL = 'Já estava bem comprimido: mantido o original, com os metadados.'

/** Comprimir refaz o vídeo: com vários navegadores testando ao mesmo tempo, leva mais que o padrão de 5 s. */
const PROCESS_TIMEOUT = 30_000

async function openTool(page: Page) {
  await page.goto('/videos/comprimir')
  await expect(page.getByRole('heading', { level: 1, name: 'Comprimir vídeo' })).toBeVisible()
}

/** Comprimir sempre recodifica: onde não há decodificador de vídeo, o teste se pula com o motivo. */
async function openWithDecoding(page: Page) {
  await openTool(page)
  test.skip(!(await canDecodeVideo(page)), UNSUPPORTED_DECODING)
}

const UNAVAILABLE = /Compressão indisponível neste navegador/
const NO_SIZE_CONTROL = 'este motor refaz o vídeo sem respeitar a taxa pedida (ex.: H.264 do Firefox do Playwright): a página explica e não oferece comprimir'

/** Abre o vídeo: aparecem os níveis ou, onde não dá para comprimir, o aviso. */
async function load(page: Page, name: string) {
  await fileInput(page).setInputFiles(videoFixture(name))
  await expect(page.getByRole('radiogroup', { name: 'Nível' }).or(page.getByText(UNAVAILABLE))).toBeVisible({ timeout: OPEN_TIMEOUT })
}

/** Abre o vídeo e pula o teste onde o navegador não controla o tamanho ao refazer o vídeo. */
async function loadCompressible(page: Page, name: string) {
  await load(page, name)
  test.skip(await page.getByText(UNAVAILABLE).isVisible(), NO_SIZE_CONTROL)
}

const finalResolution = (page: Page) => page.getByRole('definition').filter({ hasText: '×' })

test.describe('Comprimir vídeo', () => {
  test('Forte: menos resolução, arquivo bem menor, cores no lugar, som mantido e sem enviar nada', async ({ page, baseURL }) => {
    const requests = trackOutgoingRequests(page, baseURL)
    await openWithDecoding(page)
    await loadCompressible(page, 'detalhado.mp4')
    await expect(page.getByRole('radio', { name: 'Média' })).toBeChecked()
    await expect(finalResolution(page)).toHaveText('976 × 736') // Média vai até 1080p: este já cabe
    await page.getByRole('radio', { name: 'Forte' }).click()
    await expect(finalResolution(page)).toHaveText('954 × 720')
    await expect(page.getByText(/^\d+ KB · −\d+%$/)).toBeVisible() // tamanho estimado, menor que o original
    await button(page, 'Comprimir').click()

    await expect(page.getByRole('heading', { name: 'Vídeo comprimido' })).toBeFocused({ timeout: PROCESS_TIMEOUT })
    await expect(page.getByRole('status')).toHaveText('Vídeo comprimido. Pronto para baixar.')
    const original = await readFile(videoFixture('detalhado.mp4'))
    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('detalhado-comprimido.mp4')
    expectVideoFormat(result.bytes, 'mp4')
    expect(result.bytes.length).toBeLessThan(original.length / 2)
    const probe = await probeVideo(result.bytes)
    expect(probe).toMatchObject({ videoCodec: 'avc', audioCodec: 'aac', width: 954, height: 720 })
    expect(probe.duration).toBeCloseTo(1, 1)
    const colors = await frameColors(page, result.bytes, 0.5, [
      [240, 180],
      [715, 180],
      [240, 540],
      [715, 540],
    ])
    expect(colors).toEqual(['red', 'green', 'blue', 'yellow'])
    expect(requests).toEqual([])
  })

  test('vídeo já comprimido: avisa antes e, se não ficar menor, entrega o original intacto', async ({ page }) => {
    await openWithDecoding(page)
    await loadCompressible(page, 'ja-comprimido.mp4')
    await page.getByRole('radio', { name: 'Leve' }).click()
    await expect(page.getByText(/Neste nível o vídeo quase não diminui/)).toBeVisible()
    await button(page, 'Comprimir').click()

    await expect(page.getByRole('heading', { name: 'Vídeo comprimido' })).toBeFocused({ timeout: PROCESS_TIMEOUT })
    // Texto exato: o anúncio para leitor de tela repete a observação dentro de uma frase maior.
    await expect(page.getByText(KEPT_ORIGINAL, { exact: true })).toBeVisible()
    await expect(page.getByRole('status')).toHaveText(`${KEPT_ORIGINAL} Pronto para baixar.`)
    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('ja-comprimido.mp4')
    expect(Buffer.from(result.bytes).equals(await readFile(videoFixture('ja-comprimido.mp4')))).toBe(true)
  })

  test('cancelar no meio volta às opções, sem resultado', async ({ page }) => {
    await openWithDecoding(page)
    await loadCompressible(page, 'longo.mp4') // 30 s: dá tempo de cancelar
    await button(page, 'Comprimir').click()
    await expect(page.getByRole('progressbar', { name: 'Comprimindo o vídeo' })).toBeVisible()
    await button(page, 'Cancelar').click()
    await expect(page.getByRole('status')).toHaveText('Compressão cancelada.')
    await expect(button(page, 'Comprimir')).toBeEnabled()
    await expect(page.getByRole('heading', { name: 'Vídeo comprimido' })).toHaveCount(0)
  })

  test('navegador que ignora a taxa ao refazer o vídeo: a página explica e não oferece comprimir', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'detalhado.mp4')
    test.skip(!(await page.getByText(UNAVAILABLE).isVisible()), 'este motor respeita a taxa pedida')
    await expect(page.getByText(/Este navegador refaz o vídeo sem controlar o tamanho do arquivo/)).toBeVisible()
    await expect(button(page, 'Comprimir')).toBeDisabled()
  })

  test('sem decodificador de vídeo, a página explica que não dá para comprimir neste navegador', async ({ page }) => {
    await openTool(page)
    test.skip(await canDecodeVideo(page), 'este motor decodifica vídeo')
    await fileInput(page).setInputFiles(videoFixture('detalhado.mp4'))
    await expect(page.getByText(/Comprimir refaz o vídeo, e este navegador não consegue refazer vídeos H\.264/)).toBeVisible({
      timeout: OPEN_TIMEOUT,
    })
    await expect(button(page, 'Comprimir')).toBeDisabled()
  })

  test('estados sem violações automáticas de acessibilidade nem rolagem lateral', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'o axe independe do motor: conferido no Chromium em duas larguras')
    await openTool(page)
    await expectNoAxeViolations(page) // seleção do vídeo
    await loadCompressible(page, 'ja-comprimido.mp4')
    await page.getByRole('radio', { name: 'Leve' }).click()
    await expect(page.getByText(/Neste nível o vídeo quase não diminui/)).toBeVisible()
    await expectNoAxeViolations(page) // player, níveis, estimativa e aviso
    expect(await horizontalOverflow(page)).toBe(0)

    await button(page, 'Comprimir').click()
    await expect(page.getByRole('heading', { name: 'Vídeo comprimido' })).toBeFocused({ timeout: PROCESS_TIMEOUT })
    await expectNoAxeViolations(page) // resultado, com a observação
    expect(await horizontalOverflow(page)).toBe(0)
  })

  test('celular a 320 px: sem rolagem lateral e alvos de toque de 44 px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'reflow e toque conferidos no celular')
    await page.setViewportSize({ width: 320, height: 700 })
    await openTool(page)
    await load(page, 'detalhado.mp4')
    expect(await horizontalOverflow(page)).toBe(0)
    expect(await smallTouchTargets(page)).toEqual([])
  })
})
