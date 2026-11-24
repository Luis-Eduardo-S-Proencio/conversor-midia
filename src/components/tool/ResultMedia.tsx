import { Music, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { cx } from '../ui/cx'
import { useMediaQuery } from '../ui/useMediaQuery'
import { FilePreview } from './FilePreview'

function Unviewable({ children }: { children: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-border bg-bg p-6 text-center text-sm text-fg-muted">
      <p>{children}</p>
    </div>
  )
}

interface ResultMediaProps {
  /** URL temporária do resultado (quem a cria a libera). */
  src: string
  /** Nome do arquivo gerado, para o nome acessível. */
  name: string
}

/**
 * A imagem gerada, como ela ficou. Alguns formatos o navegador não mostra (TIFF fora do Safari, PDF):
 * aí a pessoa é orientada a baixar para ver. Use com `key={src}` para recomeçar a cada resultado.
 */
export function ResultImage({ src, name }: ResultMediaProps) {
  const [failed, setFailed] = useState(false)
  if (failed) return <Unviewable>Este navegador não mostra este formato de arquivo. Baixe para ver como ficou.</Unviewable>
  return <FilePreview src={src} alt={`Como ficou: ${name}`} onError={() => setFailed(true)} />
}

/**
 * O som gerado (ex.: o áudio extraído de um vídeo), com os controles do navegador e o nome do arquivo.
 * Use com `key={src}` para recomeçar a cada resultado.
 */
export function ResultAudio({ src, name }: ResultMediaProps) {
  const [failed, setFailed] = useState(false)
  if (failed) return <Unviewable>Este navegador não consegue tocar este áudio. Baixe para ouvir como ficou.</Unviewable>
  return (
    <div className="grid min-h-48 content-center gap-4 rounded-lg border border-border bg-bg p-4 md:p-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-subtle text-accent-soft">
          <Icon icon={Music} />
        </span>
        <p className="min-w-0 truncate text-sm text-fg tabular-nums" title={name}>
          {name}
        </p>
      </div>
      <audio src={src} controls preload="metadata" aria-label={`Como ficou: ${name}`} onError={() => setFailed(true)} className="w-full" />
    </div>
  )
}

/**
 * O GIF gerado, animado, com um botão para pausar: o que se move sozinho por mais de 5 s precisa poder
 * parar (WCAG 2.2.2). Com "reduzir movimento" ligado no sistema, já começa parado. Parado, mostra o
 * primeiro quadro, que é o que o navegador desenha de uma imagem animada num canvas.
 * Use com `key={src}` para recomeçar a cada resultado.
 */
export function ResultGif({ src, name }: ResultMediaProps) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [choice, setChoice] = useState<boolean>()
  const [failed, setFailed] = useState(false)
  const [size, setSize] = useState<{ width: number; height: number }>()
  const image = useRef<HTMLImageElement>(null)
  const still = useRef<HTMLCanvasElement>(null)
  const playing = choice ?? !reducedMotion

  useEffect(() => {
    const canvas = still.current
    const source = image.current
    if (playing || !canvas || !source || !size) return
    canvas.getContext('2d')?.drawImage(source, 0, 0)
  }, [playing, size])

  if (failed) return <Unviewable>Este navegador não consegue mostrar este GIF. Baixe para ver como ficou.</Unviewable>
  const fitted = 'max-h-[50dvh] w-auto max-w-full object-contain'
  return (
    <div className="grid gap-3">
      <div className="grid min-h-48 place-items-center overflow-hidden rounded-lg border border-border bg-bg p-3">
        <img
          ref={image}
          src={src}
          alt={`Como ficou: ${name}`}
          onLoad={(event) => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          onError={() => setFailed(true)}
          className={cx(fitted, !playing && 'hidden')}
        />
        {!playing && size && (
          <canvas ref={still} width={size.width} height={size.height} role="img" aria-label={`Como ficou (parado): ${name}`} className={fitted} />
        )}
      </div>
      <Button variant="ghost" icon={playing ? Pause : Play} onClick={() => setChoice(!playing)} className="justify-self-start">
        {playing ? 'Pausar animação' : 'Reproduzir animação'}
      </Button>
    </div>
  )
}

/** O vídeo gerado, com os controles do navegador. Use com `key={src}` para recomeçar a cada resultado. */
export function ResultVideo({ src, name }: ResultMediaProps) {
  const [failed, setFailed] = useState(false)
  if (failed) return <Unviewable>Este navegador não consegue mostrar este vídeo. Baixe para ver como ficou.</Unviewable>
  return (
    <video
      src={src}
      controls
      playsInline
      preload="metadata"
      aria-label={`Como ficou: ${name}`}
      onError={() => setFailed(true)}
      className="max-h-[50dvh] w-full rounded-lg border border-border bg-bg"
    />
  )
}
