import { expect, test } from '@playwright/test'
import { expectNoAxeViolations } from './image-tool.ts'
import { horizontalOverflow } from './video-tool.ts'

// Sobre: app (versão, compartilhar), privacidade, limites, formatos, perguntas e créditos.

test.describe('Sobre', () => {
  test('mostra o app com a versão, e as perguntas abrem e fecham', async ({ page }) => {
    await page.goto('/sobre')
    await expect(page.getByRole('heading', { level: 1, name: 'Sobre' })).toBeVisible()
    await expect(page.getByText(/^Versão \d+\.\d+\.\d+$/)).toBeVisible()
    for (const section of ['Privacidade', 'Limites', 'Formatos', 'Perguntas frequentes', 'Créditos e licenças']) {
      await expect(page.getByRole('heading', { level: 2, name: section })).toBeVisible()
    }

    const question = page.getByRole('button', { name: 'Meus arquivos vão para algum servidor?' })
    await expect(question).toHaveAttribute('aria-expanded', 'false')
    await question.click()
    await expect(question).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('region', { name: 'Meus arquivos vão para algum servidor?' })).toContainText('Não.')
    await expectNoAxeViolations(page)
    expect(await horizontalOverflow(page)).toBe(0)
  })

  test('Compartilhar oferece o endereço do app (ou copia o link)', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.addInitScript(() => {
      // Sem a folha do sistema (como no computador): cai no copiar o link.
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    })
    await page.goto('/sobre')
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    await expect(page.getByText('Link copiado.')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL('/', page.url()).href)
  })

  test('no computador, Privacidade e Limites ficam lado a lado', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'duas colunas só no computador')
    await page.goto('/sobre')
    const privacy = await page.getByRole('region', { name: 'Privacidade' }).boundingBox()
    const limits = await page.getByRole('region', { name: 'Limites' }).boundingBox()
    if (!privacy || !limits) throw new Error('seções ausentes')
    expect(Math.round(privacy.y)).toBe(Math.round(limits.y))
    expect(limits.x).toBeGreaterThan(privacy.x + privacy.width - 1)
  })
})
