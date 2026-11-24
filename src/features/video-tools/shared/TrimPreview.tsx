import { ArrowLeftToLine, ArrowRightToLine, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { formatTime } from '../../../core/video/time'
import type { TrimField, TrimRange } from '../../../core/video/trim'
import { TrimTimeline } from './TrimTimeline'

interface TrimPreviewProps {
  /** URL temporária do vídeo (quem a cria a libera). */
  src: string
  name: string
  duration: number
  /** O que fica do vídeo, em ordem: a linha do tempo mostra, e "Ver como fica" toca só isso. */
  kept: readonly TrimRange[]
  /** O que os botões marcam, para a frase de ajuda: "o trecho", "a parte 2". */
  target: string
  onMark: (field: TrimField, time: number) => void
  /** Legenda da linha do tempo (o padrão fala do vídeo que fica). */
  timelineLegend?: string
  disabled?: boolean
}

/** Pedaços a tocar em "Ver como fica" e qual está tocando. */
interface Playback {
  ranges: readonly TrimRange[]
  index: number
}

/**
 * Player do vídeo com os controles do navegador (teclado incluído), a linha do tempo do que fica e os
 * atalhos para marcar o início e o fim no ponto em que ele está. Os campos de tempo são a alternativa.
 */
export function TrimPreview({ src, name, duration, kept, target, onMark, timelineLegend, disabled = false }: TrimPreviewProps) {
  const video = useRef<HTMLVideoElement>(null)
  const playback = useRef<Playback | null>(null)
  const frame = useRef(0)
  const [time, setTime] = useState(0)
  const [unplayable, setUnplayable] = useState(false)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  /**
   * Confere a cada quadro de tela (não a cada evento de tempo, que vem 4 vezes por segundo) se o pedaço
   * acabou: pula para o próximo ou para no último. Assim as partes removidas não aparecem.
   */
  function follow() {
    const element = video.current
    const current = playback.current
    if (!element || !current) return
    const range = current.ranges[current.index]
    if (range && element.currentTime >= range.end) {
      const next = current.ranges[current.index + 1]
      if (!next) {
        playback.current = null
        element.pause()
        return
      }
      current.index += 1
      element.currentTime = next.start
    }
    frame.current = requestAnimationFrame(follow)
  }

  function preview() {
    const element = video.current
    const [first] = kept
    if (!element || !first) return
    cancelAnimationFrame(frame.current)
    playback.current = { ranges: kept, index: 0 }
    element.currentTime = first.start
    element.play().then(follow, () => {
      playback.current = null // o navegador recusou tocar (ex.: interrompido): nada a acompanhar
    })
  }

  const mark = (field: TrimField) => {
    if (video.current) onMark(field, video.current.currentTime)
  }

  return (
    <div className="grid gap-3">
      <video
        ref={video}
        src={src}
        controls
        playsInline
        preload="metadata"
        aria-label={`Vídeo ${name}`}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onPause={() => {
          playback.current = null // pausado pela pessoa: "Ver como fica" deixa de pular as partes
        }}
        onError={() => setUnplayable(true)}
        className="max-h-[50dvh] w-full rounded-lg border border-border bg-bg"
      />
      <TrimTimeline duration={duration} kept={kept} time={time} legend={timelineLegend} />
      {unplayable ? (
        <p className="text-sm text-fg-muted">
          Este navegador não consegue mostrar este vídeo, mas você ainda pode cortá-lo digitando os tempos.
        </p>
      ) : (
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button icon={ArrowLeftToLine} onClick={() => mark('start')} disabled={disabled}>
              Marcar início aqui
            </Button>
            <Button icon={ArrowRightToLine} onClick={() => mark('end')} disabled={disabled}>
              Marcar fim aqui
            </Button>
            <Button variant="ghost" icon={Play} onClick={preview} disabled={disabled || kept.length === 0} className="col-span-2 sm:col-auto">
              Ver como fica
            </Button>
          </div>
          <p className="text-xs text-fg-muted">
            {'Agora em '}
            <span className="tabular-nums">{formatTime(time)}</span>
            {` · os botões marcam ${target}.`}
          </p>
        </div>
      )}
    </div>
  )
}
