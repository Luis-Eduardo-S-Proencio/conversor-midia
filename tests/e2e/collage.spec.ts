import { expect, test, type Page } from '@playwright/test'
import { DEFAULT_COLLAGE_STYLE, DEFAULT_FRAMING, planCollage, scatterPlacements, type CollagePhoto } from '../../src/core/image/collage'
import { readImageHeader } from '../../src/core/image/header'
import { detectImageType } from '../../src/core/image/signature'
import { button, download, expectColor, expectNoAxeViolations, fileInput, fixture, openImageTool, pixelAt } from './image-tool.ts'
import { horizontalOverflow, smallTouchTargets, trackOutgoingRequests } from './video-tool.ts'

// Criar colagem: de 2 a 9 fotos numa imagem só, em grade ou livre. As contas de onde cada foto fica vêm do
// próprio núcleo (src/core/image/collage), as mesmas da tela e do Worker: o teste confere as cores no arquivo baixado.

const PHOTO = 600
const COLORS = { vermelho: '#ff0000', verde: '#00ff00', azul: '#0000ff' } as const
type ColorName = keyof typeof COLORS
const RGB: Record<ColorName, [number, number, number]> = { vermelho: [255, 0, 0], verde: [0, 255, 0], azul: [0, 0, 255] }

/** PNG de uma cor só, gerado no navegador. */
async function solidPng(page: Page, name: ColorName, size = PHOTO) {
  const bytes = await page.evaluate(
    async ({ color, size }) => {
      const canvas = new OffscreenCanvas(size, size)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('canvas indisponível')
      context.fillStyle = color
      context.fillRect(0, 0, size, size)
      const blob = await canvas.convertToBlob({ type: 'image/png' })
      return Array.from(new Uint8Array(await blob.arrayBuffer()))
    },
    { color: COLORS[name], size },
  )
  return { name: `${name}.png`, mimeType: 'image/png', buffer: Buffer.from(bytes) }
}

async function openWithPhotos(page: Page, names: ColorName[] = ['vermelho', 'verde', 'azul']) {
  await openImageTool(page, '/imagens/colagem', 'Criar colagem')
  await fileInput(page).setInputFiles(await Promise.all(names.map((name) => solidPng(page, name))))
  await expect(cell(page, 1, names.length, names[0] ?? 'vermelho')).toBeVisible()
}

const cell = (page: Page, position: number, total: number, name: string) =>
  page.getByRole('button', { name: `Foto ${position} de ${total}: ${name}.png`, exact: true })
const freePhoto = (page: Page, position: number, name: string) => page.getByRole('button', { name: `Foto ${position}: ${name}.png`, exact: true })

async function createAndDownload(page: Page) {
  await button(page, 'Criar colagem').click()
  await expect(page.getByRole('heading', { name: 'Colagem pronta' })).toBeFocused({ timeout: 20_000 })
  const result = await download(page, button(page, 'Baixar colagem'))
  expect(result.name).toBe('colagem.jpg')
  expect(detectImageType(result.bytes)).toEqual({ kind: 'supported', format: 'jpeg' })
  const header = readImageHeader(result.bytes, 'jpeg', result.bytes.length)
  if (header.status !== 'ok') throw new Error('cabeçalho do JPG ilegível')
  return { ...result, width: header.header.width, height: header.header.height }
}

const square = (): CollagePhoto => ({ width: PHOTO, height: PHOTO, framing: DEFAULT_FRAMING, placement: { x: 0.5, y: 0.5, width: 0.5, rotation: 0 } })

