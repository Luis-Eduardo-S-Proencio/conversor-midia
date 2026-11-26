import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ToastProvider } from '../ui/Toast'
import { AppHeader } from './AppHeader'
import { installPlatform, isAppleMobile } from './install-app'
import { activeTabIndex } from './nav-items'
import { TopAppBar } from './TopAppBar'

function ToolScreen() {
  return <TopAppBar title="Comprimir vídeo" backTo="/videos" actions={<button type="button">Outras ferramentas</button>} />
}

function Home() {
  const navigate = useNavigate()
  return (
    <>
      <h1>Início</h1>
      <button type="button" onClick={() => void navigate('/videos/comprimir')}>
        Abrir ferramenta
      </button>
    </>
  )
}

function renderRoutes(initialEntries: string[]) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <Home /> },
      { path: '/videos', element: <h1>Vídeos</h1> },
      { path: '/videos/comprimir', element: <ToolScreen /> },
    ],
    { initialEntries },
  )
  return { router, screenPromise: render(<RouterProvider router={router} />) }
}

describe('TopAppBar', () => {
  it('voltar, o título como h1 da tela e as ações à direita', async () => {
    await page.viewport(390, 844)
    const { screenPromise } = renderRoutes(['/videos/comprimir'])
    const screen = await screenPromise
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Comprimir vídeo' })).toBeVisible()
    const back = screen.getByRole('button', { name: 'Voltar' }).element().getBoundingClientRect()
    const action = screen.getByRole('button', { name: 'Outras ferramentas' }).element().getBoundingClientRect()
    expect(back.left).toBeLessThan(action.left)
  })

  it('quem chegou navegando volta para onde estava', async () => {
    const { router, screenPromise } = renderRoutes(['/'])
    const screen = await screenPromise
    await screen.getByRole('button', { name: 'Abrir ferramenta' }).click()
    await screen.getByRole('button', { name: 'Voltar' }).click()
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible()
    expect(router.state.historyAction).toBe('POP')
  })

  it('quem abriu um link direto vai para o pai lógico, sem empilhar', async () => {
    const { router, screenPromise } = renderRoutes(['/videos/comprimir'])
    const screen = await screenPromise
    await screen.getByRole('button', { name: 'Voltar' }).click()
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Vídeos' })).toBeVisible()
    expect(router.state.historyAction).toBe('REPLACE')
  })
})

describe('abas', () => {
  it('a aba ativa acompanha as telas de dentro de Imagens e Vídeos; o Sobre não é aba', () => {
    expect(activeTabIndex('/')).toBe(0)
    expect(activeTabIndex('/imagens')).toBe(1)
    expect(activeTabIndex('/imagens/converter')).toBe(1)
    expect(activeTabIndex('/videos/gif')).toBe(2)
    expect(activeTabIndex('/sobre')).toBe(-1)
    expect(activeTabIndex('/endereco-que-nao-existe')).toBe(-1)
    expect(activeTabIndex('/imagens-falsas')).toBe(-1)
  })
})

describe('instalar o app', () => {
  it('reconhece iPhone e iPad (o iPadOS se apresenta como Mac, mas tem toque)', () => {
    expect(isAppleMobile('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe(true)
    expect(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true)
    expect(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
    expect(isAppleMobile('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5)).toBe(false)
  })

  it('escolhe o passo a passo do aparelho', () => {
    expect(installPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe('apple')
    expect(installPlatform('Mozilla/5.0 (Linux; Android 15; 23090RA98G)', 5)).toBe('android')
    expect(installPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0)).toBe('desktop')
  })

  /** O Chromium avisando que o app pode ser instalado, com o pedido que o site abre pelo próprio botão. */
  function offerInstall(outcome: 'accepted' | 'dismissed') {
    const prompt = vi.fn(() => Promise.resolve())
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome }),
    })
    window.dispatchEvent(event)
    return { event, prompt }
  }

  /** O cabeçalho com o menu, dentro do roteador (a gaveta fecha com o voltar). */
  function renderHeader() {
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <ToastProvider>
            <AppHeader />
          </ToastProvider>
        ),
      },
      { path: '/sobre', element: <h1>Sobre</h1> },
    ])
    return render(<RouterProvider router={router} />)
  }

  async function openMenu(screen: Awaited<ReturnType<typeof renderHeader>>) {
    await screen.getByRole('button', { name: 'Menu' }).click()
    const menu = screen.getByRole('dialog', { name: 'Menu' })
    await expect.element(menu).toBeVisible()
    return menu
  }

  // O estado da instalação é do módulo (como numa visita real): os testes que mexem nele vêm por último.
  it('sem o pedido do navegador, "Instalar app" mostra o passo a passo dentro do menu', async () => {
    const screen = await renderHeader()
    const menu = await openMenu(screen)
    await menu.getByRole('button', { name: 'Instalar app' }).click()

    const guide = screen.getByRole('dialog', { name: 'Instalar o app' })
    await expect.element(guide.getByRole('heading', { name: 'Instalar o app' })).toHaveFocus()
    await expect.element(guide.getByText(/Chrome e no Edge/)).toBeVisible()
    await guide.getByRole('button', { name: 'Voltar ao menu' }).click()
    await expect.element(screen.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: 'Instalar app' })).toHaveFocus()
  })

  it('com o pedido do Chromium, "Instalar app" o abre direto; aceito, avisa e o item some', async () => {
    const screen = await renderHeader()
    const accepted = offerInstall('accepted')
    expect(accepted.event.defaultPrevented).toBe(true) // sem a faixa automática do navegador por cima das abas
    const menu = await openMenu(screen)
    await menu.getByRole('button', { name: 'Instalar app' }).click()
    expect(accepted.prompt).toHaveBeenCalledOnce()
    await expect.element(screen.getByText('Pronto! O Media Tools está instalado.')).toBeVisible()

    window.dispatchEvent(new Event('appinstalled'))
    const again = await openMenu(screen)
    await expect.element(again.getByRole('link', { name: 'Sobre o Media Tools' })).toBeVisible()
    expect(again.getByRole('button', { name: 'Instalar app' }).elements()).toHaveLength(0)
  })
})
