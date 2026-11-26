import { cx } from '../ui/cx'
import { Icon } from '../ui/Icon'
import { TAB_ITEMS } from './nav-items'
import { TransitionNavLink } from './TransitionLink'

/**
 * Abas do celular, iguais no navegador e no app instalado: Início, Imagens e Vídeos.
 * 64 px + a área da barra de gestos. A aba ativa fica com o ícone preenchido no acento e o nome em branco.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Principal"
      className="glass-header fixed inset-x-0 bottom-0 z-20 border-t border-border pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] [view-transition-name:bottom-nav] md:hidden"
    >
      <ul className="mx-auto grid h-(--bottomnav-h) max-w-md grid-cols-3">
        {TAB_ITEMS.map((item) => (
          <li key={item.to}>
            <TransitionNavLink
              to={item.to}
              end={item.end}
              direction="tab"
              className="pressable flex h-full flex-col items-center justify-center gap-1 text-xs font-medium text-fg-subtle focus-visible:-outline-offset-4 aria-[current=page]:text-fg forced-colors:aria-[current=page]:underline"
            >
              {({ isActive }) => (
                <>
                  <Icon icon={item.icon} filled={isActive} className={cx(isActive && 'text-accent')} />
                  {item.label}
                </>
              )}
            </TransitionNavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
