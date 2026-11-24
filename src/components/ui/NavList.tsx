import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge } from './Badge'
import { cx } from './cx'
import { Icon } from './Icon'
import { ToolIcon, type ToolTone } from './ToolIcon'

export interface NavListItem {
  id: string
  title: string
  description: string
  icon: LucideIcon
  /** Sem destino, o item aparece como indisponível. */
  to?: string
  /** Ferramenta: o ícone ganha o ladrilho na cor do tipo de ferramenta. */
  tone?: ToolTone
}

interface NavListProps {
  items: readonly NavListItem[]
  columns?: 1 | 2
  unavailableLabel?: string
  className?: string
}

const ROW = 'grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 px-4 py-3'

function RowContent({ item, trailing }: { item: NavListItem; trailing: ReactNode }) {
  return (
    <>
      {item.tone ? <ToolIcon icon={item.icon} tone={item.tone} /> : <Icon icon={item.icon} className="text-fg-muted" />}
      <span className="grid min-w-0 gap-0.5">
        <span className="text-sm font-semibold text-fg">{item.title}</span>
        <span className="text-xs text-fg-subtle">{item.description}</span>
      </span>
      {trailing}
    </>
  )
}

/** Lista agrupada de destinos, com divisórias finas em vez de um cartão por item. */
export function NavList({ items, columns = 1, unavailableLabel = 'Em breve', className }: NavListProps) {
  const lastSpansBothColumns = columns === 2 && items.length % 2 === 1

  return (
    <ul
      className={cx(
        'grid gap-px overflow-hidden rounded-lg border border-border bg-border',
        columns === 2 && 'md:grid-cols-2',
        className,
      )}
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          className={cx('bg-surface', lastSpansBothColumns && index === items.length - 1 && 'md:col-span-2')}
        >
          {item.to ? (
            <Link
              to={item.to}
              className={cx(ROW, 'transition-colors hover:bg-surface-raised focus-visible:-outline-offset-2')}
            >
              <RowContent item={item} trailing={<Icon icon={ChevronRight} size="sm" className="text-fg-subtle" />} />
            </Link>
          ) : (
            <div className={ROW}>
              <RowContent item={item} trailing={<Badge>{unavailableLabel}</Badge>} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
