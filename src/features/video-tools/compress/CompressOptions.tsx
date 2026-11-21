import { Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Icon } from '../../../components/ui/Icon'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { cx } from '../../../components/ui/cx'
import { describeSizeChange, formatBytes, formatDimensions } from '../../../core/format'
import { COMPRESSION_LEVELS, LEVEL_SETTINGS, type CompressionLevel } from '../../../core/video/compress'
import type { CompressionPlan } from './useCompressTool'

function Note({ children, icon = Info, tone = 'text-fg-subtle' }: { children: string; icon?: LucideIcon; tone?: string }) {
  return (
    <p className={cx('flex gap-2 text-xs', tone)}>
      <Icon icon={icon} size="sm" className="mt-px" />
      <span>{children}</span>
    </p>
  )
}

interface CompressOptionsProps {
  level: CompressionLevel
  onLevelChange: (level: CompressionLevel) => void
  plan: CompressionPlan
  originalBytes: number
  hasAudio: boolean
  extraTracks: boolean
  disabled?: boolean
}

/** Nível, e o que ele dá antes de começar: resolução final e tamanho estimado. */
export function CompressOptions({ level, onLevelChange, plan, originalBytes, hasAudio, extraTracks, disabled = false }: CompressOptionsProps) {
  const options = COMPRESSION_LEVELS.map((value) => ({ value, label: LEVEL_SETTINGS[value].label }))
  const { size, estimate } = plan
  const change = describeSizeChange(originalBytes, estimate.bytes)

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <SegmentedControl label="Nível" options={options} value={level} onChange={onLevelChange} disabled={disabled} />
        <p className="text-xs text-fg-muted">{LEVEL_SETTINGS[level].hint}</p>
      </div>

      <dl className="grid gap-2 border-t border-border pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Resolução final</dt>
          <dd className="font-mono tabular-nums text-fg">{formatDimensions(size.width, size.height)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Tamanho estimado</dt>
          <dd className="whitespace-nowrap font-mono tabular-nums text-fg">{`${formatBytes(estimate.bytes)} · ${change.value}`}</dd>
        </div>
      </dl>

      {!estimate.worthIt && (
        <Note icon={TriangleAlert} tone="text-warning">
          {level === 'strong'
            ? 'Este vídeo já está bem comprimido: deve diminuir pouco ou nada.'
            : 'Neste nível o vídeo quase não diminui: ele já está bem comprimido. Experimente um nível mais forte.'}
        </Note>
      )}
      <Note>{`O vídeo é refeito, o que pode demorar em vídeos longos.${hasAudio ? ' O som é copiado, sem perder qualidade.' : ''}`}</Note>
      <Note>O tamanho final é uma estimativa. Se o resultado não ficar menor, você recebe o original.</Note>
      {extraTracks && <Note>Este vídeo tem mais de uma faixa de vídeo ou de áudio: o resultado fica só com a principal de cada.</Note>}
      <Note>O vídeo sai sem metadados, como localização e data da gravação.</Note>
    </div>
  )
}
