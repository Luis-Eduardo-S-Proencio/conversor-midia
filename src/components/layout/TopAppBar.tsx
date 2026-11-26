import { ArrowLeft, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { MEDIA_PARENTS } from '../../app/tool-catalog'
import type { MediaKind } from '../../core/media-kind'
import { IconButton } from '../ui/Button'
import { cx } from '../ui/cx'
import { ToolIcon, type ToolTone } from '../ui/ToolIcon'
import { toolTransitionName } from './tool-transition'
import { TransitionLink } from './TransitionLink'
import { useBack } from './useBack'
import { useScrolled } from './useScrolled'

export interface TopAppBarTool {
  id: string
  icon: LucideIcon
  tone: ToolTone
  media: MediaKind
}

interface TopAppBarProps {
  title: string
  /** Para onde o voltar leva quem abriu a tela por um link direto (o "pai" lógico). */
  backTo: string
  /** Trilha no computador ("Vídeos / Comprimir vídeo"): o pai, como link. */
  parent?: { to: string; label: string }
  /** Ferramenta da tela: o ícone ao lado do título (o mesmo do cartão, que "voa" até aqui). */
  tool?: TopAppBarTool
  /** Ação opcional à direita. */
  actions?: ReactNode
  className?: string
}

/**
 * Barra superior das telas internas (Sobre, ferramentas): voltar, título (o h1 da tela) e ação
 * opcional. Fixa no alto ao rolar; ganha fundo com desfoque e borda só depois que a página rola.
 * No computador, o título vem precedido da trilha.
 */
export function TopAppBar({ title, backTo, parent, tool, actions, className }: TopAppBarProps) {
  const back = useBack(backTo)
  const scrolled = useScrolled()
  const trail = parent ?? (tool ? MEDIA_PARENTS[tool.media] : undefined)

  return (
    <header
      data-scrolled={scrolled || undefined}
      className={cx(
        'sticky top-0 z-10 border-b border-transparent pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-(--dur-2)',
        'data-scrolled:glass-header data-scrolled:border-border',
        className,
      )}
    >
      <div className="mx-auto flex h-(--header-h) w-full max-w-[calc(var(--container-page)+2*var(--gutter))] items-center gap-2 px-2 md:px-[calc(var(--gutter)-0.5rem)]">
        <IconButton icon={ArrowLeft} label="Voltar" onClick={back} />
        {tool && (
          <ToolIcon icon={tool.icon} tone={tool.tone} size="sm" transitionName={toolTransitionName(tool.id)} className="ml-0.5" />
        )}
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5 pl-1">
          {trail && (
            <>
              <TransitionLink
                to={trail.to}
                direction="back"
                className="hidden shrink-0 text-base font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline lg:inline"
              >
                {trail.label}
              </TransitionLink>
              <span aria-hidden="true" className="hidden text-fg-subtle lg:inline">
                /
              </span>
            </>
          )}
          <h1 className="truncate font-sans text-base font-semibold text-fg">{title}</h1>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </header>
  )
}
