import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { AppShell } from './AppShell'
import type { RouteHandle } from './route-handle'

function renderShell(initialPath = '/') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <h1>Página inicial</h1> },
          { path: 'imagens', element: <h1>Imagens</h1> },
          { path: 'ferramenta', handle: { hideBottomNav: true } satisfies RouteHandle, element: <h1>Ferramenta</h1> },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  )
  return { router, screenPromise: render(<RouterProvider router={router} />) }
}

describe('AppShell no celular', () => {
  it('mostra a barra inferior e marca a página atual', async () => {
    await page.viewport(390, 844)
    const { screenPromise } = renderShell('/imagens')
    const screen = await screenPromise
    const nav = screen.getByRole('navigation', { name: 'Principal' })

    await expect.element(nav).toBeVisible()
    await expect.element(nav.getByRole('link', { name: 'Imagens' })).toHaveAttribute('aria-current', 'page')
    await expect.element(nav.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })

  it('esconde a barra inferior em rotas de ferramenta', async () => {
    await page.viewport(390, 844)
    const { screenPromise } = renderShell('/ferramenta')
    const screen = await screenPromise

    await expect.element(screen.getByRole('heading', { name: 'Ferramenta' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Principal' }).elements()).toHaveLength(0)
  })
})

describe('AppShell no desktop', () => {
  it('mostra o menu superior em vez da barra inferior', async () => {
    await page.viewport(1280, 800)
    const { screenPromise } = renderShell('/')
    const screen = await screenPromise
    const navs = screen.getByRole('navigation', { name: 'Principal' })

    expect(navs.elements()).toHaveLength(1)
    await expect.element(navs.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
  })
})

describe('AppShell e foco', () => {
  it('oferece link para pular ao conteúdo', async () => {
    const { screenPromise } = renderShell('/')
    const screen = await screenPromise
    await expect.element(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute('href', '#conteudo')
  })

  it('leva o foco ao conteúdo ao trocar de página, mas não na primeira carga', async () => {
    const { router, screenPromise } = renderShell('/')
    const screen = await screenPromise
    const main = screen.getByRole('main')

    await expect.element(main).not.toHaveFocus()
    await router.navigate('/imagens')
    await expect.element(screen.getByRole('heading', { name: 'Imagens' })).toBeVisible()
    await expect.element(main).toHaveFocus()
  })
})
