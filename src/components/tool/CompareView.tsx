import { useState, type ReactNode, type Ref } from 'react'
import { SegmentedControl } from '../ui/SegmentedControl'

type View = 'result' | 'original'

const OPTIONS: ReadonlyArray<{ value: View; label: string }> = [
  { value: 'result', label: 'Como ficou' },
  { value: 'original', label: 'Original' },
]

interface CompareViewProps {
  /** O resultado (imagem ou vídeo), mostrado primeiro. */
  result: ReactNode
  original: ReactNode
  /** Muda a cada resultado novo: a vista volta para "Como ficou". */
  resultKey: string
  /** Para levar a pessoa até aqui (ex.: botão "Ver como ficou" no painel do resultado). */
  containerRef?: Ref<HTMLDivElement>
}

/**
 * Depois de processar: o resultado e, com um toque, o original, para a pessoa decidir se ficou bom
 * antes de baixar. Só o selecionado fica na página (um vídeo de cada vez, sem dois tocando).
 */
export function CompareView({ result, original, resultKey, containerRef }: CompareViewProps) {
  const [choice, setChoice] = useState<{ key: string; view: View }>()
  const view = choice?.key === resultKey ? choice.view : 'result'

  return (
    <div ref={containerRef} className="grid scroll-mt-20 gap-3">
      <SegmentedControl label="Mostrar" options={OPTIONS} value={view} onChange={(next) => setChoice({ key: resultKey, view: next })} />
      {view === 'result' ? result : original}
    </div>
  )
}
