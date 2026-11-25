import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

/** Pílula de 36 px; selecionada, fica com o fundo suave e o texto no acento. */
export const CHIP_CLASSES =
  'pressable relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap ' +
  'border-border-strong bg-surface-2 text-fg-muted hover:pointer-fine:text-fg ' +
  'aria-pressed:border-transparent aria-pressed:bg-accent-soft aria-pressed:text-accent ' +
  'aria-[current=page]:border-transparent aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent ' +
  'disabled:cursor-not-allowed disabled:opacity-40 forced-colors:aria-pressed:underline ' +
  // Com toque, a área clicável cresce para 44 px de altura sem mudar o desenho.
  'pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1 pointer-coarse:after:content-[""]'

interface ChipProps extends Omit<ComponentProps<'button'>, 'aria-pressed'> {
  icon?: LucideIcon
  /** Chip de alternância (filtro, opção): anuncia "pressionado". Sem isso, é um botão comum. */
  selected?: boolean
}

export function Chip({ icon, selected, className, type = 'button', children, ...rest }: ChipProps) {
  return (
    <button {...rest} type={type} aria-pressed={selected} className={cx(CHIP_CLASSES, className)}>
      {icon && <Icon icon={icon} size="sm" />}
      {children}
    </button>
  )
}
