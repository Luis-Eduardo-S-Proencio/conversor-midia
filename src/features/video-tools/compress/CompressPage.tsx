import { Minimize2 } from 'lucide-react'
import { Alert } from '../../../components/ui/Alert'
import { formatDimensions } from '../../../core/format'
import { codecLabel } from '../../../core/video/formats'
import { SourcePlayer } from '../shared/SourcePlayer'
import { VideoToolPage } from '../shared/VideoToolPage'
import { COMPRESS_LABELS } from './settings'
import { CompressOptions } from './CompressOptions'
import { useCompressTool } from './useCompressTool'

export function CompressPage() {
  const compress = useCompressTool()
  const { tool, plan, level } = compress
  const { state } = tool
  const { info } = state
  const busy = state.phase === 'processing'
  const blocker = !info
    ? undefined
    : !info.canTranscodeVideo
      ? `Comprimir refaz o vídeo, e este navegador não consegue refazer vídeos ${codecLabel(info.codec)}. Tente em outro navegador, como o Chrome, o Edge ou o Safari.`
      : !info.controlsSize
        ? 'Este navegador refaz o vídeo sem controlar o tamanho do arquivo, então comprimir não funcionaria aqui. Use o Chrome, o Edge ou o Safari.'
        : undefined

  return (
    <VideoToolPage
      title="Comprimir vídeo"
      description="Diminua o tamanho do vídeo para enviar ou guardar. MP4, MOV ou WEBM; o vídeo não sai do seu dispositivo."
      labels={COMPRESS_LABELS}
      actionIcon={Minimize2}
      tool={tool}
      canStart={Boolean(plan) && !blocker}
      onStart={compress.apply}
      preview={state.sourceUrl && <SourcePlayer key={state.fileId} src={state.sourceUrl} name={state.file?.name ?? ''} />}
      options={
        blocker ? (
          <Alert variant="error" title="Compressão indisponível neste navegador">
            {blocker}
          </Alert>
        ) : (
          plan &&
          info &&
          state.file && (
            <CompressOptions
              level={level}
              onLevelChange={compress.changeLevel}
              plan={plan}
              originalBytes={state.file.size}
              hasAudio={info.hasAudio}
              extraTracks={info.extraTracks}
              disabled={busy}
            />
          )
        )
      }
      resultDetails={
        plan &&
        !state.result?.note && (
          <dl className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-fg-muted">Resolução final</dt>
            <dd className="tabular-nums text-fg">{formatDimensions(plan.size.width, plan.size.height)}</dd>
          </dl>
        )
      }
    />
  )
}
