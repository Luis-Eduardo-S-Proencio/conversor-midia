import { Link, NavLink } from 'react-router'
import { Logo } from '../brand/Logo'
import { Container } from './Container'
import { NAV_ITEMS } from './nav-items'

/** Cabeçalho fixo. O menu aparece a partir de 768 px; abaixo disso a navegação fica na barra inferior. */
export function TopNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg pt-[env(safe-area-inset-top)]">
      <Container className="flex h-13 items-center gap-6 md:h-14">
        <Link to="/" className="-mx-1 flex h-11 items-center rounded-md px-1">
          <Logo />
        </Link>
        <nav aria-label="Principal" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className="relative block rounded-md px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg aria-[current=page]:text-fg after:pointer-events-none after:absolute after:inset-x-3 after:-bottom-2.5 after:h-0.5 after:rounded-full aria-[current=page]:after:bg-accent forced-colors:aria-[current=page]:underline forced-colors:aria-[current=page]:underline-offset-4"
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </header>
  )
}
