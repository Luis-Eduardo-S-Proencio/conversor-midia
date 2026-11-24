import { ShieldCheck } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { LogoMark } from '../brand/Logo'
import { cx } from '../ui/cx'
import { Icon } from '../ui/Icon'
import { NAV_ITEMS } from './nav-items'

interface SideNavProps {
  /** Telas de editor: a barra fica estreita em qualquer largura, para sobrar espaço para a foto ou o vídeo. */
  compact: boolean
}

/**
 * Navegação a partir de 768 px: barra fixa à esquerda. Estreita (ícone com rótulo curto embaixo)
 * até 1024 px e nos editores; larga, com o nome ao lado do ícone, nas demais telas.
 * No celular ela some e a navegação fica na barra inferior. É o cabeçalho do site (marca e menu),
 * só que à esquerda: no celular o cabeçalho é o `MobileHeader`, e só um dos dois aparece por vez.
 */
export function SideNav({ compact }: SideNavProps) {
  const wide = !compact
  return (
    <header
      className={cx(
        'sticky top-0 hidden h-dvh shrink-0 flex-col gap-6 border-r border-border bg-surface pt-5 pb-4 pl-[env(safe-area-inset-left)] md:flex',
        wide ? 'w-20 lg:w-60' : 'w-20',
      )}
    >
      <Link
        to="/"
        className={cx(
          'mx-auto flex h-11 items-center gap-2.5 rounded-md px-1 text-lg font-bold tracking-tight text-fg',
          wide && 'lg:mx-4 lg:px-2',
        )}
      >
        <LogoMark className="size-8" />
        <span className={wide ? 'sr-only lg:not-sr-only' : 'sr-only'}>
          Media <span className="font-medium text-fg-muted">Tools</span>
        </span>
      </Link>

      <nav aria-label="Principal">
        <ul className={cx('grid gap-1 px-2', wide && 'lg:px-3')}>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={cx(
                  'group flex h-16 flex-col items-center justify-center gap-1 rounded-md text-xs font-medium text-fg-muted transition-colors',
                  'hover:bg-surface-raised hover:text-fg aria-[current=page]:bg-surface-raised aria-[current=page]:text-fg',
                  'forced-colors:aria-[current=page]:underline forced-colors:aria-[current=page]:underline-offset-4',
                  wide && 'lg:h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm',
                )}
              >
                <Icon icon={item.icon} className="group-aria-[current=page]:text-accent" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {wide && (
        <p className="mx-3 mt-auto hidden gap-2.5 rounded-lg border border-success/25 bg-success/10 p-3 text-xs text-fg-muted lg:flex">
          <Icon icon={ShieldCheck} size="sm" className="mt-px text-success" />
          <span>Seus arquivos não saem do seu aparelho.</span>
        </p>
      )}
    </header>
  )
}
