import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconButton } from '../ui/Button'
import { cx } from '../ui/cx'
import { useBack } from './useBack'
import { useScrolled } from './useScrolled'

interface TopAppBarProps {
  title: string
  /** Para onde o voltar leva quem abriu a tela por um link direto (o "pai" lógico). */
  backTo: string
  /** Ações opcionais à direita (ex.: trocar de ferramenta). */
  actions?: ReactNode
  className?: string
}

/**
 * Barra superior das telas internas (ferramentas, Sobre): voltar, título (o h1 da tela) e ações à
 * direita. Fixa no alto; ganha fundo translúcido e borda só depois que a página rola.
 */
export function TopAppBar({ title, backTo, actions, className }: TopAppBarProps) {
  const back = useBack(backTo)
  const scrolled = useScrolled()

  return (
    <header
      data-scrolled={scrolled || undefined}
      className={cx(
        'sticky top-0 z-20 border-b border-transparent pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-(--dur-2)',
        'data-scrolled:glass-header data-scrolled:border-border',
        className,
      )}
    >
      <div className="mx-auto flex h-(--header-h) w-full max-w-editor items-center gap-1 px-(--gutter)">
        {/* O ícone (20 px num botão de 44) alinha com a margem do conteúdo. */}
        <IconButton icon={ArrowLeft} label="Voltar" tooltipAlign="start" onClick={back} className="-ml-3" />
        <h1 className="min-w-0 flex-1 truncate pl-1 text-label font-semibold text-fg md:text-lg">{title}</h1>
        {actions && <div className="-mr-3 flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </header>
  )
}
