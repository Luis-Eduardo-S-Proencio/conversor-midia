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
  tabTo,
  trackOutgoingRequests,
  videoFixture,
} from './video-tool.ts'

// Vídeos de teste (tests/fixtures/videos): "detalhado.mp4" (976 × 736, 1 s, com som) e "quadrantes.webm" (640 × 480,
// 1 s, com som) têm os quadrantes vermelho, verde, azul e amarelo; "segundos.mp4" (320 × 240) é pequeno demais.

/** Refazer o vídeo: com vários navegadores testando ao mesmo tempo, leva mais que o padrão de 5 s. */
const PROCESS_TIMEOUT = 30_000

const ONLY_DOWNSCALE = /^Só dá para diminuir a resolução\. Aumentar não melhora a qualidade/

async function openTool(page: Page) {
  await page.goto('/videos/resolucao')
  await expect(page.getByRole('heading', { level: 1, name: 'Mudar resolução' })).toBeVisible()
}

/** Mudar a resolução refaz o vídeo: onde não há decodificador de vídeo, o teste se pula com o motivo. */
async function openWithDecoding(page: Page) {
  await openTool(page)
  test.skip(!(await canDecodeVideo(page)), UNSUPPORTED_DECODING)
}

const resolutions = (page: Page) => page.getByRole('radiogroup', { name: 'Resolução' })
const radio = (page: Page, label: string) => page.getByRole('radio', { name: label })
const finalSize = (page: Page) => page.getByRole('term').filter({ hasText: 'Resolução final' }).locator('xpath=following-sibling::dd')

/** Abre o vídeo: aparecem as resoluções ou o aviso. */
async function load(page: Page, name: string) {
  await fileInput(page).setInputFiles(videoFixture(name))
  await expect(resolutions(page).or(page.getByRole('alert'))).toBeVisible({ timeout: OPEN_TIMEOUT })
}

async function resize(page: Page) {
  await button(page, 'Mudar resolução').click()
  await expect(page.getByRole('heading', { name: 'Vídeo redimensionado' })).toBeFocused({ timeout: PROCESS_TIMEOUT })
}

test.describe('Mudar resolução', () => {
  test('MP4 para 720p: medidas certas, sem distorcer, com som, e sem enviar nada', async ({ page, baseURL }) => {
    const requests = trackOutgoingRequests(page, baseURL)
    await openWithDecoding(page)
    await load(page, 'detalhado.mp4')
    await expect(radio(page, '720p')).toBeChecked() // a maior abaixo da do vídeo (736 no lado menor)
    await expect(page.getByRole('term').filter({ hasText: 'Atual' }).locator('xpath=following-sibling::dd')).toHaveText('976 × 736')
    await expect(finalSize(page)).toHaveText('954 × 720')
    await resize(page)

    await expect(page.getByRole('status')).toHaveText('Vídeo redimensionado. Pronto para baixar.')
    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('detalhado-720p.mp4')
    expectVideoFormat(result.bytes, 'mp4')
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

  test('não dá para aumentar: resoluções iguais ou maiores ficam desligadas, com a explicação', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'detalhado.mp4')
    await expect(radio(page, '1080p')).toBeDisabled()
    await expect(page.getByText(ONLY_DOWNSCALE)).toBeVisible()
    await radio(page, '480p').click()
    await expect(finalSize(page)).toHaveText('636 × 480')

    await load(page, 'quadrantes.webm') // 640 × 480: 480p é igual, não menor
    await expect(radio(page, '480p')).toBeDisabled()
    await expect(radio(page, '720p')).toBeDisabled()
  })

  test('WEBM para 360p: sai em VP9, com as cores no lugar e o som', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'quadrantes.webm')
    await expect(radio(page, '360p')).toBeChecked()
    await expect(finalSize(page)).toHaveText('480 × 360')
    await resize(page)

    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('quadrantes-360p.webm')
    expectVideoFormat(result.bytes, 'webm')
    const probe = await probeVideo(result.bytes)
    expect(probe).toMatchObject({ videoCodec: 'vp9', audioCodec: 'opus', width: 480, height: 360 })
    const colors = await frameColors(page, result.bytes, 0.5, [
      [120, 90],
      [360, 90],
      [120, 270],
      [360, 270],
    ])
    expect(colors).toEqual(['red', 'green', 'blue', 'yellow'])
  })

  test('a resolução escolhida continua no próximo vídeo quando é menor que a dele; senão, vale a maior possível', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'detalhado.mp4')
    await radio(page, '480p').click()
    // "Trocar vídeo": espera as opções do vídeo novo (no WEBM 640 × 480, o 480p fica desligado).
    await fileInput(page).setInputFiles(videoFixture('quadrantes.webm'))
    await expect(radio(page, '480p')).toBeDisabled({ timeout: OPEN_TIMEOUT })
    await expect(radio(page, '360p')).toBeChecked()
    await fileInput(page).setInputFiles(videoFixture('detalhado.mp4'))
    await expect(radio(page, '720p')).toBeEnabled({ timeout: OPEN_TIMEOUT })
    await expect(radio(page, '480p')).toBeChecked()
  })

  test('vídeo de resolução baixa: explica que só dá para diminuir e não oferece mudar', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'segundos.mp4') // 320 × 240
    await expect(page.getByRole('alert')).toContainText('Este vídeo já tem resolução baixa')
    await expect(page.getByRole('alert')).toContainText('Ele tem 320 × 240, e a menor resolução oferecida é 360p. Só dá para diminuir a resolução')
    await expect(resolutions(page)).toHaveCount(0)
    await expect(button(page, 'Mudar resolução')).toBeDisabled()
  })

  test('sem decodificador de vídeo, a página explica que não dá para mudar a resolução neste navegador', async ({ page }) => {
    await openTool(page)
    test.skip(await canDecodeVideo(page), 'este motor decodifica vídeo')
    await fileInput(page).setInputFiles(videoFixture('detalhado.mp4'))
    await expect(page.getByText(/Mudar a resolução refaz o vídeo, e este navegador não consegue refazer vídeos H\.264/)).toBeVisible({
      timeout: OPEN_TIMEOUT,
    })
    await expect(button(page, 'Mudar resolução')).toBeDisabled()
  })

  test('teclado: as setas escolhem a resolução e Enter muda', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'teclado conferido no computador')
    await openWithDecoding(page)
    await load(page, 'detalhado.mp4')
    await tabTo(page, radio(page, '720p'))
    await page.keyboard.press('ArrowRight')
    await expect(radio(page, '480p')).toBeChecked()
    await expect(radio(page, '480p')).toBeFocused()
    await tabTo(page, button(page, 'Mudar resolução'))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Vídeo redimensionado' })).toBeFocused({ timeout: PROCESS_TIMEOUT })
  })

  test('estados sem violações automáticas de acessibilidade nem rolagem lateral', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'o axe independe do motor: conferido no Chromium em duas larguras')
    await openTool(page)
    await expectNoAxeViolations(page) // seleção do vídeo
    await load(page, 'quadrantes.webm')
    await expectNoAxeViolations(page) // player, resoluções (algumas desligadas) e medidas
    expect(await horizontalOverflow(page)).toBe(0)

    await resize(page)
    await expectNoAxeViolations(page) // resultado
    expect(await horizontalOverflow(page)).toBe(0)

    await load(page, 'segundos.mp4')
    await expectNoAxeViolations(page) // aviso de resolução baixa
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
