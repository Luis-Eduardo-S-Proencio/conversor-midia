import { expect, test, type Page } from '@playwright/test'
import { button, download, expectNoAxeViolations, fileInput } from './image-tool.ts'
import {
  OPEN_TIMEOUT,
  audioSignature,
  horizontalOverflow,
  probeAudio,
  smallTouchTargets,
  tabTo,
  trackCspViolations,
  trackOutgoingRequests,
  videoFixture,
} from './video-tool.ts'

// Vídeos de teste (tests/fixtures/videos): "segundos.mp4" (4 s, som AAC) e "segundos.webm" (4 s, som Opus) têm um
// tom de 440 Hz; "girado.mp4" não tem som. O conteúdo do som (tom, pacotes iguais ao original) é conferido nos
// testes do Worker; aqui, o fluxo da página e o arquivo baixado.

/** Refazer o som (M4A ou MP3): com vários navegadores testando ao mesmo tempo, leva mais que o padrão de 5 s. */
const PROCESS_TIMEOUT = 30_000

async function openTool(page: Page) {
  await page.goto('/videos/extrair-audio')
  await expect(page.getByRole('heading', { level: 1, name: 'Extrair áudio' })).toBeVisible()
}

const formats = (page: Page) => page.getByRole('radiogroup', { name: 'Formato do áudio' })

/** Abre o vídeo: aparecem os formatos do áudio ou, sem som, o aviso. */
async function load(page: Page, name: string) {
  await fileInput(page).setInputFiles(videoFixture(name))
  await expect(formats(page).or(page.getByRole('alert'))).toBeVisible({ timeout: OPEN_TIMEOUT })
}

/** Escolhe um formato que precisa refazer o som; onde o navegador não consegue, o teste se pula com o motivo. */
async function chooseReencoded(page: Page, label: 'M4A' | 'MP3') {
  const radio = page.getByRole('radio', { name: label })
  test.skip(await radio.isDisabled(), `este motor não consegue gerar ${label} a partir deste som (a página explica)`)
  await radio.click()
}

async function extract(page: Page) {
  await button(page, 'Extrair áudio').click()
  await expect(page.getByRole('heading', { name: 'Áudio extraído' })).toBeFocused({ timeout: PROCESS_TIMEOUT })
}

/** O player de som de "Como ficou" abre o arquivo gerado. */
async function expectPlayableResult(page: Page, duration: number) {
  const player = page.locator('audio')
  await expect.poll(() => player.evaluate((audio: HTMLAudioElement) => audio.readyState)).toBeGreaterThanOrEqual(1)
  expect(await player.evaluate((audio: HTMLAudioElement) => audio.duration)).toBeCloseTo(duration, 0)
}

