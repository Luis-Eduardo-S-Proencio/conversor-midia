import type { Locator, Page } from '@playwright/test'

/**
 * Link de troca de ferramenta: abaixo de 1024 px, a fileira de chips da própria ferramenta (nome curto);
 * a partir de 1024 px, a lista de ferramentas da barra lateral (nome completo, que diferencia
 * "Converter imagem" de "Converter vídeo").
 */
export function toolLink(page: Page, media: 'image' | 'video', chip: string, title: string): Locator {
  const wide = (page.viewportSize()?.width ?? 0) >= 1024
  if (wide) return page.getByRole('navigation', { name: 'Ferramentas' }).getByRole('link', { name: title, exact: true })
  const row = media === 'image' ? 'Ferramentas de imagem' : 'Ferramentas de vídeo'
  return page.getByRole('navigation', { name: row }).getByRole('link', { name: chip, exact: true })
}
