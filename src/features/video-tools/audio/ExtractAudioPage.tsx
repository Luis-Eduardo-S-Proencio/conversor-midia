import { Music } from 'lucide-react'
import { Alert } from '../../../components/ui/Alert'
import { formatBytes } from '../../../core/format'
import { AUDIO_FORMATS, REENCODED_AUDIO_BITRATE } from '../../../core/video/audio'
import { SourcePlayer } from '../shared/SourcePlayer'
import { VideoToolPage } from '../shared/VideoToolPage'
import { AudioOptions } from './AudioOptions'
import { EXTRACT_AUDIO_LABELS } from './settings'
import { useExtractAudioTool } from './useExtractAudioTool'

export function ExtractAudioPage() {
  const extract = useExtractAudioTool()
  const { tool, choices, choice } = extract
  const { state } = tool
  const { info } = state
  const busy = state.phase === 'processing'

  const blocker = !info
    ? undefined
    : !info.hasAudio
      ? { title: 'Este vídeo não tem som', text: 'Não há som para extrair. Escolha outro vídeo, com som.' }
      : !choice?.available
        ? {
            title: 'Extração indisponível neste navegador',
            text: 'O som deste vídeo precisa ser refeito, e este navegador não consegue lê-lo. Tente no Chrome, no Edge ou no Safari.',
          }
        : undefined

  return (
    <VideoToolPage
      title="Extrair áudio"
      description="Salve só o som do vídeo, em M4A, MP3 ou WEBM. Vídeos MP4, MOV ou WEBM; o vídeo não sai do seu dispositivo."
      labels={EXTRACT_AUDIO_LABELS}
      actionIcon={Music}
      tool={tool}
      canStart={Boolean(choice?.available) && !blocker}
      onStart={extract.apply}
      preview={state.sourceUrl && <SourcePlayer key={state.fileId} src={state.sourceUrl} name={state.file?.name ?? ''} />}
      options={
        blocker ? (
          <Alert variant="error" title={blocker.title}>
            {blocker.text}
          </Alert>
        ) : (
          info &&
          choice && (
            <AudioOptions
              choices={choices}
              choice={choice}
              onFormatChange={extract.changeFormat}
              canDecodeAudio={info.canDecodeAudio}
              extraTracks={info.extraTracks}
              disabled={busy}
            />
          )
        )
      }
      resultDetails={
        choice &&
        state.result && (
          <dl className="grid gap-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-fg-muted">Tamanho</dt>
              <dd className="font-mono tabular-nums text-fg">{formatBytes(state.result.size)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-fg-muted">Formato</dt>
              <dd className="font-mono text-fg">{AUDIO_FORMATS[choice.format].label}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-fg-muted">Som</dt>
              <dd className="text-right text-fg">{choice.copy ? 'Copiado, sem perder qualidade' : `Refeito a ${REENCODED_AUDIO_BITRATE / 1000} kbit/s`}</dd>
            </div>
          </dl>
        )
      }
    />
  )
}
