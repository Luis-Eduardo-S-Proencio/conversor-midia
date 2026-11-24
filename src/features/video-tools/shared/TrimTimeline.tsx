import { formatDuration } from '../../../core/video/time'
import type { TrimRange } from '../../../core/video/trim'

interface TrimTimelineProps {
  duration: number
  /** O que fica do vídeo. */
  kept: readonly TrimRange[]
  /** Ponto atual do player, em segundos. */
  time: number
  /** Explica a parte azul da barra. */
  legend?: string
}

const percent = (value: number, duration: number) => `${Math.min(100, Math.max(0, (value / duration) * 100))}%`

/**
 * O vídeo inteiro numa barra: em azul o que fica, o resto sai; a linha clara é o ponto do player.
 * Só visual: o leitor de tela recebe a mesma informação pelos campos e pela duração final.
 */
export function TrimTimeline({ duration, kept, time, legend = 'Em azul, o que fica no vídeo' }: TrimTimelineProps) {
  return (
    <div aria-hidden="true" className="grid gap-1.5">
      <div className="relative h-3 overflow-hidden rounded-full bg-border">
        {kept.map((range) => (
          <span
            key={`${range.start}-${range.end}`}
            data-kept=""
            className="absolute inset-y-0 bg-accent forced-colors:bg-[Highlight]"
            style={{ left: percent(range.start, duration), width: percent(range.end - range.start, duration) }}
          />
        ))}
        <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-fg forced-colors:bg-[CanvasText]" style={{ left: percent(time, duration) }} />
      </div>
      <div className="flex justify-between gap-3 text-xs tabular-nums text-fg-subtle">
        <span>0:00</span>
        <span className="font-sans">{legend}</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  )
}
