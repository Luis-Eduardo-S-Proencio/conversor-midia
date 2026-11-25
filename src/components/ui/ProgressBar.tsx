import { useId } from 'react'
import { cx } from './cx'

interface ProgressBarProps {
  label: string
  /** De 0 a 100. Sem valor, a barra fica indeterminada. */
  value?: number
  hideLabel?: boolean
  className?: string
}

export function ProgressBar({ label, value, hideLabel = false, className }: ProgressBarProps) {
  const labelId = useId()
  const determinate = value !== undefined
  const clamped = determinate ? Math.min(100, Math.max(0, value)) : 0
  const percent = Math.round(clamped)

  return (
    <div className={cx('grid gap-1.5', className)}>
      {!hideLabel && (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span id={labelId} className="text-fg-muted">
            {label}
          </span>
          {determinate && <span className="text-xs tabular-nums text-fg-muted">{percent}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-labelledby={hideLabel ? undefined : labelId}
        aria-label={hideLabel ? label : undefined}
        aria-valuemin={determinate ? 0 : undefined}
        aria-valuemax={determinate ? 100 : undefined}
        aria-valuenow={determinate ? percent : undefined}
        className="h-1.5 overflow-hidden rounded-full bg-surface-hover"
      >
        {/* Desloca a barra (transform) em vez de mudar a largura: não força recálculo de layout. */}
        <div
          className={cx(
            'h-full rounded-full bg-accent',
            determinate ? 'w-full transition-transform duration-(--dur-3) ease-out' : 'w-1/3 animate-indeterminate',
          )}
          style={determinate ? { transform: `translateX(${clamped - 100}%)` } : undefined}
        />
      </div>
    </div>
  )
}
