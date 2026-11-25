import { useId, type ComponentProps } from 'react'
import { cx } from './cx'

interface InputProps extends ComponentProps<'input'> {
  /** Unidade exibida dentro do campo e anunciada como descrição, como "px". */
  unit?: string
}

// Texto de 16 px: abaixo disso o Safari do iPhone dá zoom ao focar o campo.
export function Input({ unit, className, 'aria-describedby': describedBy, ...rest }: InputProps) {
  const unitId = useId()
  const descriptions = [describedBy, unit ? unitId : undefined].filter(Boolean).join(' ') || undefined

  return (
    <div className="relative">
      <input
        {...rest}
        aria-describedby={descriptions}
        className={cx(
          'h-10 w-full rounded-md border border-stroke bg-bg px-3 text-base text-fg tabular-nums',
          'placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger pointer-coarse:h-11',
          unit && 'pr-10',
          className,
        )}
      />
      {unit && (
        <span id={unitId} className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-sm text-fg-subtle">
          {unit}
        </span>
      )}
    </div>
  )
}
