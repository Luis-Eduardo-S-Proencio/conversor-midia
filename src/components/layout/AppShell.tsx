import { useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router'
import { cx } from '../ui/cx'
import { ToastProvider } from '../ui/Toast'
import { AppHeader } from './AppHeader'
import { BottomNav } from './BottomNav'
import { layoutOf } from './route-handle'

function SkipLink() {
  return (
    <a
      href="#conteudo"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-surface-2 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-fg"
    >
      Pular para o conteúdo
    </a>
  )
}

/**
 * Estrutura comum a todas as telas, conforme o layout da rota (`handle.layout`):
 * - telas raiz (Início, Imagens, Vídeos): cabeçalho com o menu (☰) e a marca; no celular, abas embaixo;
 *   a partir de 768 px, a navegação fica no próprio cabeçalho;
 * - telas internas (ferramentas, Sobre): só a barra superior da própria tela (TopAppBar), com voltar;
 * - editor: tela cheia, sem nenhuma barra do site.
 * Ao trocar de página, o foco vai para o conteúdo principal, para o leitor de tela não ficar no menu.
 */
export function AppShell() {
  const { pathname, hash } = useLocation()
  const layout = layoutOf(useMatches().map((match) => match.handle))
  const mainRef = useRef<HTMLElement>(null)
  const previousLocation = useRef(pathname + hash)

  useEffect(() => {
    // Comparar com o endereço anterior evita mover o foco na primeira carga (inclusive no StrictMode).
    const location = pathname + hash
    if (previousLocation.current === location) return
    previousLocation.current = location
    // Com âncora (#secao), o foco vai para a seção pedida; senão, para o início do conteúdo.
    const anchorTarget = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
    const isFocusable = anchorTarget !== null && (anchorTarget.tabIndex >= 0 || anchorTarget.hasAttribute('tabindex'))
    if (anchorTarget && isFocusable) {
      anchorTarget.focus()
    } else {
      mainRef.current?.focus({ preventScroll: true })
    }
  }, [pathname, hash])

  const root = layout === 'root'
  return (
    <div
      className={cx(
        'min-h-dvh',
        // Avisos acima da barra inferior do celular, quando ela aparece.
        root && 'max-md:[--toast-lift:var(--bottomnav-h)]',
      )}
    >
      <ToastProvider>
        <SkipLink />
        <div
          className={cx(
            'flex min-h-dvh min-w-0 flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]',
            root && 'max-md:pb-[calc(var(--bottomnav-h)+env(safe-area-inset-bottom))]',
          )}
        >
          {root && <AppHeader />}
          <main id="conteudo" ref={mainRef} tabIndex={-1} className="flex-1 focus:outline-none">
            <Outlet />
          </main>
        </div>
        {root && <BottomNav />}
        <ScrollRestoration />
      </ToastProvider>
    </div>
  )
}
