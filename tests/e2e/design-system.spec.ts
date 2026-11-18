import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { WCAG_TAGS } from './routes.ts'

// Roda no servidor de desenvolvimento: a vitrine reúne todos os componentes e estados.
test.describe('vitrine de componentes', () => {
  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'celular', width: 360, height: 780 },
  ]) {
    test(`sem violações automáticas de acessibilidade (${viewport.name})`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport)
      await page.goto('/design-system')
      await expect(page.getByRole('heading', { level: 1, name: 'Design System' })).toBeVisible()

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
      const violations = results.violations.map(
        (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
      )
      expect(violations).toEqual([])

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBe(0)
      await page.screenshot({ path: testInfo.outputPath(`vitrine-${viewport.name}.png`), fullPage: true })
    })
  }

  test('rota de ferramenta esconde a barra inferior no celular', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    await page.goto('/design-system')
    await expect(page.getByRole('heading', { level: 1, name: 'Design System' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0)
  })

  test('seletor de formato funciona pelo teclado', async ({ page }) => {
    await page.goto('/design-system')
    const webp = page.getByRole('radio', { name: 'WEBP' })
    await webp.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('radio', { name: 'PNG' })).toBeChecked()
    await expect(page.getByRole('radio', { name: 'PNG' })).toBeFocused()
  })
})
