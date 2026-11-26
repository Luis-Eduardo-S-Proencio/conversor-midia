import { Minimize2 } from 'lucide-react'
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ToastProvider } from '../ui/Toast'
import { InstallButton } from './InstallButton'
import { installOfferFor, isAppleMobile } from './install-app'
import { activeTabIndex } from './nav-items'
import { TopAppBar } from './TopAppBar'

const COMPRESS = { id: 'video-compress', icon: Minimize2, tone: 'compress' as const, media: 'video' as const }

function ToolScreen() {
  return <TopAppBar title="Comprimir vídeo" backTo="/videos" tool={COMPRESS} />
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
  it('título é o h1 da tela e, no computador, vem com a trilha até o pai', async () => {
    await page.viewport(1280, 800)
    const { screenPromise } = renderRoutes(['/videos/comprimir'])
    const screen = await screenPromise
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Comprimir vídeo' })).toBeVisible()
    await expect.element(screen.getByRole('link', { name: 'Vídeos' })).toHaveAttribute('href', '/videos')
  })

  it('no celular, a trilha some e fica o voltar com o título', async () => {
    await page.viewport(390, 844)
    const { screenPromise } = renderRoutes(['/videos/comprimir'])
    const screen = await screenPromise
    await expect.element(screen.getByRole('button', { name: 'Voltar' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Vídeos' }).elements()).toHaveLength(0)
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
  it('a aba ativa acompanha as telas de dentro de Imagens e Vídeos', () => {
    expect(activeTabIndex('/')).toBe(0)
    expect(activeTabIndex('/imagens')).toBe(1)
    expect(activeTabIndex('/imagens/converter')).toBe(1)
    expect(activeTabIndex('/videos/gif')).toBe(2)
    expect(activeTabIndex('/sobre')).toBe(3)
    expect(activeTabIndex('/endereco-que-nao-existe')).toBe(-1)
    expect(activeTabIndex('/imagens-falsas')).toBe(-1)
  })
})

describe('instalar o app', () => {
  it('o botão só aparece quando dá para instalar', () => {
    expect(installOfferFor('prompt', false)).toBe('prompt')
    expect(installOfferFor('manual', true)).toBe('guide')
    expect(installOfferFor('manual', false)).toBeNull() // Firefox no computador, por exemplo
    expect(installOfferFor('installed', true)).toBeNull()
    expect(installOfferFor('installed', false)).toBeNull()
  })

  it('reconhece iPhone e iPad (o iPadOS se apresenta como Mac, mas tem toque)', () => {
    expect(isAppleMobile('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe(true)
    expect(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true)
    expect(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
    expect(isAppleMobile('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5)).toBe(false)
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

  /** O botão fica no shell, dentro do roteador (o painel de instruções fecha com o voltar). */
  function renderInstallButton() {
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <ToastProvider>
            <InstallButton variant="header" />
          </ToastProvider>
        ),
      },
    ])
    return render(<RouterProvider router={router} />)
  }

  // O estado da instalação é do módulo (como numa visita real): os testes que mexem nele vêm por último.
  it('sem o pedido do navegador (fora do iPhone), o botão não aparece', async () => {
    const screen = await renderInstallButton()
    expect(screen.getByRole('button', { name: 'Instalar' }).elements()).toHaveLength(0)
  })

  it('com o pedido do Chromium, "Instalar" o abre direto; aceito, avisa e some', async () => {
    const screen = await renderInstallButton()
    const accepted = offerInstall('accepted')
    expect(accepted.event.defaultPrevented).toBe(true) // sem a faixa automática do navegador por cima das abas
    await screen.getByRole('button', { name: 'Instalar' }).click()
    expect(accepted.prompt).toHaveBeenCalledOnce()
    await expect.element(screen.getByText('Pronto! O Media Tools está instalado.')).toBeVisible()

    window.dispatchEvent(new Event('appinstalled'))
    await expect.element(screen.getByRole('button', { name: 'Instalar' })).not.toBeInTheDocument()
  })
})
