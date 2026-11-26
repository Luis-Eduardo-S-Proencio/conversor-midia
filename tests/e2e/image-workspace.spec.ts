import { expect, test, type Page } from '@playwright/test'
import { closeToolSheet, toolLink } from './tool-nav.ts'
import { expectNoAxeViolations, fileInput, fixture, openImageTool } from './image-tool.ts'
import { horizontalOverflow } from './video-tool.ts'

// O editor de imagens: troca de ferramenta ("Outras ferramentas") sem escolher as imagens de novo e
// prévia grande da imagem escolhida quando há várias.

const listed = (page: Page, name: string) => page.getByText(name, { exact: true }).first()

test.describe('Editor de imagens', () => {
  test('trocar de ferramenta leva as imagens abertas, e a atual fica marcada', async ({ page }) => {
    await openImageTool(page, '/imagens/converter', 'Converter imagem')
    await expect(await toolLink(page, 'image', 'Converter imagem')).toHaveAttribute('aria-current', 'page')
    await expectNoAxeViolations(page)
    expect(await horizontalOverflow(page)).toBe(0)
    await closeToolSheet(page, 'image')
    await expect(page.getByRole('button', { name: 'Outras ferramentas' })).toBeFocused()

    await fileInput(page).setInputFiles([fixture('foto.jpg'), fixture('quadrantes.png')])
    await expect(page.getByRole('img', { name: 'Pré-visualização de foto.jpg' })).toBeVisible()

    await (await toolLink(page, 'image', 'Comprimir imagem')).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Comprimir imagem' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(listed(page, 'foto.jpg')).toBeVisible()
    await expect(listed(page, 'quadrantes.png')).toBeVisible()

    // Tocar de novo na ferramenta atual não recarrega nem perde as imagens.
    const current = await toolLink(page, 'image', 'Comprimir imagem')
    await expect(current).toHaveAttribute('aria-current', 'page')
    await current.click()
    await closeToolSheet(page, 'image')
    await expect(listed(page, 'quadrantes.png')).toBeVisible()
  })

  test('várias imagens: a miniatura escolhe qual aparece grande', async ({ page }) => {
    await openImageTool(page, '/imagens/redimensionar', 'Redimensionar imagem')
    await fileInput(page).setInputFiles([fixture('foto.jpg'), fixture('quadrantes.png')])
    await expect(page.getByRole('img', { name: 'Pré-visualização de foto.jpg' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mostrar foto.jpg' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Mostrar quadrantes.png' }).click()
    await expect(page.getByRole('img', { name: 'Pré-visualização de quadrantes.png' })).toBeVisible()
    await expect(page.getByRole('img', { name: 'Pré-visualização de foto.jpg' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Mostrar quadrantes.png' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('de uma imagem por vez para o lote e de volta: o Recortar fica com a primeira', async ({ page }) => {
    await openImageTool(page, '/imagens/girar', 'Girar e espelhar')
    await fileInput(page).setInputFiles([fixture('foto.jpg'), fixture('quadrantes.png')])
    await expect(listed(page, 'quadrantes.png')).toBeVisible()

    await (await toolLink(page, 'image', 'Recortar imagem')).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Recortar imagem' })).toBeVisible()
    await expect(listed(page, 'foto.jpg')).toBeVisible()
    await expect(page.getByText('quadrantes.png', { exact: true })).toHaveCount(0)
  })

  test('a troca toma o lugar do painel no histórico: voltar leva à tela de antes', async ({ page }) => {
    await page.goto('/imagens')
    await page.getByRole('main').getByRole('link', { name: /^Girar e espelhar/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Girar e espelhar' })).toBeVisible()
    await (await toolLink(page, 'image', 'Converter imagem')).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Converter imagem' })).toBeVisible()

    await page.goBack()
    await expect(page.getByRole('heading', { level: 1, name: 'Girar e espelhar' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
