import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import type { ConvertPlan, TargetChoice, VideoMode } from '../../../core/video/convert'
import { VIDEO_FORMATS, type VideoFormat } from '../../../core/video/formats'
import { Note } from '../shared/Note'
import { audioActionLabel, unavailableNote, videoActionLabel } from './settings'
import type { ModeChoice } from './useConvertTool'

const MODE_LABELS: Record<VideoMode, string> = { compatible: 'Compatível', fast: 'Rápido' }

const MODE_DESCRIPTIONS: Record<VideoMode, string> = {
  compatible: 'Refaz o vídeo em H.264, que toca em todo lugar, inclusive no Windows e em aparelhos antigos. Pode demorar em vídeos longos.',
  fast: 'Mantém o vídeo em HEVC, como o iPhone gravou: rápido e sem perder qualidade, mas alguns computadores com Windows e aparelhos antigos podem não tocar.',
}

/** Quanto demora e onde toca, conforme o que é copiado e o que é refeito. */
function describePlan({ target, video, audio }: ConvertPlan): string {
  const speed =
    video === 'encode'
      ? 'Refazer o vídeo pode demorar em vídeos longos. A qualidade fica alta, sem deixar o arquivo maior à toa.'
      : audio === 'encode'
        ? 'O vídeo é copiado e só o som é refeito: é rápido, mesmo em vídeos longos.'
        : 'Só troca o formato do arquivo: é rápido, mesmo em vídeos longos, e não perde qualidade.'
  return target === 'webm' ? `${speed} iPhones e Macs mais antigos podem não tocar WEBM.` : speed
}

interface ConvertOptionsProps {
  choices: readonly TargetChoice[]
  plan: ConvertPlan
  onTargetChange: (target: VideoFormat) => void
  /** Escolha entre "compatível" e "rápido"; vazia quando não se aplica (só HEVC para MP4 ou MOV). */
  modeChoices: readonly ModeChoice[]
  mode: VideoMode
  onModeChange: (mode: VideoMode) => void
  /** Planos dos formatos desligados, para explicar o motivo. */
  unavailablePlans: readonly ConvertPlan[]
  /** Codec do vídeo original ("hevc"...), para as explicações. */
  codec: string
  /** Taxa do som, se ele for refeito, em bits por segundo. */
  audioBitrate: number
  extraTracks: boolean
  disabled?: boolean
}

/** Formato final, o modo para HEVC, o que é copiado e o que é refeito, e por que algum formato está desligado. */
export function ConvertOptions({
  choices,
  plan,
  onTargetChange,
  modeChoices,
  mode,
  onModeChange,
  unavailablePlans,
  codec,
  audioBitrate,
  extraTracks,
  disabled = false,
}: ConvertOptionsProps) {
  const targets = choices.map(({ target, available }) => ({ value: target, label: VIDEO_FORMATS[target].label, disabled: !available }))
  const modes = modeChoices.map(({ mode: value, available }) => ({ value, label: MODE_LABELS[value], disabled: !available }))
  const audio = audioActionLabel(plan, audioBitrate)

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <SegmentedControl label="Formato final" options={targets} value={plan.target} onChange={onTargetChange} disabled={disabled} />
        {modes.length === 0 && <p className="text-xs text-fg-muted">{describePlan(plan)}</p>}
      </div>

      {modes.length > 0 && (
        <div className="grid gap-2">
          <SegmentedControl label="Vídeo HEVC (do iPhone)" options={modes} value={mode} onChange={onModeChange} disabled={disabled} />
          <p className="text-xs text-fg-muted">{MODE_DESCRIPTIONS[mode]}</p>
          {modeChoices.some((choice) => choice.mode === 'compatible' && !choice.available) && (
            <p className="text-xs text-fg-muted">
              Compatível indisponível: este navegador não consegue refazer vídeos HEVC. Para ter H.264, tente no Safari, no Chrome ou no Edge.
            </p>
          )}
        </div>
      )}

      <dl className="grid gap-2 border-t border-border pt-4 text-sm">
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

      {unavailablePlans.map((unavailable) => (
        <Note key={unavailable.target}>{unavailableNote(unavailable, codec)}</Note>
      ))}
      {extraTracks && <Note>Este vídeo tem mais de uma faixa de vídeo ou de áudio: o resultado fica só com a principal de cada.</Note>}
      <Note>O vídeo sai sem metadados, como localização e data da gravação.</Note>
    </div>
  )
}
