import { Info, type LucideIcon } from 'lucide-react'
import { Icon } from '../../../components/ui/Icon'
import { cx } from '../../../components/ui/cx'

interface NoteProps {
  children: string
  icon?: LucideIcon
  /** Cor do texto e do ícone (token); o padrão é discreto. Avisos usam `text-warning`. */
  tone?: string
}

/** Observação curta no painel de opções (ex.: "O vídeo sai sem metadados"), com ícone. */
export function Note({ children, icon = Info, tone = 'text-fg-subtle' }: NoteProps) {
  return (
    <p className={cx('flex gap-2 text-xs', tone)}>
      <Icon icon={icon} size="sm" className="mt-px" />
      <span>{children}</span>
    </p>
  )
}
