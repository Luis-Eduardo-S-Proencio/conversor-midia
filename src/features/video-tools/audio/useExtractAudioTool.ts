import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { audioChoices, audioOutputName, defaultAudioFormat, parseAudioFormat, type AudioChoice, type AudioFormat } from '../../../core/video/audio'
import { useVideoTool } from '../shared/useVideoTool'
import { EXTRACT_AUDIO_LABELS } from './settings'

/**
 * Extrair áudio: um vídeo por vez. Os formatos oferecidos dependem do som do vídeo (a cópia do original
 * vem primeiro) e do que o navegador consegue gerar. O formato escolhido continua valendo nos próximos
 * vídeos enquanto existir para eles (ex.: MP3); senão, vale o padrão (a cópia).
 */
export function useExtractAudioTool() {
  const tool = useVideoTool(EXTRACT_AUDIO_LABELS)
  const { info } = tool.state
  const { invalidateResult, run } = tool
  // Um atalho pode pedir o formato ("Vídeo para MP3" abre com ?formato=mp3); vale se o vídeo permitir.
  const [searchParams] = useSearchParams()
  const [picked, setPicked] = useState<AudioFormat | undefined>(() => parseAudioFormat(searchParams.get('formato')))

  const choices = useMemo<AudioChoice[]>(() => (info ? audioChoices(info) : []), [info])
  const format = choices.some((choice) => choice.format === picked && choice.available) ? picked : defaultAudioFormat(choices)
  const choice = choices.find((item) => item.format === format)

  const changeFormat = useCallback(
    (next: AudioFormat) => {
      setPicked(next)
      invalidateResult()
    },
    [invalidateResult],
  )

  const apply = useCallback(() => {
    if (!format) return
    void run(
      (file) => ({ kind: 'extract-audio', file, format }),
      (output, original) => ({ blob: output.blob, name: audioOutputName(original.name, format) }),
    )
  }, [format, run])

  return { tool, choices, choice, changeFormat, apply }
}
