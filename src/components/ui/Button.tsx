import { LoaderCircle, type LucideIcon } from 'lucide-react'
import type { ComponentProps, MouseEvent } from 'react'
import { buttonClasses, type ButtonStyleOptions } from './button-classes'
import { cx } from './cx'
import { Icon } from './Icon'

interface ButtonProps extends ComponentProps<'button'>, Omit<ButtonStyleOptions, 'iconOnly'> {
  icon?: LucideIcon
  /** Mantém o botão focável e anuncia "ocupado", mas ignora cliques. */
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  block,
  icon,
  loading = false,
  className,
  type = 'button',
  onClick,
  children,
  ...rest
}: ButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (loading) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  // Carregando: o spinner ocupa o lugar do ícone. Sem ícone, ele fica por cima do texto
  // (que só fica invisível), para o botão não mudar de largura.
  const spinnerOverText = loading && !icon
  return (
    <button
      {...rest}
      type={type}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={handleClick}
      className={buttonClasses({ variant, size, block, className })}
    >
      {loading && icon && <Icon icon={LoaderCircle} className="animate-spin" />}
      {!loading && icon && <Icon icon={icon} />}
      {spinnerOverText ? (
        <>
          {/* opacity (não visibility): o texto continua sendo o nome do botão para o leitor de tela */}
          <span className="opacity-0">{children}</span>
          <span className="absolute inset-0 grid place-items-center">
            <Icon icon={LoaderCircle} className="animate-spin" />
          </span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children' | 'aria-label'> {
  icon: LucideIcon
  /** Nome acessível e dica visual: o botão não tem texto. */
  label: string
  /** Atalho de teclado mostrado na dica (ex.: "S"); só informativo. */
  shortcut?: string
  variant?: ButtonStyleOptions['variant']
  /** sm = 36 px (só com mouse), md = 44 px. */
  size?: ButtonStyleOptions['size']
  /** Alinhamento da dica com o botão: nas bordas da tela, `start` ou `end` evitam que ela saia da página. */
  tooltipAlign?: 'start' | 'center' | 'end'
}

const TOOLTIP_ALIGN = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
} as const

/**
 * Botão só com ícone. Com mouse, a dica aparece ao passar o ponteiro ou ao focar pelo teclado;
 * o nome acessível vem de `label` (aria-label), então a dica é só visual.
 */
export function IconButton({
  icon,
  label,
  shortcut,
  variant = 'ghost',
  size = 'md',
  tooltipAlign = 'center',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      aria-keyshortcuts={shortcut}
      className={buttonClasses({
        variant,
        size,
        iconOnly: true,
        className: cx(
          'group/tip aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent',
          // Com toque, nunca abaixo de 44 px.
          size === 'sm' && 'pointer-coarse:size-11',
          className,
        ),
      })}
    >
      <Icon icon={icon} />
      <span
        aria-hidden="true"
        className={cx(
          // Fora da tela até aparecer (display: none): invisível, mas existindo, ela alargaria a página perto das bordas.
          'pointer-events-none absolute top-full z-40 mt-2 hidden items-center gap-1.5 rounded-sm border border-border-strong',
          TOOLTIP_ALIGN[tooltipAlign],
          'bg-surface-3 px-2 py-1 text-caption font-medium whitespace-nowrap text-fg shadow-2',
          'pointer-fine:group-hover/tip:flex pointer-fine:group-focus-visible/tip:flex tooltip-in',
        )}
      >
        {label}
        {shortcut && <kbd className="rounded-sm bg-surface-hover px-1 font-sans text-xs text-fg-muted">{shortcut}</kbd>}
      </span>
    </button>
  )
}
