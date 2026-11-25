import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: ReactNode
  /** Ação que resolve o vazio (ex.: "Abrir vídeo"). */
  action?: ReactNode
  className?: string
}

/** Tela ou área vazia: diz o que fazer, não lamenta. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx('grid justify-items-center gap-3 px-4 py-8 text-center', className)}>
      <span aria-hidden="true" className="grid size-12 place-items-center rounded-lg bg-surface-3 text-fg-muted">
        <Icon icon={icon} size="lg" />
      </span>
      <div className="grid max-w-sm gap-1">
        <p className="text-section text-fg">{title}</p>
        {description && <p className="text-secondary text-fg-muted">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