test.describe('Extrair áudio', () => {
  test('MP4: o som é copiado em M4A, dá para ouvir antes e o arquivo baixado é só som, sem enviar nada', async ({ page, baseURL }) => {
    const requests = trackOutgoingRequests(page, baseURL)
    await openTool(page)
    await load(page, 'segundos.mp4')
    await expect(page.getByRole('radio', { name: 'M4A' })).toBeChecked()
    await expect(page.getByRole('radio', { name: 'MP3' })).toBeVisible()
    await expect(page.getByText(/^Cópia exata do som do vídeo/)).toBeVisible()
    await extract(page)

    await expect(page.getByRole('status')).toHaveText('Áudio extraído. Pronto para baixar.')
    await expect(page.getByText('Copiado, sem perder qualidade')).toBeVisible()
    // O som não se compara ao vídeo de onde saiu: só o tamanho dele, sem "Antes" e "Depois".
    await expect(page.getByRole('term').filter({ hasText: 'Tamanho' })).toBeVisible()
    await expect(page.getByText('Antes', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('radio', { name: 'Como ficou' })).toBeChecked()
    await expectPlayableResult(page, 4)
    // O original continua a um toque, para comparar.
    await page.getByRole('radio', { name: 'Original' }).click()
    await expect(page.locator('video')).toBeVisible()
    await expect(page.locator('audio')).toHaveCount(0)
    await button(page, 'Ouvir como ficou').click()
    await expect(page.locator('audio')).toBeVisible()

    const result = await download(page, button(page, 'Baixar áudio'))
    expect(result.name).toBe('segundos-audio.m4a')
    expect(audioSignature(result.bytes)).toBe('m4a')
    const probe = await probeAudio(result.bytes)
    expect(probe).toMatchObject({ format: 'MP4', videoTracks: 0, audioTracks: 1, codec: 'aac' })
    expect(probe.duration).toBeCloseTo(4, 1)
    expect(requests).toEqual([])
  })

  test('MP3: refeito pelo codificador próprio, sem violar a CSP; mudar o formato descarta o resultado anterior', async ({ page, baseURL }) => {
    const violations = await trackCspViolations(page)
    // O codificador (WebAssembly) vem embutido no pacote carregado do próprio site: nada sai do aparelho.
    const requests = trackOutgoingRequests(page, baseURL)
    await openTool(page)
    await load(page, 'segundos.mp4')
    await extract(page) // M4A primeiro
    await button(page, 'Alterar opções').click()
    await chooseReencoded(page, 'MP3')
    await expect(page.getByText(/^O som é refeito em MP3, a 192 kbit\/s/)).toBeVisible()
    await extract(page)

    await expect(page.getByText('Refeito a 192 kbit/s')).toBeVisible()
    await expectPlayableResult(page, 4)
    const result = await download(page, button(page, 'Baixar áudio'))
    expect(result.name).toBe('segundos-audio.mp3')
    expect(audioSignature(result.bytes)).toBe('mp3')
    const probe = await probeAudio(result.bytes)
    expect(probe).toMatchObject({ format: 'MP3', videoTracks: 0, codec: 'mp3' })
    expect(probe.duration).toBeCloseTo(4, 1)
    expect(violations).toEqual([])
    expect(requests).toEqual([])
  })

  test('o aviso de licença do LAME (gerador de MP3) está em Licenças de código aberto e o texto da licença abre', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'página estática: conferida uma vez')
    await page.goto('/sobre/licencas')
    const license = page.getByRole('link', { name: 'licença LGPL' })
    await expect(license).toHaveAttribute('href', '/licencas/lame-lgpl.txt')
    await expect(page.getByRole('link', { name: 'lame.sourceforge.io' })).toHaveAttribute('href', 'https://lame.sourceforge.io')
    const response = await request.get('/licencas/lame-lgpl.txt')
    expect(response.headers()['content-type']).toContain('text/plain')
    expect(await response.text()).toContain('GNU LIBRARY GENERAL PUBLIC LICENSE')
  })

  test('WEBM: o som Opus é copiado em WEBM', async ({ page }) => {
    await openTool(page)
    await load(page, 'segundos.webm')
    await expect(page.getByRole('radio', { name: 'WEBM' })).toBeChecked()
    await expect(page.getByText(/iPhones mais antigos podem não tocar WEBM/)).toBeVisible()
    await extract(page)

    await expectPlayableResult(page, 4)
    const result = await download(page, button(page, 'Baixar áudio'))
    expect(result.name).toBe('segundos-audio.webm')
    expect(audioSignature(result.bytes)).toBe('webm')
    const probe = await probeAudio(result.bytes)
    expect(probe).toMatchObject({ format: 'WebM', videoTracks: 0, audioTracks: 1, codec: 'opus' })
    expect(probe.duration).toBeCloseTo(4, 1)
  })

  test('WEBM para M4A: o som é refeito em AAC', async ({ page }) => {
    await openTool(page)
    await load(page, 'segundos.webm')
    await chooseReencoded(page, 'M4A')
    await expect(page.getByText(/^O som é refeito em AAC/)).toBeVisible()
    await extract(page)

    const result = await download(page, button(page, 'Baixar áudio'))
    expect(result.name).toBe('segundos-audio.m4a')
    const probe = await probeAudio(result.bytes)
    expect(probe).toMatchObject({ format: 'MP4', videoTracks: 0, codec: 'aac' })
    expect(probe.duration).toBeCloseTo(4, 1)
  })

  test('navegador que não gera AAC (Firefox): M4A fica indisponível para WEBM, com explicação', async ({ page }) => {
    await openTool(page)
    await load(page, 'segundos.webm')
    const m4a = page.getByRole('radio', { name: 'M4A' })
    test.skip(await m4a.isEnabled(), 'este motor gera AAC')
    await expect(m4a).toBeDisabled()
    await expect(page.getByText(/^M4A indisponível: este navegador não gera esse formato/)).toBeVisible()
    await expect(button(page, 'Extrair áudio')).toBeEnabled() // a cópia em WEBM continua
  })

  test('o formato escolhido continua no próximo vídeo quando existe para ele; senão, volta à cópia', async ({ page }) => {
    await openTool(page)
    await load(page, 'segundos.mp4')
    await chooseReencoded(page, 'MP3')
    // "Trocar vídeo": espera as opções do vídeo novo (só o WEBM tem a cópia em WEBM).
    await fileInput(page).setInputFiles(videoFixture('segundos.webm'))
    await expect(page.getByRole('radio', { name: 'WEBM' })).toBeVisible({ timeout: OPEN_TIMEOUT })
    await expect(page.getByRole('radio', { name: 'MP3' })).toBeChecked()
    await page.getByRole('radio', { name: 'WEBM' }).click()
    // MP4 não tem WEBM: volta à cópia em M4A.
    await fileInput(page).setInputFiles(videoFixture('segundos.mp4'))
    await expect(page.getByRole('radio', { name: 'WEBM' })).toHaveCount(0)
    await expect(page.getByRole('radio', { name: 'M4A' })).toBeChecked({ timeout: OPEN_TIMEOUT })
  })

  test('vídeo sem som: a página explica e não oferece extrair', async ({ page }) => {
    await openTool(page)
    await load(page, 'girado.mp4')
    await expect(page.getByRole('alert')).toContainText('Este vídeo não tem som')
    await expect(page.getByText('Não há som para extrair. Escolha outro vídeo, com som.')).toBeVisible()
    await expect(button(page, 'Extrair áudio')).toBeDisabled()
  })

  test('arquivo só de áudio é recusado com a explicação', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(videoFixture('so-audio.mp4'))
    // Texto exato: o anúncio para leitor de tela repete a mensagem dentro de uma frase maior.
    await expect(page.getByText('Não há vídeo neste arquivo. Escolha um vídeo MP4, MOV ou WEBM.', { exact: true })).toBeVisible({
      timeout: OPEN_TIMEOUT,
    })
  })

  test('teclado: as setas escolhem o formato e Enter extrai', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'teclado conferido no computador')
    await openTool(page)
    await load(page, 'segundos.mp4')
    await tabTo(page, page.getByRole('radio', { name: 'M4A' }))
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'MP3' })).toBeChecked()
    await expect(page.getByRole('radio', { name: 'MP3' })).toBeFocused()
    await tabTo(page, button(page, 'Extrair áudio'))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Áudio extraído' })).toBeFocused({ timeout: PROCESS_TIMEOUT })
  })

  test('estados sem violações automáticas de acessibilidade nem rolagem lateral', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'o axe independe do motor: conferido no Chromium em duas larguras')
    await openTool(page)
    await expectNoAxeViolations(page) // seleção do vídeo
    await load(page, 'segundos.webm')
    await expectNoAxeViolations(page) // player e formatos
    expect(await horizontalOverflow(page)).toBe(0)

    await extract(page)
    await expectNoAxeViolations(page) // resultado, com o player de som
    expect(await horizontalOverflow(page)).toBe(0)

    await load(page, 'girado.mp4')
    await expectNoAxeViolations(page) // aviso de vídeo sem som
  })

  test('celular a 320 px: sem rolagem lateral e alvos de toque de 44 px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'reflow e toque conferidos no celular')
    await page.setViewportSize({ width: 320, height: 700 })
    await openTool(page)
    await load(page, 'segundos.webm')
    expect(await horizontalOverflow(page)).toBe(0)
    expect(await smallTouchTargets(page)).toEqual([])
    await extract(page)
    expect(await horizontalOverflow(page)).toBe(0)
    expect(await smallTouchTargets(page)).toEqual([])
  })
})
