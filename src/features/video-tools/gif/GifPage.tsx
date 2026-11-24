import { ImagePlay } from 'lucide-react'
import { Alert } from '../../../components/ui/Alert'
import { formatBytes, formatDimensions } from '../../../core/format'
import { codecLabel } from '../../../core/video/formats'
import { formatTime } from '../../../core/video/time'
import { TrimPreview } from '../shared/TrimPreview'
import { VideoToolPage } from '../shared/VideoToolPage'
import { GifOptions } from './GifOptions'
import { GIF_LABELS } from './settings'
import { useGifTool } from './useGifTool'

export function GifPage() {
  const gif = useGifTool()
  const { tool, plan } = gif
  const { state } = tool
  const { info } = state
  const busy = state.phase === 'processing'

  const blocked = info && !info.canDecodeVideo
  return (
    <VideoToolPage
      title="Criar GIF"
      description="Transforme um trecho de até 15 segundos do vídeo em GIF animado. MP4, MOV ou WEBM; o vídeo não sai do seu dispositivo."
      labels={GIF_LABELS}
      actionIcon={ImagePlay}
      tool={tool}
      canStart={Boolean(plan) && !blocked}
      onStart={gif.apply}
      preview={
        state.sourceUrl &&
        info &&
        plan && (
          <TrimPreview
            key={state.fileId}
            src={state.sourceUrl}
            name={state.file?.name ?? ''}
            duration={info.duration}
            kept={plan.range ? [plan.range] : []}
            target="o trecho do GIF"
            timelineLegend="Em azul, o que vira GIF"
            onMark={gif.mark}
            disabled={busy}
          />
        )
      }
      options={
        blocked ? (
          <Alert variant="error" title="Criar GIF indisponível neste navegador">
            {`Para criar o GIF, o vídeo precisa ser lido quadro a quadro, e este navegador não lê vídeos ${codecLabel(info.codec)}. Tente em outro navegador, como o Chrome, o Edge ou o Safari.`}
          </Alert>
        ) : (
          plan && (
            <GifOptions
              plan={plan}
              onFieldChange={gif.changeField}
              onSizeChange={gif.changeSize}
              onFpsChange={gif.changeFps}
              focusRequest={gif.focusRequest}
              disabled={busy}
            />
          )
        )
      }
      resultDetails={
        plan &&
        state.result && (
          <dl className="grid gap-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-fg-muted">Tamanho</dt>
              <dd className="font-mono tabular-nums text-fg">{formatBytes(state.result.size)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-fg-muted">Medidas</dt>
              <dd className="font-mono tabular-nums text-fg">{formatDimensions(plan.dimensions.width, plan.dimensions.height)}</dd>
            </div>
            {plan.range && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-fg-muted">Duração</dt>
                <dd className="font-mono tabular-nums text-fg">{formatTime(plan.range.end - plan.range.start)}</dd>
              </div>
            )}
          </dl>
        )
      }
    />
  )
}
