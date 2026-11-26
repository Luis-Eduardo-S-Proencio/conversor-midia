import { ArrowRight } from 'lucide-react'
import { describeSizeChange, formatBytes } from '../../core/format'
import { cx } from '../ui/cx'
import { Icon } from '../ui/Icon'

interface ResultSummaryProps {
  /** Maior que zero: arquivos vazios devem ser rejeitados na validação, antes de processar. */
  beforeBytes: number
  afterBytes: number
  className?: string
}

/**
 * Antes, depois e a variação ("2,6 MB → 1,1 MB · −58%"), com uma barra que encolhe do tamanho original
 * até o novo ao aparecer (sem animação com "reduzir movimento").
 */
export function ResultSummary({ beforeBytes, afterBytes, className }: ResultSummaryProps) {
  const change = describeSizeChange(beforeBytes, afterBytes)
  const ratio = Math.min(1, afterBytes / beforeBytes)
  const smaller = change.kind === 'smaller'

  return (
    <div className={cx('grid gap-3', className)}>
      <dl className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <div className="flex items-baseline gap-1.5">
          <dt className="sr-only">Antes</dt>
          <dd className="text-body font-medium text-fg-muted tabular-nums">{formatBytes(beforeBytes)}</dd>
        </div>
        <Icon icon={ArrowRight} size="sm" className="self-center text-fg-subtle" />
        <div className="flex items-baseline gap-1.5">
          <dt className="sr-only">Depois</dt>
          <dd className="text-section font-semibold text-fg tabular-nums">{formatBytes(afterBytes)}</dd>
        </div>
        <div className="ml-auto flex items-baseline gap-1.5">
          <dt className="sr-only">{change.label}</dt>
          <dd className={cx('text-label tabular-nums', smaller ? 'text-success' : 'text-fg-muted')}>{change.value}</dd>
        </div>
      </dl>
      {/* A barra cheia é o original; a parte colorida, o resultado. Só visual: os números já dizem tudo. */}
      <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-hover">
        <div
          className={cx('savings-bar h-full w-full origin-left rounded-full', smaller ? 'bg-success' : 'bg-fg-subtle')}
          style={{ scale: `${ratio} 1` }}
        />
      </div>
    </div>
  )
}
