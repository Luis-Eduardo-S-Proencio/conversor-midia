import { expect, test } from '@playwright/test'
import { expectNoAxeViolations, fileInput, fixture } from './image-tool.ts'
import { horizontalOverflow, videoFixture } from './video-tool.ts'

// Imagens e Vídeos: o botão grande de abrir leva a "O que fazer com este arquivo?";
// celular em linhas de 72 px, computador em grade sem buraco.

for (const page_ of [
  { path: '/imagens', heading: 'Ferramentas de imagem', open: 'Abrir imagens', count: 5, file: () => fixture('foto.jpg') },
  { path: '/videos', heading: 'Ferramentas de vídeo', open: 'Abrir vídeo', count: 7, file: () => videoFixture('segundos.mp4') },
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

    test('lista no celular, grade sem buraco no computador, sem rolagem lateral', async ({ page }, testInfo) => {
      await page.goto(page_.path)
      const region = page.getByRole('region', { name: page_.heading })
      await expect(region.getByRole('link')).toHaveCount(page_.count)
      expect(await horizontalOverflow(page)).toBe(0)
      await expectNoAxeViolations(page)

      if (testInfo.project.name === 'mobile') {
        // Linhas de 72 px.
        const heights = await region.getByRole('link').evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height))
        expect(heights.every((height) => height >= 72)).toBe(true)
      } else {
        const full = await region.locator('ul:visible').evaluate((list) => {
          const last = list.lastElementChild
          return last ? Math.abs(list.getBoundingClientRect().right - last.getBoundingClientRect().right) < 2 : false
        })
        expect(full).toBe(true)
      }
    })
  })
}
