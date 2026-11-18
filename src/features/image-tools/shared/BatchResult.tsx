import { CircleCheck } from 'lucide-react'
import type { RefObject } from 'react'
import { ResultSummary } from '../../../components/tool/ResultSummary'
import { Icon } from '../../../components/ui/Icon'
import type { BatchItem } from './batch-state'
import type { BatchLabels } from './constants'

interface BatchResultProps {
  items: readonly BatchItem[]
  labels: BatchLabels
  headingRef: RefObject<HTMLHeadingElement | null>
}

/** Resumo depois do processamento: quantas deram certo e a variação total de tamanho. */
export function BatchResult({ items, labels, headingRef }: BatchResultProps) {
  const done = items.filter((item) => item.status === 'done' && item.output)
  const failed = items.filter((item) => item.status === 'failed').length
  const before = done.reduce((total, item) => total + item.size, 0)
  const after = done.reduce((total, item) => total + (item.output?.size ?? 0), 0)

  return (
    <div className="grid gap-4">
      <h2 ref={headingRef} tabIndex={-1} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Icon icon={CircleCheck} className="text-success" />
        {done.length === 1 ? `Imagem ${labels.done}` : `${done.length} imagens ${labels.done}s`}
      </h2>
      {failed > 0 && (
        <p className="text-sm text-danger">
          {failed === 1 ? '1 arquivo não pôde ser processado.' : `${failed} arquivos não puderam ser processados.`}
        </p>
      )}
      {before > 0 && <ResultSummary beforeBytes={before} afterBytes={after} />}
    </div>
  )
}
