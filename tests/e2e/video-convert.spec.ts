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

// Vídeos de teste (tests/fixtures/videos): "com-som.mov" (160 × 120, H.264 e AAC, com título e localização), "som-pcm.mov"
// (H.264 com som PCM de câmera), "segundos.mp4" (4 s, uma cor por segundo, H.264 e AAC) e "quadrantes.webm"
// (640 × 480, 1 s, VP9 e Opus). Os pacotes copiados byte a byte e o tom do som são conferidos nos testes do
// Worker; aqui, o fluxo da página e o arquivo baixado. HEVC (iPhone) não existe nos navegadores de teste: a
// escolha "compatível" ou "rápido" é conferida no teste do painel (ConvertOptions.test.tsx) e no aparelho.

/** Refazer o vídeo: com vários navegadores testando ao mesmo tempo, leva mais que o padrão de 5 s. */
const PROCESS_TIMEOUT = 30_000

async function openTool(page: Page) {
  await page.goto('/videos/converter')
  await expect(page.getByRole('heading', { level: 1, name: 'Converter vídeo' })).toBeVisible()
}

/** Refazer o vídeo exige decodificador: onde não há, o teste se pula com o motivo. */
async function openWithDecoding(page: Page) {
  await openTool(page)
  test.skip(!(await canDecodeVideo(page)), UNSUPPORTED_DECODING)
}

const targets = (page: Page) => page.getByRole('radiogroup', { name: 'Formato final' })
const radio = (page: Page, label: string) => page.getByRole('radio', { name: label, exact: true })
/** Detalhe das opções ("Vídeo", "Som"): o que é copiado e o que é refeito. */
const detail = (page: Page, term: string) =>
  page
    .getByRole('term')
    .filter({ hasText: new RegExp(`^${term}$`) })
    .first()
    .locator('xpath=following-sibling::dd')

/** Abre o vídeo: aparecem os formatos ou o aviso. */
async function load(page: Page, name: string) {
  await fileInput(page).setInputFiles(videoFixture(name))
  await expect(targets(page).or(page.getByRole('alert'))).toBeVisible({ timeout: OPEN_TIMEOUT })
}

/** Escolhe um formato; onde este navegador não consegue gerá-lo, o teste se pula com o motivo. */
async function chooseTarget(page: Page, label: 'MP4' | 'MOV' | 'WEBM') {
  const option = radio(page, label)
  test.skip(!(await option.isVisible()) || (await option.isDisabled()), `este motor não consegue gerar ${label} a partir deste vídeo (a página explica)`)
  await option.click()
}

async function convert(page: Page) {
  await button(page, 'Converter').click()
  await expect(page.getByRole('heading', { name: 'Vídeo convertido' })).toBeFocused({ timeout: PROCESS_TIMEOUT })
}

