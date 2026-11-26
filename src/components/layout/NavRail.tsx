import { useLocation } from 'react-router'
import { LogoMark } from '../brand/Logo'
import { cx } from '../ui/cx'
import { Icon } from '../ui/Icon'
import { InstallButton } from './InstallButton'
import { TAB_ITEMS, activeTabIndex } from './nav-items'
import { TransitionLink, TransitionNavLink } from './TransitionLink'

/**
 * Tablet (768 a 1023 px): trilho de 72 px à esquerda com as mesmas abas do celular
 * (ícone e rótulo) e, embaixo, "Instalar" quando der para instalar.
 */
export function NavRail() {
  const { pathname } = useLocation()
  const active = activeTabIndex(pathname)

  return (
    <aside
      aria-label="Navegação"
      className="sticky top-0 hidden h-dvh w-(--rail-w) shrink-0 flex-col items-center gap-4 border-r border-border bg-surface-1 pt-[max(1rem,env(safe-area-inset-top))] pb-4 pl-[env(safe-area-inset-left)] [view-transition-name:nav-rail] md:flex lg:hidden"
    >
      <TransitionLink to="/" direction="tab" className="pressable grid size-11 place-items-center rounded-md">
        <LogoMark className="size-9" />
        <span className="sr-only">Media Tools, início</span>
      </TransitionLink>
      <nav aria-label="Principal" className="w-full px-1.5">
        <ul className="grid gap-1">
          {TAB_ITEMS.map((item, index) => (
            <li key={item.to}>
              <TransitionNavLink
                to={item.to}
                end={item.end}
                direction="tab"
                className="pressable group flex flex-col items-center gap-1 rounded-md py-2 text-xs font-medium text-fg-muted hover:pointer-fine:text-fg aria-[current=page]:text-fg forced-colors:aria-[current=page]:underline"
              >
                <span
                  className={cx(
                    'grid h-8 w-14 place-items-center rounded-full transition-colors duration-(--dur-2)',
                    index === active && 'bg-accent-soft text-accent',
                  )}
                >
                  <Icon icon={item.icon} filled={index === active} />
                </span>
                {item.label}
              </TransitionNavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto w-full px-1.5">
        <InstallButton variant="rail" />
      </div>
    </aside>
  )
}
