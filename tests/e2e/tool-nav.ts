import { expect, type Locator, type Page } from '@playwright/test'

const SHEET_TITLE = { image: 'Ferramentas de imagem', video: 'Ferramentas de vídeo' } as const

/**
 * Troca de ferramenta: abre "Outras ferramentas" (na barra da ferramenta, em qualquer largura) e devolve
 * o link da ferramenta pelo nome completo, que diferencia "Converter imagem" de "Converter vídeo".
 */
export async function toolLink(page: Page, media: 'image' | 'video', title: string): Promise<Locator> {
  const name = SHEET_TITLE[media]
  const sheet = page.getByRole('dialog', { name })
  if (!(await sheet.isVisible())) await page.getByRole('button', { name: 'Outras ferramentas' }).click()
  await expect(sheet).toBeVisible()
  return sheet.getByRole('navigation', { name }).getByRole('link', { name: new RegExp(`^${title}`) })
}

/** Fecha o painel "Outras ferramentas" sem trocar de ferramenta. */
export async function closeToolSheet(page: Page, media: 'image' | 'video'): Promise<void> {
  const sheet = page.getByRole('dialog', { name: SHEET_TITLE[media] })
  await sheet.getByRole('button', { name: 'Fechar' }).click()
  await expect(sheet).toBeHidden()
}
