import { NavLink } from 'react-router'
import { Icon } from '../ui/Icon'
import { NAV_ITEMS } from './nav-items'

/** Navegação no celular: ao alcance do polegar e respeitando a barra de gestos. */
export function BottomNav() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className="group flex h-(--bottom-nav-h) flex-col items-center justify-center gap-0.5 text-xs font-medium text-fg-muted focus-visible:-outline-offset-2 aria-[current=page]:text-fg forced-colors:aria-[current=page]:underline"
            >
              <span className="grid h-7 w-13 place-items-center rounded-full transition-colors group-aria-[current=page]:bg-accent-subtle group-aria-[current=page]:text-accent-soft">
                <Icon icon={item.icon} />
              </span>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
