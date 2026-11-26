import { TriangleAlert } from 'lucide-react'
import { useId } from 'react'
import { SIZE_DESTINATIONS, SIZE_DESTINATION_IDS, type SizeDestinationId } from '../../../app/destinations'
import { Button } from '../../../components/ui/Button'
import { Chip } from '../../../components/ui/Chip'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { describeSizeChange, formatBytes, formatDimensions } from '../../../core/format'
import { COMPRESSION_LEVELS, LEVEL_SETTINGS, type CompressionLevel } from '../../../core/video/compress'
import { Note } from '../shared/Note'
import type { CompressionPlan } from './useCompressTool'

interface CompressOptionsProps {
  level: CompressionLevel
  onLevelChange: (level: CompressionLevel) => void
  destination: SizeDestinationId | undefined
  onDestinationChange: (destination: SizeDestinationId | undefined) => void
  plan: CompressionPlan
  originalBytes: number
  hasAudio: boolean
  extraTracks: boolean
  disabled?: boolean
}

/**
 * Nível ou destino com limite (WhatsApp, e-mail, Discord), e o que isso dá antes de começar:
 * resolução final e tamanho estimado.
 */
export function CompressOptions({
  level,
  onLevelChange,
  destination,
  onDestinationChange,
  plan,
  originalBytes,
  hasAudio,
  extraTracks,
  disabled = false,
}: CompressOptionsProps) {
  const options = COMPRESSION_LEVELS.map((value) => ({ value, label: LEVEL_SETTINGS[value].label }))
  const destinationsId = useId()
  const { size, estimate } = plan
  const change = describeSizeChange(originalBytes, estimate.bytes)
  const target = destination ? SIZE_DESTINATIONS[destination] : undefined

  return (
    <div className="grid gap-6">
      {target ? (
        <div className="grid gap-2 rounded-md border border-accent/35 bg-accent-soft p-3">
          <p className="text-sm font-semibold text-fg">{`Ajustado para ${target.label}`}</p>
          <p className="text-secondary text-fg-muted">{target.summary}</p>
          <Button size="sm" variant="ghost" onClick={() => onDestinationChange(undefined)} disabled={disabled} className="-ml-2 justify-self-start">
            Escolher um nível
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          <SegmentedControl label="Nível" options={options} value={level} onChange={onLevelChange} disabled={disabled} />
          <p className="text-xs text-fg-muted">{LEVEL_SETTINGS[level].hint}</p>
        </div>
      )}

      {!target && (
        <div className="grid gap-2">
          <p id={destinationsId} className="text-sm font-medium text-fg">
            Ou ajuste para enviar por
          </p>
          <div role="group" aria-labelledby={destinationsId} className="flex flex-wrap gap-2">
            {SIZE_DESTINATION_IDS.map((id) => (
              <Chip key={id} onClick={() => onDestinationChange(id)} disabled={disabled}>
                {SIZE_DESTINATIONS[id].label}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <dl className="grid gap-2 border-t border-border pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Resolução final</dt>
          <dd className="tabular-nums text-fg">{formatDimensions(size.width, size.height)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Tamanho estimado</dt>
          <dd className="whitespace-nowrap tabular-nums text-fg">{`${formatBytes(estimate.bytes)} · ${change.value}`}</dd>
        </div>
        {target && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-fg-muted">Limite</dt>
            <dd className="tabular-nums text-fg">{formatBytes(target.maxBytes)}</dd>
          </div>
        )}
      </dl>

      {target && !plan.fits && (
        <Note icon={TriangleAlert} tone="text-warning">
          {`O vídeo é longo demais para caber em ${formatBytes(target.maxBytes)} com imagem que dê para ver. Corte um trecho no Editar vídeo e comprima depois.`}
        </Note>
      )}
      {!target && !estimate.worthIt && (
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
