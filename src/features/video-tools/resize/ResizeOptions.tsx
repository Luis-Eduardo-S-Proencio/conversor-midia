import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import type { Dimensions } from '../../../core/image/resize'
import { formatDimensions } from '../../../core/format'
import { resolutionLabel, type Resolution, type ResolutionChoice } from '../../../core/video/resize'
import { Note } from '../shared/Note'
import { ONLY_DOWNSCALE } from './settings'
import type { ResizePlan } from './useResizeTool'

interface ResizeOptionsProps {
  choices: readonly ResolutionChoice[]
  plan: ResizePlan
  onResolutionChange: (resolution: Resolution) => void
  /** Medidas do vídeo como ele aparece. */
  current: Dimensions
  hasAudio: boolean
  extraTracks: boolean
  disabled?: boolean
}

/** Resolução final (só menores que a do vídeo), com as medidas de antes e de depois, e o que acontece com o vídeo. */
export function ResizeOptions({ choices, plan, onResolutionChange, current, hasAudio, extraTracks, disabled = false }: ResizeOptionsProps) {
  // O controle trabalha com texto; a resolução volta a ser número pela própria lista.
  const options = choices.map(({ resolution, available }) => ({ value: String(resolution), label: resolutionLabel(resolution), disabled: !available }))
  const select = (value: string) => {
    const choice = choices.find((item) => String(item.resolution) === value)
    if (choice) onResolutionChange(choice.resolution)
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <SegmentedControl label="Resolução" options={options} value={String(plan.resolution)} onChange={select} disabled={disabled} />
        <p className="text-xs text-fg-muted">{ONLY_DOWNSCALE}</p>
        <p className="text-xs text-fg-muted">A resolução vale para o lado menor: em pé, 720p fica com 720 de largura.</p>
      </div>

      <dl className="grid gap-2 border-t border-border pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Atual</dt>
          <dd className="tabular-nums text-fg">{formatDimensions(current.width, current.height)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Resolução final</dt>
          <dd className="tabular-nums text-fg">{formatDimensions(plan.size.width, plan.size.height)}</dd>
        </div>
      </dl>

      <Note>{`O vídeo é refeito em qualidade alta, nunca acima da do original, o que pode demorar em vídeos longos.${hasAudio ? ' O som é copiado, sem perder qualidade.' : ''}`}</Note>
      {extraTracks && <Note>Este vídeo tem mais de uma faixa de vídeo ou de áudio: o resultado fica só com a principal de cada.</Note>}
      <Note>O vídeo sai sem metadados, como localização e data da gravação.</Note>
    </div>
  )
}
