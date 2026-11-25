import { cx } from './cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  iconOnly?: boolean
  className?: string
}

/*
 * Desligado: opacidade .4, sem sombra e cursor de proibido, para nunca parecer ativo.
 * (Sem pointer-events: none, senão o cursor não aparece; o botão desligado já ignora cliques.)
 */
const BASE =
  'relative inline-flex items-center justify-center gap-2 rounded-md border font-semibold whitespace-nowrap select-none pressable ' +
  'disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ' +
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:shadow-none'

const VARIANTS: Record<ButtonVariant, string> = {
  // Acento sólido com texto branco: o degradê fica só no logo.
  primary:
    'border-transparent bg-accent-solid text-on-accent shadow-1 ' +
    'not-disabled:hover:bg-accent-solid-hover not-disabled:active:bg-accent-solid-active',
  secondary: 'border-border-strong bg-surface-3 text-fg shadow-1 not-disabled:hover:bg-surface-hover',
  ghost: 'border-transparent bg-transparent text-fg-muted not-disabled:hover:bg-surface-2 not-disabled:hover:text-fg',
  danger: 'border-transparent bg-transparent text-danger not-disabled:hover:bg-danger-subtle',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-13 px-5 text-base',
}

const ICON_ONLY_SIZES: Record<ButtonSize, string> = {
  sm: 'size-9',
  md: 'size-11',
  lg: 'size-13',
}

/** Classes de botão, também usadas para links com aparência de botão. */
export function buttonClasses({
  variant = 'secondary',
  size = 'md',
  block = false,
  iconOnly = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cx(BASE, VARIANTS[variant], iconOnly ? ICON_ONLY_SIZES[size] : SIZES[size], block && 'w-full', className)
}
