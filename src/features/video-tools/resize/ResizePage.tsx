import { Scaling } from 'lucide-react'
import { Alert } from '../../../components/ui/Alert'
import { formatDimensions } from '../../../core/format'
import { codecLabel } from '../../../core/video/formats'
import { SourcePlayer } from '../shared/SourcePlayer'
import { VideoToolPage } from '../shared/VideoToolPage'
import { ResizeOptions } from './ResizeOptions'
import { RESIZE_LABELS } from './settings'
import { useResizeTool } from './useResizeTool'

export function ResizePage() {
  const resize = useResizeTool()
  const { tool, choices, plan } = resize
  const { state } = tool
  const { info } = state
  const busy = state.phase === 'processing'

  const blocker = !info
    ? undefined
    : !info.canTranscodeVideo
      ? {
          title: 'Mudança de resolução indisponível neste navegador',
          text: `Mudar a resolução refaz o vídeo, e este navegador não consegue refazer vídeos ${codecLabel(info.codec)}. Tente em outro navegador, como o Chrome, o Edge ou o Safari.`,
        }
      : !plan
        ? {
            title: 'Este vídeo já tem resolução baixa',
            text: `Ele tem ${formatDimensions(info.width, info.height)}, e a menor resolução oferecida é 360p. Só dá para diminuir a resolução: aumentar não melhora a qualidade do vídeo.`,
          }
        : undefined

  return (
    <VideoToolPage
      title="Mudar resolução"
      description="Diminua a resolução do vídeo para 1080p, 720p, 480p ou 360p. MP4, MOV ou WEBM; o vídeo não sai do seu dispositivo."
      labels={RESIZE_LABELS}
      actionIcon={Scaling}
      tool={tool}
      canStart={Boolean(plan) && !blocker}
      onStart={resize.apply}
      preview={state.sourceUrl && <SourcePlayer key={state.fileId} src={state.sourceUrl} name={state.file?.name ?? ''} />}
      options={
        blocker ? (
          <Alert variant="error" title={blocker.title}>
            {blocker.text}
          </Alert>
        ) : (
          plan &&
          info && (
            <ResizeOptions
              choices={choices}
              plan={plan}
              onResolutionChange={resize.changeResolution}
              current={info}
              hasAudio={info.hasAudio}
              extraTracks={info.extraTracks}
              disabled={busy}
            />
          )
        )
      }
      resultDetails={
        plan && (
          <dl className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-fg-muted">Resolução final</dt>
            <dd className="tabular-nums text-fg">{formatDimensions(plan.size.width, plan.size.height)}</dd>
          </dl>
        )
      }
    />
  )
}