test.describe('Criar colagem', () => {
  test('grade: escolher modelo, trocar duas fotos de lugar com o símbolo de troca, mudar a cor e baixar', async ({ page, baseURL }) => {
    const outgoing = trackOutgoingRequests(page, baseURL)
    await openWithPhotos(page)

    // Três fotos: os modelos são os de 3, e "Grande à esquerda" põe a primeira grande.
    await expect(page.getByRole('radiogroup', { name: 'Modelos para 3 fotos' }).getByRole('radio')).toHaveCount(6)
    await page.getByRole('radio', { name: 'Grande à esquerda', exact: true }).click()
    await expect(page.getByRole('radio', { name: 'Grande à esquerda', exact: true })).toHaveAttribute('aria-checked', 'true')

    // Toca na primeira: fica marcada, com a dica de trocar; toca na terceira: as duas trocam na hora.
    await cell(page, 1, 3, 'vermelho').click()
    await expect(cell(page, 1, 3, 'vermelho')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Toque em outra foto para trocar as duas de lugar.', { exact: true })).toBeVisible()
    await expectNoAxeViolations(page)
    await cell(page, 3, 3, 'azul').click()
    await expect(cell(page, 1, 3, 'azul')).toBeVisible()
    await expect(cell(page, 3, 3, 'vermelho')).toBeVisible()
    await expect(cell(page, 1, 3, 'azul')).toHaveAttribute('aria-pressed', 'false')

    await page.getByRole('tab', { name: 'Borda' }).click()
    await page.getByRole('radio', { name: 'Preto', exact: true }).click()
    await expectNoAxeViolations(page)
    expect(await horizontalOverflow(page)).toBe(0)

    const result = await createAndDownload(page)
    const plan = planCollage({
      mode: 'grid',
      ratio: '1:1',
      layoutId: '3-esquerda',
      photos: [square(), square(), square()],
      style: { ...DEFAULT_COLLAGE_STYLE, color: '#000000' },
    })
    // A foto grande tem 600 px de altura num quadro inteiro; as pequenas, em meio quadro, pedem 1200 px.
    expect([result.width, result.height]).toEqual([1200, 1200])
    expect([plan.width, plan.height]).toEqual([1200, 1200])
    const expected: ColorName[] = ['azul', 'verde', 'vermelho']
    for (const piece of plan.pieces) {
      const color = expected[piece.index] ?? 'azul'
      expectColor(await pixelAt(page, result.bytes, Math.round(piece.box.cx), Math.round(piece.box.cy)), RGB[color])
    }
    expectColor(await pixelAt(page, result.bytes, 3, 3), [0, 0, 0]) // a borda, na cor escolhida
    await expect(page.getByRole('img', { name: 'Como ficou: colagem.jpg' })).toBeVisible()
    await expectNoAxeViolations(page)
    expect(outgoing).toEqual([])
  })

  test('livre: girar pelo botão, fundo preto e moldura branca, e cada foto onde estava', async ({ page }) => {
    await openWithPhotos(page)
    await page.getByRole('radio', { name: 'Livre', exact: true }).click()
    await freePhoto(page, 2, 'verde').click()
    await expect(freePhoto(page, 2, 'verde')).toHaveAttribute('aria-pressed', 'true')
    const toolbar = page.getByRole('toolbar', { name: 'Ajustar a foto marcada' })
    await toolbar.getByRole('button', { name: 'Girar para a direita' }).click()
    // Começa com 5° (os giros leves do espalhado) e gira mais 15°.
    await expect(freePhoto(page, 2, 'verde')).toHaveAttribute('style', /rotate\(20deg\)/)
    await expectNoAxeViolations(page)
    await toolbar.getByRole('button', { name: 'Concluir' }).click()
    await expect(freePhoto(page, 2, 'verde')).toHaveAttribute('aria-pressed', 'false')

    await page.getByRole('tab', { name: 'Borda' }).click()
    await page.getByRole('slider', { name: 'Moldura das fotos' }).fill('100')
    await page.getByRole('radio', { name: 'Preto', exact: true }).click()
    expect(await horizontalOverflow(page)).toBe(0)

    const result = await createAndDownload(page)
    const placements = scatterPlacements([square(), square(), square()], '1:1')
    const photos = placements.map((placement, index) => ({ ...square(), placement: index === 1 ? { ...placement, rotation: 20 } : placement }))
    const plan = planCollage({ mode: 'free', ratio: '1:1', photos, style: { ...DEFAULT_COLLAGE_STYLE, spacing: 100, color: '#000000' } })
    expect([result.width, result.height]).toEqual([plan.width, plan.height])
    const names: ColorName[] = ['vermelho', 'verde', 'azul']
    for (const piece of plan.pieces) {
      const color = names[piece.index] ?? 'vermelho'
      expectColor(await pixelAt(page, result.bytes, Math.round(piece.box.cx), Math.round(piece.box.cy)), RGB[color])
    }
    // A foto de baixo (azul) tem o lado esquerdo livre: no meio da moldura dela, girada junto com a foto, branco.
    const bottom = plan.pieces.find((piece) => piece.index === 2)
    if (!bottom) throw new Error('plano incompleto')
    const reach = -(bottom.box.width / 2 + bottom.border / 2)
    const turn = (bottom.box.rotation * Math.PI) / 180
    expect(bottom.border).toBeGreaterThan(30)
    expectColor(
      await pixelAt(page, result.bytes, Math.round(bottom.box.cx + reach * Math.cos(turn)), Math.round(bottom.box.cy + reach * Math.sin(turn))),
      [255, 255, 255],
    )
    expectColor(await pixelAt(page, result.bytes, 3, plan.height - 3), [0, 0, 0]) // o fundo, no canto livre
  })

  test('só pelo teclado: marcar com Enter, trocar com Enter na outra, e Esc desmarca', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'teclado conferido no computador')
    await openWithPhotos(page, ['vermelho', 'verde'])
    await cell(page, 1, 2, 'vermelho').focus()
    await page.keyboard.press('Enter')
    await expect(cell(page, 1, 2, 'vermelho')).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')
    await expect(cell(page, 1, 2, 'vermelho')).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    await expect(cell(page, 2, 2, 'verde')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(cell(page, 2, 2, 'vermelho')).toBeFocused() // o foco fica no espaço tocado, agora com a outra foto
    await expect(page.getByRole('status').filter({ hasText: 'Fotos 1 e 2 trocadas de lugar.' })).toHaveCount(1)
  })

  test('arquivo recusado não entra; com uma foto só, pede mais uma; acima de 9, avisa o que ficou de fora', async ({ page }) => {
    await openImageTool(page, '/imagens/colagem', 'Criar colagem')
    await fileInput(page).setInputFiles([fixture('foto.jpg'), fixture('texto.png')])
    await expect(page.getByText('Falta pelo menos mais uma foto.')).toBeVisible()
    await expect(button(page, 'Criar colagem')).toBeDisabled()
    await expect(page.getByText('Abra pelo menos 2 fotos para montar a colagem.').filter({ visible: true })).toBeVisible()
    await page.getByRole('tab', { name: /Fotos/ }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'texto.png' })).toBeVisible()
    await expectNoAxeViolations(page)

    const many = await Promise.all(Array.from({ length: 9 }, async (_, index) => ({ ...(await solidPng(page, 'azul', 64)), name: `azul-${index}.png` })))
    await fileInput(page).setInputFiles(many)
    await expect(page.getByText('2 arquivos ficaram de fora: o limite é de 9 arquivos por vez.', { exact: true })).toBeVisible()
    await expect(page.getByText('9 de 9 fotos')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Adicionar', exact: true })).toBeDisabled()
  })

  test('editar de novo volta com tudo como estava; nova colagem recomeça do zero', async ({ page }) => {
    await openWithPhotos(page, ['vermelho', 'verde'])
    await page.getByRole('radio', { name: 'Uma sobre a outra', exact: true }).click()
    await createAndDownload(page)
    await button(page, 'Editar colagem').click()
    await expect(page.getByRole('radio', { name: 'Uma sobre a outra', exact: true })).toHaveAttribute('aria-checked', 'true')
    await expect(cell(page, 2, 2, 'verde')).toBeVisible()

    await button(page, 'Criar colagem').click()
    await expect(page.getByRole('heading', { name: 'Colagem pronta' })).toBeFocused({ timeout: 20_000 })
    await button(page, 'Nova colagem').click()
    await expect(page.getByRole('button', { name: 'Selecionar fotos' })).toBeFocused()
  })

  test('celular: alvos de toque de 44 px e nada passa da largura da tela', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'regra do celular')
    await openWithPhotos(page)
    expect(await smallTouchTargets(page)).toEqual([])
    await cell(page, 1, 3, 'vermelho').click()
    expect(await smallTouchTargets(page)).toEqual([])
    for (const tab of ['Borda', 'Fotos']) {
      await page.getByRole('tab', { name: new RegExp(tab) }).click()
      expect(await smallTouchTargets(page)).toEqual([])
    }
    await page.getByRole('radio', { name: 'Livre', exact: true }).click()
    await freePhoto(page, 1, 'vermelho').click()
    expect(await smallTouchTargets(page)).toEqual([])
    expect(await horizontalOverflow(page)).toBe(0)
  })
})
