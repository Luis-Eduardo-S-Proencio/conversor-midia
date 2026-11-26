import { expect, test } from '@playwright/test'
import { expectNoAxeViolations, fileInput, fixture } from './image-tool.ts'
import { horizontalOverflow, videoFixture } from './video-tool.ts'

// Imagens e Vídeos: o botão de abrir leva a "O que fazer com este arquivo?", e as ferramentas do tipo
// ficam numa lista agrupada (linhas de pelo menos 64 px). Com uma foto aberta, a colagem não entra no painel.

for (const page_ of [
  { path: '/imagens', heading: 'Imagens', list: 'Ferramentas de imagem', open: 'Abrir imagens', count: 5, listCount: 6, file: () => fixture('foto.jpg') },
  { path: '/videos', heading: 'Vídeos', list: 'Ferramentas de vídeo', open: 'Abrir vídeo', count: 7, listCount: 7, file: () => videoFixture('segundos.mp4') },
] as const) {
  test.describe(page_.heading, () => {
    test('o botão de abrir leva ao painel com as ferramentas do tipo', async ({ page }) => {
      await page.goto(page_.path)
      await expect(page.getByRole('heading', { level: 1, name: page_.heading })).toBeVisible()
      await expect(page.getByRole('button', { name: page_.open })).toBeVisible()
      await fileInput(page).setInputFiles(page_.file())
      const dialog = page.getByRole('dialog', { name: 'O que fazer com este arquivo?' })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('link')).toHaveCount(page_.count)
    })

    test('lista agrupada das ferramentas, sem rolagem lateral', async ({ page }) => {
      await page.goto(page_.path)
      const region = page.getByRole('region', { name: page_.list })
      await expect(region.getByRole('link')).toHaveCount(page_.listCount)
      expect(await horizontalOverflow(page)).toBe(0)
      await expectNoAxeViolations(page)

      const heights = await region.getByRole('link').evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height))
      expect(heights.every((height) => height >= 64)).toBe(true)
    })
  })
}
