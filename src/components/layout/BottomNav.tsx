import { useLocation } from 'react-router'
import { cx } from '../ui/cx'
import { Icon } from '../ui/Icon'
import { TAB_ITEMS, activeTabIndex } from './nav-items'
import { TransitionNavLink } from './TransitionLink'

/**
 * Abas do celular, iguais no navegador e no app instalado: Início, Imagens, Vídeos e Sobre.
 * 64 px + a área da barra de gestos. Uma pílula desliza até a aba ativa, cujo ícone fica preenchido.
 */
export function BottomNav() {
  const { pathname } = useLocation()
  const active = activeTabIndex(pathname)

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface-1 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] [view-transition-name:bottom-nav] md:hidden"
    >
      <ul className="relative mx-auto grid h-(--bottomnav-h) max-w-md grid-cols-4">
        {/* A pílula: uma faixa de 1/4 da largura que desliza; o desenho fica centrado nela. */}
        {active >= 0 && (
          <li
            aria-hidden="true"
            className="pointer-events-none absolute top-2 left-0 flex h-8 w-1/4 justify-center transition-[translate] duration-(--dur-3) ease-spring"
            style={{ translate: `${active * 100}% 0` }}
          >
            <span className="h-8 w-14 rounded-full bg-accent-soft" />
          </li>
        )}
        {TAB_ITEMS.map((item, index) => (
          <li key={item.to} className="relative">
            <TransitionNavLink
              to={item.to}
              end={item.end}
              direction="tab"
              className="pressable flex h-full flex-col items-center gap-1 pt-2 text-xs font-medium text-fg-muted focus-visible:-outline-offset-4 aria-[current=page]:text-fg forced-colors:aria-[current=page]:underline"
            >
              <span className="grid h-8 w-14 place-items-center">
                <Icon icon={item.icon} filled={index === active} className={cx(index === active && 'text-accent')} />
              </span>
              {item.label}
            </TransitionNavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
