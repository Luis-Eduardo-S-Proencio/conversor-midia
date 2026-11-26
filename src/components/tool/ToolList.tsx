import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ToolEntry } from '../../app/tool-catalog'
import { TransitionLink } from '../layout/TransitionLink'
import { cx } from '../ui/cx'
import { Icon } from '../ui/Icon'
import { ToolIcon } from '../ui/ToolIcon'

interface ToolListProps {
  tools: readonly ToolEntry[]
  /** Nome da lista para o leitor de tela, quando não há um título ligado por `labelledBy`. */
  label?: string
  labelledBy?: string
  /** Endereço atual: a ferramenta dele fica marcada ("Aberta") e não recarrega ao ser tocada. */
  currentPath?: string
  /** Chamado antes de ir para a ferramenta (ex.: para levar os arquivos abertos junto). */
  onNavigate?: (tool: ToolEntry) => void
  /** A ferramenta toma o lugar da entrada atual no histórico (quando a lista está num painel). */
  replace?: boolean
  /** Selo ao lado do nome (ex.: "Recomendado"). */
  badgeFor?: (tool: ToolEntry) => ReactNode
  /** Dentro de um painel (fundo surface-1): o grupo fica um tom acima, como nos apps do sistema. */
  raised?: boolean
  className?: string
}

/**
 * Ferramentas numa lista agrupada, como as listas dos apps do sistema: ícone, nome, uma linha do que
 * faz e a seta. Divisores recuados (começam depois do ícone), menos no último item.
 */
export function ToolList({ tools, label, labelledBy, currentPath, onNavigate, replace = false, badgeFor, raised = false, className }: ToolListProps) {
  return (
    <ul
      aria-label={label}
      aria-labelledby={labelledBy}
      className={cx('overflow-hidden rounded-lg border border-border', raised ? 'bg-surface-2' : 'bg-surface-1', className)}
    >
      {tools.map((tool) => {
        const current = tool.to === currentPath
        return (
          <li
            key={tool.id}
            className="relative after:absolute after:right-0 after:bottom-0 after:left-16.5 after:h-px after:bg-border after:content-[''] last:after:hidden"
          >
            <TransitionLink
              to={tool.to}
              replace={replace}
              aria-current={current ? 'page' : undefined}
              onClick={(event) => {
                if (current) {
                  event.preventDefault()
                  return
                }
                onNavigate?.(tool)
              }}
              className={cx(
                'flex min-h-16 items-center gap-3.5 px-4 py-3 transition-colors duration-(--dur-1) focus-visible:-outline-offset-2',
                raised ? 'hover:pointer-fine:bg-surface-3 active:bg-surface-hover' : 'hover:pointer-fine:bg-surface-2 active:bg-surface-3',
              )}
            >
              <ToolIcon icon={tool.icon} raised={raised} />
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label text-fg">
                  {tool.title}
                  {badgeFor?.(tool)}
                </span>
                <span className="text-secondary text-fg-muted">{tool.description}</span>
              </span>
              {current ? (
                <span className="shrink-0 text-caption text-fg-subtle">Aberta</span>
              ) : (
                <Icon icon={ChevronRight} size="sm" className="text-fg-subtle" />
              )}
            </TransitionLink>
          </li>
        )
      })}
    </ul>
  )
}
