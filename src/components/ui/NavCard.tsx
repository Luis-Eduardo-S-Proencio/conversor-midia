import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from './Icon'

interface NavCardProps {
  to: string
  icon: LucideIcon
  title: string
  description: string
  /** Informação técnica curta, como os formatos aceitos. */
  meta?: ReactNode
  badge?: ReactNode
}

/** Destino de destaque, como as categorias da página inicial. */
export function NavCard({ to, icon, title, description, meta, badge }: NavCardProps) {
  return (
    <Link
      to={to}
      className="group grid grid-cols-[2.5rem_minmax(0,1fr)_1.25rem] items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong md:p-5"
    >
      <span className="grid size-10 place-items-center rounded-md bg-surface-raised text-fg">
        <Icon icon={icon} />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-semibold text-fg">
          {title}
          {badge}
        </span>
        <span className="text-sm text-fg-muted">{description}</span>
        {meta && <span className="mt-1 font-mono text-xs text-fg-subtle">{meta}</span>}
      </span>
      <Icon icon={ChevronRight} className="text-fg-subtle transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
