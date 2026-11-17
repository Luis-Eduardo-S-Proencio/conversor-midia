import { useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router'
import { cx } from '../ui/cx'
import { BottomNav } from './BottomNav'
import { Footer } from './Footer'
import { isRouteHandle } from './route-handle'
import { TopNav } from './TopNav'

/**
 * Estrutura comum a todas as páginas.
 * Ao trocar de página, o foco vai para o conteúdo principal, para o leitor de tela não ficar no menu.
 */
export function AppShell() {
  const { pathname, hash } = useLocation()
  const hideBottomNav = useMatches().some((match) => isRouteHandle(match.handle) && match.handle.hideBottomNav)
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

  return (
    <div
      className={cx(
        'flex min-h-dvh flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]',
        !hideBottomNav && 'pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] md:pb-0',
      )}
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-fg"
      >
        Pular para o conteúdo
      </a>
      <TopNav />
      <main id="conteudo" ref={mainRef} tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
      {!hideBottomNav && <BottomNav />}
      <ScrollRestoration />
    </div>
  )
}
