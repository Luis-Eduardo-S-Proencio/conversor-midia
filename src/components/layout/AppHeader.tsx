import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '../brand/Logo'
import { IconButton } from '../ui/Button'
import { MenuDrawer } from './MenuDrawer'
import { TAB_ITEMS } from './nav-items'
import { TransitionLink, TransitionNavLink } from './TransitionLink'
import { useScrolled } from './useScrolled'

/**
 * Cabeçalho das telas raiz (Início, Imagens, Vídeos): o menu (☰) no canto esquerdo, a marca e, a partir
 * de 768 px, a navegação principal (no celular ela fica nas abas de baixo). Ganha fundo translúcido e
 * borda só depois que a página rola, e fica parado na troca de página (view-transition-name próprio).
 */
export function AppHeader() {
  const scrolled = useScrolled()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-20 border-b border-transparent pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-(--dur-2) [view-transition-name:app-header] data-scrolled:glass-header data-scrolled:border-border"
    >
      {/* A largura toda: o menu fica no canto superior esquerdo da tela (o ícone, de 20 px num botão de 44, alinha com a margem). */}
      <div className="flex h-(--header-h) w-full items-center gap-1 px-(--gutter)">
        <IconButton icon={Menu} label="Menu" tooltipAlign="start" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="-ml-3" />
        <TransitionLink to="/" direction="tab" className="pressable flex h-11 items-center rounded-md px-1">
          <Logo />
        </TransitionLink>
        <nav aria-label="Principal" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {TAB_ITEMS.map((item) => (
              <li key={item.to}>
                <TransitionNavLink
                  to={item.to}
                  end={item.end}
                  direction="tab"
                  className="flex h-10 items-center rounded-full px-4 text-sm font-medium text-fg-muted transition-colors duration-(--dur-1) hover:text-fg aria-[current=page]:bg-surface-2 aria-[current=page]:text-fg pointer-coarse:h-11 forced-colors:aria-[current=page]:underline"
                >
                  {item.label}
                </TransitionNavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  )
}
