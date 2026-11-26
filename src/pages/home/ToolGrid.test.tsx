import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ToolGrid } from './ToolGrid'

function renderGrid() {
  // Com a margem lateral do celular (16 px), como no app.
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <div style={{ paddingInline: 16 }}>
          <ToolGrid />
        </div>
      ),
    },
  ])
  return render(<RouterProvider router={router} />)
}

/** A última linha fecha: o último item termina na borda direita da grade. */
function lastRowIsFull(): boolean {
  const list = document.querySelector('ul')
  const last = list?.lastElementChild
  if (!list || !last) return false
  return Math.abs(list.getBoundingClientRect().right - last.getBoundingClientRect().right) < 2
}

describe('grade de ferramentas do Início', () => {
  for (const [width, height, label] of [
    [390, 844, 'celular'],
    [800, 1024, 'tablet'],
    [1280, 800, 'computador'],
  ] as const) {
    it(`filtra por tipo, e nenhuma linha fica com buraco (${label})`, async () => {
      await page.viewport(width, height)
      const screen = await renderGrid()
      const links = () => screen.getByRole('link').elements()

      expect(links()).toHaveLength(12)
      expect(lastRowIsFull()).toBe(true)

      await screen.getByRole('radio', { name: 'Vídeo' }).click()
      expect(links()).toHaveLength(7)
      expect(lastRowIsFull()).toBe(true)

      await screen.getByRole('radio', { name: 'Imagem' }).click()
      expect(links()).toHaveLength(5)
      expect(lastRowIsFull()).toBe(true)
    })
  }

  it('o filtro fica ao lado do título no celular', async () => {
    await page.viewport(390, 844)
    const screen = await renderGrid()
    await document.fonts.ready
    const title = screen.getByRole('heading', { name: 'Ferramentas' }).element().getBoundingClientRect()
    const filter = screen.getByRole('radiogroup', { name: 'Mostrar ferramentas de' }).element().getBoundingClientRect()
    expect(filter.top).toBeLessThan(title.bottom) // mesma linha
  })
})
