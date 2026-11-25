import { cx } from './cx'

interface ProgressRingProps {
  label: string
  /** De 0 a 100. Sem valor, o anel gira (tempo desconhecido). */
  value?: number
  /** Diâmetro em px. */
  size?: number
  /** Mostra a porcentagem no centro. */
  showValue?: boolean
  className?: string
}

const STROKE = 4

/** Progresso circular, para a exportação e telas de espera em destaque. */
export function ProgressRing({ label, value, size = 72, showValue = true, className }: ProgressRingProps) {
  const determinate = value !== undefined
  const percent = determinate ? Math.round(Math.min(100, Math.max(0, value))) : 0
  const radius = (size - STROKE) / 2
  const circumference = 2 * Math.PI * radius
  const offset = determinate ? circumference * (1 - percent / 100) : circumference * 0.72

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={determinate ? percent : undefined}
      className={cx('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={cx('-rotate-90', !determinate && 'animate-spin')}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={STROKE} className="stroke-surface-hover" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-accent transition-[stroke-dashoffset] duration-(--dur-3) ease-out"
        />
      </svg>
      {determinate && showValue && (
        <span aria-hidden="true" className="absolute text-caption font-semibold text-fg tabular-nums">
          {percent}%
        </span>
      )}
    </div>
  )
}
