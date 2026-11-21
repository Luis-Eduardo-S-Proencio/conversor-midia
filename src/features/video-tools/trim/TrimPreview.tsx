import { ArrowLeftToLine, ArrowRightToLine, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import type { TrimField, TrimRange } from '../../../core/video/trim'

interface TrimPreviewProps {
  /** URL temporária do vídeo (quem a cria a libera). */
  src: string
  name: string
  /** Trecho válido atual, para "Tocar o trecho". */
  range?: TrimRange
  onMark: (field: TrimField, time: number) => void
  disabled?: boolean
}

/**
 * Player do vídeo com os controles do navegador (teclado incluído) e os atalhos para marcar o início
 * e o fim no ponto em que ele está. Os campos de tempo são a alternativa a usar o player.
 */
export function TrimPreview({ src, name, range, onMark, disabled = false }: TrimPreviewProps) {
  const video = useRef<HTMLVideoElement>(null)
  const stopAt = useRef<number | null>(null)
  const frame = useRef(0)
  const [unplayable, setUnplayable] = useState(false)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  /** Confere a cada quadro de tela (não a cada evento de tempo, que vem 4 vezes por segundo) se o trecho acabou. */
  function watchEnd() {
    const element = video.current
    if (!element || stopAt.current === null) return
    if (element.currentTime >= stopAt.current) {
      stopAt.current = null
      element.pause()
      return
    }
    frame.current = requestAnimationFrame(watchEnd)
  }

  function playRange() {
    const element = video.current
    if (!element || !range) return
    cancelAnimationFrame(frame.current)
    element.currentTime = range.start
    stopAt.current = range.end
    element.play().then(watchEnd, () => {
      stopAt.current = null // o navegador recusou tocar (ex.: interrompido): nada a acompanhar
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
        onPause={() => {
          stopAt.current = null // pausado pela pessoa: o trecho deixa de ser acompanhado
        }}
        onError={() => setUnplayable(true)}
        className="max-h-[50dvh] w-full rounded-lg border border-border bg-bg"
      />
      {unplayable && (
        <p className="text-sm text-fg-muted">
          Este navegador não consegue mostrar este vídeo, mas você ainda pode cortá-lo digitando o início e o fim.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button icon={ArrowLeftToLine} onClick={() => mark('start')} disabled={disabled || unplayable}>
          Marcar início aqui
        </Button>
        <Button icon={ArrowRightToLine} onClick={() => mark('end')} disabled={disabled || unplayable}>
          Marcar fim aqui
        </Button>
        <Button variant="ghost" icon={Play} onClick={playRange} disabled={disabled || unplayable || !range} className="col-span-2 sm:col-auto">
          Tocar o trecho
        </Button>
      </div>
    </div>
  )
}
