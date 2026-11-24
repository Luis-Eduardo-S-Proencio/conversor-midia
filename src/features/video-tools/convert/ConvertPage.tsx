import { ArrowLeftRight } from 'lucide-react'
import { Alert } from '../../../components/ui/Alert'
import { VIDEO_FORMATS } from '../../../core/video/formats'
import { SourcePlayer } from '../shared/SourcePlayer'
import { VideoToolPage } from '../shared/VideoToolPage'
import { ConvertOptions } from './ConvertOptions'
import { CONVERT_LABELS, audioActionLabel, noTargetExplanation, videoActionLabel } from './settings'
import { useConvertTool } from './useConvertTool'

export function ConvertPage() {
  const convert = useConvertTool()
  const { tool, choices, plan, unavailablePlans } = convert
  const { state } = tool
  const { info } = state
  const busy = state.phase === 'processing'

  const blocker =
    info && !plan
      ? { title: 'Conversão indisponível neste navegador', text: noTargetExplanation(unavailablePlans, info.codec) }
      : undefined
  const audio = plan && audioActionLabel(plan, convert.audioBitrate)

  return (
    <VideoToolPage
      title="Converter vídeo"
      description="Troque o formato do vídeo entre MP4, MOV e WEBM. Quando dá, só copia: rápido e sem perder qualidade. O vídeo não sai do seu dispositivo."
      labels={CONVERT_LABELS}
      actionIcon={ArrowLeftRight}
      tool={tool}
      canStart={plan?.blocked === null}
      onStart={convert.apply}
      preview={state.sourceUrl && <SourcePlayer key={state.fileId} src={state.sourceUrl} name={state.file?.name ?? ''} />}
      options={
        blocker ? (
          <Alert variant="error" title={blocker.title}>
            {blocker.text}
          </Alert>
        ) : (
          info &&
          plan && (
            <ConvertOptions
              choices={choices}
              plan={plan}
              onTargetChange={convert.changeTarget}
              modeChoices={convert.modeChoices}
              mode={convert.mode}
              onModeChange={convert.changeMode}
              unavailablePlans={unavailablePlans}
              codec={info.codec}
              audioBitrate={convert.audioBitrate}
              extraTracks={info.extraTracks}
              disabled={busy}
            />
          )
        )
      }
      resultDetails={
        plan && (
          <dl className="grid gap-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-fg-muted">Formato</dt>
              <dd className="text-fg tabular-nums">{VIDEO_FORMATS[plan.target].label}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-fg-muted">Vídeo</dt>
              <dd className="text-right text-fg">{videoActionLabel(plan)}</dd>
            </div>
            {audio && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-fg-muted">Som</dt>
                <dd className="text-right text-fg">{audio}</dd>
              </div>
            )}
          </dl>
        )
      }
    />
  )
}
