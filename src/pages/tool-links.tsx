import { ChevronRight } from 'lucide-react'
import type { ToolEntry } from '../app/tool-catalog'
import { toolTransitionName } from '../components/layout/tool-transition'
import { cx } from '../components/ui/cx'
import { Icon } from '../components/ui/Icon'
import { ToolIcon } from '../components/ui/ToolIcon'

/**
 * Conteúdo do cartão de ferramenta (tablet e computador): ícone, título de 15 px e uma linha de
 * descrição. Vai dentro de um link; sobe 2 px e clareia a borda com o mouse (o link é o `group`).
 */
export function ToolCardBody({ tool, className }: { tool: ToolEntry; className?: string }) {
  return (
    <span
      className={cx(
        'surface-card h-full items-center gap-3 rounded-lg p-4 transition-[translate,border-color] duration-(--dur-2) lg:p-5',
        'group-hover:pointer-fine:-translate-y-0.5 group-hover:pointer-fine:border-border-strong',
        className ?? 'flex',
      )}
    >
      <ToolIcon icon={tool.icon} tone={tool.tone} media={tool.media} transitionName={toolTransitionName(tool.id)} />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-label text-fg">{tool.title}</span>
        {/* Uma linha quando cabe; em larguras apertadas, quebra em duas em vez de cortar o texto. */}
        <span className="line-clamp-2 text-secondary text-fg-muted">{tool.description}</span>
      </span>
    </span>
  )
}

/**
 * Conteúdo da linha de lista do celular (72 px): ícone de 48 px, título de 15 px, descrição de
 * 14 px e a seta. O divisor recuado fica no item da lista (`TOOL_ROW_ITEM`).
 */
export function ToolRowBody({ tool, className }: { tool: ToolEntry; className?: string }) {
  return (
    <span className={cx('min-h-18 items-center gap-3 px-4 py-3 transition-colors duration-(--dur-1) group-active:bg-surface-2', className ?? 'flex')}>
      <ToolIcon icon={tool.icon} tone={tool.tone} size="list" media={tool.media} transitionName={toolTransitionName(tool.id)} />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-label text-fg">{tool.title}</span>
        <span className="text-secondary text-fg-muted">{tool.description}</span>
      </span>
      <Icon icon={ChevronRight} size="sm" className="text-fg-subtle" />
    </span>
  )
}

/** Item de lista com divisor recuado (começa depois do ícone), menos no último. */
export const TOOL_ROW_ITEM =
  'relative after:absolute after:right-0 after:bottom-0 after:left-19 after:h-px after:bg-border after:content-[""] last:after:hidden'
