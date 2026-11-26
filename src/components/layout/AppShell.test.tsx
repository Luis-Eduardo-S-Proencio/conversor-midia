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
          { index: true, handle: { layout: 'root' } satisfies RouteHandle, element: <h1>Página inicial</h1> },
          { path: 'imagens', handle: { layout: 'root' } satisfies RouteHandle, element: <h1>Imagens</h1> },
          { path: 'sobre', element: <h1>Sobre</h1> },
          { path: 'imagens/converter', handle: { layout: 'tool' } satisfies RouteHandle, element: <h1>Converter imagem</h1> },
          { path: 'editor', handle: { layout: 'editor' } satisfies RouteHandle, element: <h1>Editor</h1> },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  )
  return { router, screenPromise: render(<RouterProvider router={router} />) }
}

function linkTexts(nav: { getByRole: (role: 'link') => { elements: () => Element[] } }): string[] {
  return nav
    .getByRole('link')
    .elements()
    .map((link) => link.textContent?.trim() ?? '')
}

describe('AppShell no celular', () => {
  it('telas raiz: menu (☰) e marca no alto e três abas embaixo, com a atual marcada', async () => {
    await page.viewport(390, 844)
    const { screenPromise } = renderShell('/imagens')
    const screen = await screenPromise
    const nav = screen.getByRole('navigation', { name: 'Principal' })

    await expect.element(screen.getByRole('banner').getByRole('button', { name: 'Menu' })).toBeVisible()
    await expect.element(screen.getByRole('banner').getByRole('link', { name: 'Media Tools' })).toBeVisible()
    await expect.element(nav).toBeVisible()
    expect(linkTexts(nav)).toEqual(['Início', 'Imagens', 'Vídeos'])
    await expect.element(nav.getByRole('link', { name: 'Imagens' })).toHaveAttribute('aria-current', 'page')
    await expect.element(nav.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
    // As abas ficam embaixo, coladas ao fim da tela.
    expect(Math.round(nav.element().getBoundingClientRect().bottom)).toBe(844)
  })

  it('o menu abre pela esquerda com o Sobre', async () => {
    await page.viewport(390, 844)
    const { screenPromise } = renderShell('/')
    const screen = await screenPromise

    await screen.getByRole('button', { name: 'Menu' }).click()
    const menu = screen.getByRole('dialog', { name: 'Menu' })
    await expect.element(menu).toBeVisible()
    await expect.element(menu.getByRole('link', { name: 'Sobre o Media Tools' })).toHaveAttribute('href', '/sobre')
    await expect.element(menu.getByRole('link', { name: 'Licenças de código aberto' })).toHaveAttribute('href', '/sobre/licencas')
    await expect.element(menu.getByText(/^Versão \d+\.\d+\.\d+$/)).toBeVisible()

    await menu.getByRole('button', { name: 'Fechar menu' }).click()
    await expect.element(menu).not.toBeInTheDocument()
  })

  it('o Sobre não tem as abas: só a barra com voltar da própria tela', async () => {
    await page.viewport(390, 844)
    const { screenPromise } = renderShell('/sobre')
    const screen = await screenPromise

    await expect.element(screen.getByRole('heading', { name: 'Sobre' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Principal' }).elements()).toHaveLength(0)
    expect(screen.getByRole('banner').elements()).toHaveLength(0)
  })

  it('a barra inferior não cobre o fim da página', async () => {
    await page.viewport(390, 844)
    const { screenPromise } = renderShell('/')
    const screen = await screenPromise
    const column = screen.getByRole('main').element().parentElement
    if (!column) throw new Error('coluna do conteúdo ausente')
    // O espaço reservado embaixo é a altura da barra (64 px), fora a área da barra de gestos.
    expect(Number.parseFloat(getComputedStyle(column).paddingBottom)).toBeGreaterThanOrEqual(64)
  })

  it('esconde as abas nas ferramentas (modo foco)', async () => {
    await page.viewport(390, 844)
    const { screenPromise } = renderShell('/imagens/converter')
    const screen = await screenPromise

    await expect.element(screen.getByRole('heading', { name: 'Converter imagem' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Principal' }).elements()).toHaveLength(0)
  })

  it('o editor é tela cheia, sem nenhuma barra do site', async () => {
    await page.viewport(1280, 800)
    const { screenPromise } = renderShell('/editor')
    const screen = await screenPromise

    await expect.element(screen.getByRole('heading', { name: 'Editor' })).toBeVisible()
    expect(screen.getByRole('navigation').elements()).toHaveLength(0)
    expect(screen.getByRole('banner').elements()).toHaveLength(0)
  })
})

describe('AppShell a partir de 768 px', () => {
  it('a navegação fica no cabeçalho, sem abas embaixo nem barra lateral', async () => {
    await page.viewport(1280, 800)
    const { screenPromise } = renderShell('/')
    const screen = await screenPromise
    const banner = screen.getByRole('banner')
    const nav = banner.getByRole('navigation', { name: 'Principal' })

    await expect.element(banner.getByRole('button', { name: 'Menu' })).toBeVisible()
    expect(linkTexts(nav)).toEqual(['Início', 'Imagens', 'Vídeos'])
    await expect.element(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
    // Uma navegação principal só por largura (a das abas fica escondida).
    expect(screen.getByRole('navigation', { name: 'Principal' }).elements()).toHaveLength(1)
    expect(nav.element().getBoundingClientRect().top).toBeLessThan(80)
    expect(screen.getByRole('complementary').elements()).toHaveLength(0)
  })

  it('no tablet, também no cabeçalho', async () => {
    await page.viewport(800, 1024)
    const { screenPromise } = renderShell('/imagens')
    const screen = await screenPromise
    const nav = screen.getByRole('banner').getByRole('navigation', { name: 'Principal' })
    await expect.element(nav.getByRole('link', { name: 'Imagens' })).toHaveAttribute('aria-current', 'page')
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
