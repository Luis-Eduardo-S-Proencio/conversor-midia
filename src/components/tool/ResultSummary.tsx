import { describeSizeChange, formatBytes } from '../../core/format'
import { cx } from '../ui/cx'

interface ResultSummaryProps {
  /** Maior que zero: arquivos vazios devem ser rejeitados na validação, antes de processar. */
  beforeBytes: number
  afterBytes: number
  className?: string
}

/** Antes, depois e variação de tamanho do resultado. */
export function ResultSummary({ beforeBytes, afterBytes, className }: ResultSummaryProps) {
  const change = describeSizeChange(beforeBytes, afterBytes)
  const items = [
    { label: 'Antes', value: formatBytes(beforeBytes), tone: 'text-fg' },
    { label: 'Depois', value: formatBytes(afterBytes), tone: 'text-fg' },
    { label: change.label, value: change.value, tone: change.kind === 'smaller' ? 'text-success' : 'text-fg-muted' },
  ]

  return (
    <dl className={cx('grid grid-cols-3 gap-3', className)}>
      {items.map((item) => (
        <div key={item.label} className="grid gap-0.5">
          <dt className="text-xs text-fg-subtle">{item.label}</dt>
          <dd className={cx('font-mono text-base font-medium tabular-nums', item.tone)}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
