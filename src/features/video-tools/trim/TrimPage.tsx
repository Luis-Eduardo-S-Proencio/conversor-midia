import { Scissors } from 'lucide-react'
import { formatTime } from '../../../core/video/time'
import { VideoToolPage } from '../shared/VideoToolPage'
import { TRIM_LABELS } from './settings'
import { TrimOptions } from './TrimOptions'
import { TrimPreview } from '../shared/TrimPreview'
import { useTrimTool } from './useTrimTool'

export function TrimPage() {
  const trim = useTrimTool()
  const { tool, editor } = trim
  const { state } = tool
  const { info } = state
  const busy = state.phase === 'processing'
  const activeNumber = editor ? editor.remove.parts.findIndex((part) => part.id === editor.remove.active) + 1 : 0
  const target = editor?.action === 'remove' ? `a parte ${activeNumber}` : 'o trecho'

  return (
    <VideoToolPage
      title="Cortar trecho"
      description="Fique só com um trecho do vídeo ou tire partes do meio. MP4, MOV ou WEBM; o vídeo não sai do seu dispositivo."
      labels={TRIM_LABELS}
      actionIcon={Scissors}
      tool={tool}
      canStart={Boolean(editor?.action)}
      onStart={trim.apply}
      preview={
        state.sourceUrl &&
        editor && (
          // Vídeo novo, player novo: nada do anterior (tempo, trecho em reprodução) passa para ele.
          <TrimPreview
            key={state.fileId}
            src={state.sourceUrl}
            name={state.file?.name ?? ''}
            duration={editor.duration}
            kept={editor.kept}
            target={target}
            onMark={trim.markField}
            disabled={busy}
          />
        )
      }
      options={
        editor &&
        info && (
          <TrimOptions
            editor={editor}
            format={info.format}
            codec={info.codec}
            canTranscodeVideo={info.canTranscodeVideo}
            extraTracks={info.extraTracks}
            error={trim.error}
            focusRequest={trim.focusRequest}
            disabled={busy}
            onActionChange={trim.changeAction}
            onFieldChange={trim.changeField}
            onPartFieldChange={trim.changePartField}
            onPartActivate={trim.activatePart}
            onPartAdd={trim.addPart}
            onPartRemove={trim.removePart}
            onModeChange={trim.changeMode}
          />
        )
      }
      resultDetails={
        editor?.finalDuration != null && (
          <dl className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-fg-muted">Vídeo final</dt>
            <dd className="font-mono tabular-nums text-fg">{formatTime(editor.finalDuration)}</dd>
          </dl>
        )
      }
    />
  )
}
