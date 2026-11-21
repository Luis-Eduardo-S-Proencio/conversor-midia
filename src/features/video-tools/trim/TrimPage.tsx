import { Scissors } from 'lucide-react'
import { formatTime } from '../../../core/video/time'
import { VideoToolPage } from '../shared/VideoToolPage'
import { TRIM_LABELS } from './settings'
import { TrimOptions } from './TrimOptions'
import { TrimPreview } from './TrimPreview'
import { useTrimTool } from './useTrimTool'

export function TrimPage() {
  const trim = useTrimTool()
  const { tool, editor } = trim
  const { state } = tool
  const { info } = state
  const busy = state.phase === 'processing'
  const range = editor?.validation.ok ? editor.validation.range : undefined

  return (
    <VideoToolPage
      title="Cortar trecho"
      description="Escolha onde o vídeo começa e termina e fique só com esse trecho. MP4, MOV ou WEBM; o vídeo não sai do seu dispositivo."
      labels={TRIM_LABELS}
      actionIcon={Scissors}
      tool={tool}
      canStart={Boolean(editor?.mode)}
      onStart={trim.apply}
      preview={
        state.sourceUrl && (
          // Vídeo novo, player novo: nada do anterior (tempo, trecho em reprodução) passa para ele.
          <TrimPreview key={state.fileId} src={state.sourceUrl} name={state.file?.name ?? ''} range={range} onMark={trim.markField} disabled={busy} />
        )
      }
      options={
        editor &&
        info && (
          <TrimOptions
            editor={editor}
            format={info.format}
            codec={info.codec}
            extraTracks={info.extraTracks}
            onFieldChange={trim.changeField}
            onModeChange={trim.changeMode}
            error={trim.error}
            focusRequest={trim.focusRequest}
            disabled={busy}
          />
        )
      }
      resultDetails={
        range && (
          <dl className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-fg-muted">Duração do trecho</dt>
            <dd className="font-mono tabular-nums text-fg">{formatTime(range.end - range.start)}</dd>
          </dl>
        )
      }
    />
  )
}
