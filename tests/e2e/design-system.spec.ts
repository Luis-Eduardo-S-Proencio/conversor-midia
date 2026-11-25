import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { WCAG_TAGS } from './routes.ts'

// A vitrine (/_design) reúne todos os tokens, componentes e estados, fora da navegação.
const FIRST_LOAD = { timeout: 15_000 }

test.describe('vitrine de componentes', () => {
  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'celular', width: 360, height: 780 },
  ]) {
    test(`sem violações automáticas de acessibilidade (${viewport.name})`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport)
      await page.goto('/_design')
      await expect(page.getByRole('heading', { level: 1, name: 'Design System' })).toBeVisible(FIRST_LOAD)

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
    await page.goto('/_design')
    await expect(page.getByRole('heading', { level: 1, name: 'Design System' })).toBeVisible(FIRST_LOAD)
    await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0)
  })

  test('não é indexada por buscadores', async ({ page }) => {
    await page.goto('/_design')
    await expect(page.getByRole('heading', { level: 1, name: 'Design System' })).toBeVisible(FIRST_LOAD)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
  })

  test('mostra as duas variantes de acento lado a lado', async ({ page }) => {
    await page.goto('/_design')
    const pink = page.getByRole('button', { name: 'Baixar' }).first()
    const violet = page.locator('[data-accent="violet"]').getByRole('button', { name: 'Baixar' })
    const background = (locator: typeof pink) => locator.evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(await background(pink)).toBe('rgb(214, 36, 102)') // #D62466
    expect(await background(violet)).toBe('rgb(109, 74, 255)') // #6D4AFF
  })

  test('painel de baixo abre, aplica e fecha com o voltar do navegador', async ({ page }) => {
    await page.goto('/_design')
    await page.getByRole('button', { name: 'Abrir painel de velocidade' }).click()
    const sheet = page.getByRole('dialog', { name: 'Velocidade' })
    await expect(sheet).toBeVisible()
    await page.goBack()
    await expect(sheet).toBeHidden()
    await expect(page).toHaveURL(/\/_design$/)
  })

  test('seletor de formato funciona pelo teclado', async ({ page }) => {
    await page.goto('/_design')
    const webp = page.getByRole('radio', { name: 'WEBP' })
    await webp.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('radio', { name: 'PNG' })).toBeChecked()
    await expect(page.getByRole('radio', { name: 'PNG' })).toBeFocused()
  })
})
