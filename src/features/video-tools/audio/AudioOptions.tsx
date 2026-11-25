import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { AUDIO_FORMATS, type AudioChoice, type AudioFormat } from '../../../core/video/audio'
import { Note } from '../shared/Note'

/** O que acontece com o som no formato escolhido, e onde ele toca. */
function describeAudioChoice({ format, copy }: AudioChoice, kbps: number): string {
  if (copy && format === 'webm') {
    return 'Cópia exata do som do vídeo: rápido e sem perder qualidade. iPhones mais antigos podem não tocar WEBM: para eles, escolha M4A ou MP3.'
  }
  if (copy) return 'Cópia exata do som do vídeo: rápido e sem perder qualidade. Toca em praticamente todo lugar.'
  if (format === 'mp3') {
    return `O som é refeito em MP3, a ${kbps} kbit/s: abre em qualquer aparelho, inclusive os mais antigos. Em vídeos longos, leva alguns minutos.`
  }
  return `O som é refeito em AAC, a ${kbps} kbit/s: toca em praticamente todo lugar, inclusive no iPhone.`
}

/** Por que um formato está indisponível, em linguagem simples. */
function unavailableNotes(choices: readonly AudioChoice[], canDecodeAudio: boolean): string[] {
  const missing = choices.filter((choice) => !choice.available).map((choice) => choice.format)
  if (missing.length === 0) return []
  if (!canDecodeAudio) {
    const labels = missing.map((format) => AUDIO_FORMATS[format].label).join(' e ')
    const verb = missing.length > 1 ? 'ficam indisponíveis' : 'fica indisponível'
    return [`Este navegador não consegue ler o som deste vídeo para refazê-lo: ${labels} ${verb}. Use o Chrome, o Edge ou o Safari.`]
  }
  return missing.map((format) =>
    format === 'mp3'
      ? 'MP3 indisponível: este navegador bloqueia o gerador de MP3, como acontece com o Modo de Isolamento do iPhone ligado.'
      : 'M4A indisponível: este navegador não gera esse formato a partir deste som. Para ter M4A, use o Chrome, o Edge ou o Safari.',
  )
}

interface AudioOptionsProps {
  choices: readonly AudioChoice[]
  choice: AudioChoice
  onFormatChange: (format: AudioFormat) => void
  canDecodeAudio: boolean
  /** Taxa do som se ele for refeito, em bits por segundo (um degrau acima da do original). */
  reencodedBitrate: number
  extraTracks: boolean
  disabled?: boolean
}

/** Formato do arquivo de som: a cópia do som original primeiro, depois os refeitos, com o que cada um faz. */
export function AudioOptions({ choices, choice, onFormatChange, canDecodeAudio, reencodedBitrate, extraTracks, disabled = false }: AudioOptionsProps) {
  const options = choices.map(({ format, available }) => ({ value: format, label: AUDIO_FORMATS[format].label, disabled: !available }))

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <SegmentedControl label="Formato do áudio" options={options} value={choice.format} onChange={onFormatChange} disabled={disabled} />
        <p className="text-xs text-fg-muted">{describeAudioChoice(choice, Math.round(reencodedBitrate / 1000))}</p>
      </div>
      {unavailableNotes(choices, canDecodeAudio).map((note) => (
        <Note key={note}>{note}</Note>
      ))}
      {extraTracks && <Note>Este vídeo tem mais de uma faixa de vídeo ou de áudio: sai só o som da principal.</Note>}
      <Note>O áudio sai sem metadados, como localização e data da gravação.</Note>
    </div>
  )
}
