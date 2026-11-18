import { CircleCheck } from 'lucide-react'
import { useId, type RefObject } from 'react'
import { ResultSummary } from '../../../components/tool/ResultSummary'
import { Icon } from '../../../components/ui/Icon'
import type { ConvertItem } from './convert-state'

interface ConvertResultProps {
  items: readonly ConvertItem[]
  headingRef: RefObject<HTMLHeadingElement | null>
}

/** Resumo depois da conversão: quantas deram certo e a variação total de tamanho. */
export function ConvertResult({ items, headingRef }: ConvertResultProps) {
  const headingId = useId()
  const done = items.filter((item) => item.status === 'done' && item.output)
  const failed = items.filter((item) => item.status === 'failed').length
  const before = done.reduce((total, item) => total + item.size, 0)
  const after = done.reduce((total, item) => total + (item.output?.size ?? 0), 0)

  return (
    <div className="grid gap-4">
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Icon icon={CircleCheck} className="text-success" />
        {done.length === 1 ? 'Imagem convertida' : `${done.length} imagens convertidas`}
      </h2>
      {failed > 0 && (
        <p className="text-sm text-danger">
          {failed === 1 ? '1 arquivo não pôde ser convertido.' : `${failed} arquivos não puderam ser convertidos.`}
        </p>
      )}
      {before > 0 && <ResultSummary beforeBytes={before} afterBytes={after} />}
    </div>
  )
}
