import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { AppShell } from './AppShell'
import type { RouteHandle } from './route-handle'
import { SIDEBAR_COLLAPSED_KEY } from './Sidebar'

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

afterEach(() => {
  localStorage.removeItem(SIDEBAR_COLLAPSED_KEY)
})

describe('AppShell no celular', () => {
  it('telas raiz: cabeçalho com a marca e quatro abas, com a atual marcada', async () => {
    await page.viewport(390, 844)
    const { screenPromise } = renderShell('/imagens')
    const screen = await screenPromise
    const nav = screen.getByRole('navigation', { name: 'Principal' })

    await expect.element(screen.getByRole('banner').getByRole('link', { name: 'Media Tools' })).toBeVisible()
    await expect.element(nav).toBeVisible()
    expect(linkTexts(nav)).toEqual(['Início', 'Imagens', 'Vídeos', 'Sobre'])
    await expect.element(nav.getByRole('link', { name: 'Imagens' })).toHaveAttribute('aria-current', 'page')
    await expect.element(nav.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
    // Nada de menu "Mais opções": instalar fica no cabeçalho, o Sobre nas abas.
    expect(screen.getByRole('button', { name: 'Mais opções' }).elements()).toHaveLength(0)
  })

  it('o Sobre é uma aba (sem o cabeçalho das raízes, que dá lugar à barra com voltar da própria tela)', async () => {
    await page.viewport(390, 844)
    const { screenPromise } = renderShell('/sobre')
    const screen = await screenPromise
    const nav = screen.getByRole('navigation', { name: 'Principal' })

    await expect.element(nav.getByRole('link', { name: 'Sobre' })).toHaveAttribute('aria-current', 'page')
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
    expect(screen.getByRole('complementary').elements()).toHaveLength(0)
  })
})

describe('AppShell no tablet', () => {
  it('trilho de 72 px à esquerda com as mesmas quatro abas', async () => {
    await page.viewport(800, 1024)
    const { screenPromise } = renderShell('/')
    const screen = await screenPromise
    const nav = screen.getByRole('navigation', { name: 'Principal' })

    await expect.element(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
    expect(linkTexts(nav)).toEqual(['Início', 'Imagens', 'Vídeos', 'Sobre'])
    const rail = screen.getByRole('complementary', { name: 'Navegação' }).element()
    expect(rail.getBoundingClientRect().width).toBe(72)
    expect(rail.getBoundingClientRect().left).toBe(0)
  })
})

describe('AppShell no computador', () => {
  it('barra lateral de 248 px com Início, Imagens e Vídeos, todas as ferramentas e o Sobre no rodapé', async () => {
    await page.viewport(1280, 800)
    const { screenPromise } = renderShell('/')
    const screen = await screenPromise
    const sidebar = screen.getByRole('complementary', { name: 'Navegação' })

    expect(sidebar.element().getBoundingClientRect().width).toBe(248)
    expect(linkTexts(screen.getByRole('navigation', { name: 'Principal' }))).toEqual(['Início', 'Imagens', 'Vídeos'])
    const tools = screen.getByRole('navigation', { name: 'Ferramentas' })
    expect(tools.getByRole('link').elements()).toHaveLength(12)
    await expect.element(tools.getByRole('link', { name: 'Converter imagem' })).toBeVisible()
    await expect.element(tools.getByRole('link', { name: 'Converter vídeo' })).toBeVisible()
    await expect.element(sidebar.getByRole('link', { name: 'Sobre', exact: true })).toBeVisible()
    await expect.element(sidebar.getByRole('link', { name: 'Processamento local' })).toHaveAttribute('href', '/sobre#privacidade')
  })

  it('destaca a ferramenta atual e não mostra um segundo trilho', async () => {
    await page.viewport(1280, 800)
    const { screenPromise } = renderShell('/imagens/converter')
    const screen = await screenPromise
    const tools = screen.getByRole('navigation', { name: 'Ferramentas' })

    await expect.element(tools.getByRole('link', { name: 'Converter imagem' })).toHaveAttribute('aria-current', 'page')
    await expect.element(tools.getByRole('link', { name: 'Converter vídeo' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('complementary').elements()).toHaveLength(1)
  })

  it('recolhe para 72 px e lembra a escolha', async () => {
    await page.viewport(1280, 800)
    const first = renderShell('/')
    const screen = await first.screenPromise
    const sidebar = () => screen.getByRole('complementary', { name: 'Navegação' }).element()

    const toggle = screen.getByRole('button', { name: 'Recolher a barra lateral' })
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'true')
    await toggle.click()
    await expect.element(screen.getByRole('button', { name: 'Expandir a barra lateral' })).toHaveAttribute('aria-expanded', 'false')
    expect(sidebar().getBoundingClientRect().width).toBe(72)
    // Recolhida, os nomes continuam para o leitor de tela.
    await expect.element(screen.getByRole('navigation', { name: 'Ferramentas' }).getByRole('link', { name: 'Criar GIF' })).toBeInTheDocument()
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('1')

    screen.unmount()
    const again = await renderShell('/').screenPromise
    expect(again.getByRole('complementary', { name: 'Navegação' }).element().getBoundingClientRect().width).toBe(72)
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