test.describe('Converter vídeo', () => {
  test('MOV para MP4: só troca o formato, copiando, com o mesmo nome, sem metadados e sem enviar nada', async ({ page, baseURL }) => {
    const requests = trackOutgoingRequests(page, baseURL)
    await openTool(page)
    await load(page, 'com-som.mov')
    await expect(radio(page, 'MP4')).toBeChecked()
    await expect(radio(page, 'WEBM')).toBeVisible()
    await expect(radio(page, 'MOV')).toHaveCount(0) // o formato do próprio vídeo não é oferecido
    await expect(page.getByText(/^Só troca o formato do arquivo: é rápido, mesmo em vídeos longos/)).toBeVisible()
    await expect(detail(page, 'Vídeo')).toHaveText('Copiado, sem perder qualidade')
    await expect(detail(page, 'Som')).toHaveText('Copiado, sem perder qualidade')
    await convert(page)

    await expect(page.getByRole('status')).toHaveText('Vídeo convertido. Pronto para baixar.')
    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('com-som.mp4')
    expectVideoFormat(result.bytes, 'mp4')
    const probe = await probeVideo(result.bytes)
    expect(probe).toMatchObject({ videoCodec: 'avc', audioCodec: 'aac', width: 160, height: 120 })
    expect(probe.tags).not.toHaveProperty('title')
    expect(JSON.stringify(probe.tags)).not.toContain('12.3456')
    expect(requests).toEqual([])
  })

  test('MP4 para WEBM: refeito em VP9 e Opus, com as cores no lugar', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'segundos.mp4')
    await chooseTarget(page, 'WEBM')
    await expect(page.getByText(/^Refazer o vídeo pode demorar em vídeos longos.*iPhones e Macs mais antigos podem não tocar WEBM/)).toBeVisible()
    await expect(detail(page, 'Vídeo')).toHaveText('Refeito em VP9')
    // Perto da taxa do som original (cerca de 96 kbit/s), não nos 192 padrão: o arquivo não cresce à toa.
    await expect(detail(page, 'Som')).toHaveText(/^Refeito em Opus, a (96|128) kbit\/s$/)
    await convert(page)

    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('segundos.webm')
    expectVideoFormat(result.bytes, 'webm')
    const probe = await probeVideo(result.bytes)
    expect(probe).toMatchObject({ videoCodec: 'vp9', audioCodec: 'opus', width: 320, height: 240 })
    expect(probe.duration).toBeCloseTo(4, 1)
    expect(await frameColors(page, result.bytes, 0.5, [[160, 120]])).toEqual(['red'])
    expect(await frameColors(page, result.bytes, 2.5, [[160, 120]])).toEqual(['blue'])
  })

  test('WEBM para MP4: refeito em H.264 e AAC, que tocam em todo lugar', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'quadrantes.webm')
    await chooseTarget(page, 'MP4')
    await expect(detail(page, 'Vídeo')).toHaveText('Refeito em H.264')
    await expect(detail(page, 'Som')).toHaveText(/^Refeito em AAC, a (96|128|160|192) kbit\/s$/)
    await convert(page)

    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('quadrantes.mp4')
    expectVideoFormat(result.bytes, 'mp4')
    const probe = await probeVideo(result.bytes)
    expect(probe).toMatchObject({ videoCodec: 'avc', audioCodec: 'aac', width: 640, height: 480 })
    const colors = await frameColors(page, result.bytes, 0.5, [
      [160, 120],
      [480, 120],
      [160, 360],
      [480, 360],
    ])
    expect(colors).toEqual(['red', 'green', 'blue', 'yellow'])
  })

  test('som PCM de câmera para MP4: a imagem é copiada e só o som é refeito em AAC', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'som-pcm.mov')
    await chooseTarget(page, 'MP4')
    await expect(page.getByText(/^O vídeo é copiado e só o som é refeito/)).toBeVisible()
    await expect(detail(page, 'Vídeo')).toHaveText('Copiado, sem perder qualidade')
    await expect(detail(page, 'Som')).toHaveText('Refeito em AAC, a 192 kbit/s')
    await convert(page)

    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('som-pcm.mp4')
    expect(await probeVideo(result.bytes)).toMatchObject({ videoCodec: 'avc', audioCodec: 'aac' })
  })

  test('navegador que não gera AAC (Firefox): MP4 e MOV ficam indisponíveis quando o som precisa ser refeito, com explicação', async ({
    page,
  }) => {
    await openTool(page)
    await load(page, 'som-pcm.mov')
    test.skip(await radio(page, 'MP4').isEnabled(), 'este motor gera AAC')
    await expect(radio(page, 'MP4')).toBeDisabled()
    await expect(page.getByText(/^MP4 indisponível: o som precisa ser refeito em AAC, e este navegador não gera esse formato de som/)).toBeVisible()
    await expect(radio(page, 'WEBM')).toBeChecked() // o WEBM (VP9 e Opus) continua

    // WEBM com som: nenhum formato funciona; a página explica e não oferece converter.
    await load(page, 'quadrantes.webm')
    await expect(page.getByRole('alert')).toContainText('Conversão indisponível neste navegador')
    await expect(page.getByRole('alert')).toContainText('Para MP4 e MOV, o som precisa ser refeito em AAC, e este navegador não gera esse formato de som.')
    await expect(button(page, 'Converter')).toBeDisabled()
  })

  test('o formato escolhido continua no próximo vídeo quando existe para ele', async ({ page }) => {
    await openTool(page)
    await load(page, 'segundos.mp4')
    await chooseTarget(page, 'WEBM')
    // "Trocar vídeo": espera as opções do vídeo novo (MOV não oferece MOV).
    await fileInput(page).setInputFiles(videoFixture('com-som.mov'))
    await expect(radio(page, 'MP4')).toBeVisible({ timeout: OPEN_TIMEOUT })
    await expect(radio(page, 'WEBM')).toBeChecked()
  })

  test('teclado: as setas escolhem o formato e Enter converte', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'teclado conferido no computador')
    await openTool(page)
    await load(page, 'segundos.mp4')
    await tabTo(page, radio(page, 'MOV'))
    await page.keyboard.press('ArrowRight')
    await expect(radio(page, 'WEBM')).toBeChecked()
    await page.keyboard.press('ArrowLeft')
    await expect(radio(page, 'MOV')).toBeFocused()
    await tabTo(page, button(page, 'Converter'))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Vídeo convertido' })).toBeFocused({ timeout: PROCESS_TIMEOUT })
  })

  test('estados sem violações automáticas de acessibilidade nem rolagem lateral', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'o axe independe do motor: conferido no Chromium em duas larguras')
    await openTool(page)
    await expectNoAxeViolations(page) // seleção do vídeo
    await load(page, 'som-pcm.mov')
    await expectNoAxeViolations(page) // player, formatos e o que é copiado ou refeito
    expect(await horizontalOverflow(page)).toBe(0)

    await convert(page)
    await expectNoAxeViolations(page) // resultado
    expect(await horizontalOverflow(page)).toBe(0)
  })

  test('celular a 320 px: sem rolagem lateral e alvos de toque de 44 px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'reflow e toque conferidos no celular')
    await page.setViewportSize({ width: 320, height: 700 })
    await openTool(page)
    await load(page, 'som-pcm.mov')
    expect(await horizontalOverflow(page)).toBe(0)
    expect(await smallTouchTargets(page)).toEqual([])
  })
})
