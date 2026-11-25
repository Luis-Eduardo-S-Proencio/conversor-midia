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
          { path: 'sobre', element: <h1>Sobre o Media Tools</h1> },
          { path: 'ferramenta', handle: { editor: true } satisfies RouteHandle, element: <h1>Ferramenta</h1> },
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
    expect(nav.getByRole('link').elements().map((link) => link.textContent)).toEqual(['Início', 'Imagens', 'Vídeos'])
  })

  it('o menu "Mais opções" do cabeçalho leva ao Sobre', async () => {
    await page.viewport(390, 844)
    const { router, screenPromise } = renderShell('/')
    const screen = await screenPromise

    await screen.getByRole('banner').getByRole('button', { name: 'Mais opções' }).click()
    await screen.getByRole('link', { name: 'Sobre o Media Tools' }).click()
    await expect.element(screen.getByRole('heading', { name: 'Sobre o Media Tools' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/sobre')
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
  /** Largura da barra lateral, que envolve o menu principal. */
  function sideWidth(nav: Element): number {
    const bar = nav.parentElement
    if (!bar) throw new Error('menu fora da barra lateral')
    return bar.getBoundingClientRect().width
  }

  it('mostra o menu na barra lateral, à esquerda, em vez da barra inferior', async () => {
    await page.viewport(1280, 800)
    const { screenPromise } = renderShell('/')
    const screen = await screenPromise
    const navs = screen.getByRole('navigation', { name: 'Principal' })

    expect(navs.elements()).toHaveLength(1)
    await expect.element(navs.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
    const nav = navs.element()
    expect(nav.getBoundingClientRect().left).toBeLessThan(10)
    expect(sideWidth(nav)).toBe(240)
  })

  it('a barra lateral leva a Início, Imagens e Vídeos; o Sobre fica no rodapé', async () => {
    await page.viewport(1280, 800)
    const { screenPromise } = renderShell('/')
    const screen = await screenPromise
    const nav = screen.getByRole('navigation', { name: 'Principal' })

    await expect.element(nav).toBeVisible()
    expect(nav.getByRole('link').elements().map((link) => link.textContent?.trim())).toEqual(['Início', 'Imagens', 'Vídeos'])
    await expect.element(screen.getByRole('navigation', { name: 'Rodapé' }).getByRole('link', { name: 'Sobre', exact: true })).toBeVisible()
    // O menu "Mais opções" é do cabeçalho do celular, que some a partir de 768 px.
    expect(screen.getByRole('button', { name: 'Mais opções' }).elements()).toHaveLength(0)
  })

  it('nas telas de editor a barra lateral fica estreita, com os mesmos destinos', async () => {
    await page.viewport(1280, 800)
    const { screenPromise } = renderShell('/ferramenta')
    const screen = await screenPromise
    const nav = screen.getByRole('navigation', { name: 'Principal' })

    await expect.element(nav.getByRole('link', { name: 'Imagens' })).toBeVisible()
    expect(sideWidth(nav.element())).toBe(80)
  })

  it('no tablet a barra lateral é estreita em todas as telas', async () => {
    await page.viewport(800, 1024)
    const { screenPromise } = renderShell('/')
    const screen = await screenPromise
    const nav = screen.getByRole('navigation', { name: 'Principal' })

    await expect.element(nav.getByRole('link', { name: 'Início' })).toBeVisible()
    expect(sideWidth(nav.element())).toBe(80)
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
