import { Pause, Play, Redo2, SquareSplitHorizontal, Trash2, Undo2, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Button, IconButton } from '../../../components/ui/Button'
import { formatTime } from '../../../core/video/time'
import { canSplitAt, edgeLimits, editedDuration, pieceOffsets, sourceTimeAt, type Edge, type Edit, type Piece } from '../../../core/video/timeline'
import { EditTimeline } from './EditTimeline'
import { ZOOM_LEVELS, initialZoom } from './settings'
import type { Thumbnails } from './useEditTool'

/** A emenda é tratada um pouco antes do fim do pedaço: o player avança aos saltos de um quadro. */
const SEAM_MARGIN = 0.02

/** Espera (ms) depois da última seta antes de falar o tempo: sem isso, cada toque de tecla seria anunciado. */
const SPEAK_DELAY = 400

interface VideoEditorProps {
  /** URL temporária do vídeo (quem a cria a libera). */
  src: string
  name: string
  /** Duração do vídeo original, em segundos. */
  duration: number
  edit: Edit
  selected?: number
  thumbnails?: Thumbnails
  canUndo: boolean
  canRedo: boolean
  onSplit: (editedTime: number) => void
  onDelete: () => void
  onUndo: () => void
  onRedo: () => void
  onSelect: (id: number) => void
  onEdge: (id: number, edge: Edge, sourceTime: number, done: boolean) => void
  disabled?: boolean
}

/** Pedaço que contém o tempo do original (ou o primeiro depois dele, se o tempo caiu numa parte excluída). */
function pieceIndexAt(pieces: readonly Piece[], sourceTime: number): number {
  const inside = pieces.findIndex((piece) => sourceTime >= piece.start && sourceTime < piece.end)
  return inside >= 0 ? inside : pieces.findIndex((piece) => piece.start > sourceTime)
}

/**
 * Editor do vídeo: o player mostra o vídeo como ele está ficando (as partes excluídas são puladas, sem
 * processar nada), os botões dividem, excluem, desfazem e mudam o zoom, e a barra embaixo escolhe o ponto.
 */
export function VideoEditor(props: VideoEditorProps) {
  const { src, name, duration, edit, selected, thumbnails, canUndo, canRedo, disabled = false } = props
  const video = useRef<HTMLVideoElement>(null)
  const wrapper = useRef<HTMLDivElement>(null)
  const playing = useRef(false)
  const piecesRef = useRef(edit.pieces)
  const timeRef = useRef(0)
  const [time, setTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [zoom, setZoom] = useState<number>(ZOOM_LEVELS[0])
  const [unplayable, setUnplayable] = useState(false)
  const hintId = useId()
  const total = editedDuration(edit.pieces)
  const shown = Math.min(time, total)

  // Os laços e os eventos do player leem sempre os pedaços e o ponto mais recentes.
  useLayoutEffect(() => {
    piecesRef.current = edit.pieces
    timeRef.current = time
  })

  useLayoutEffect(() => {
    if (wrapper.current) setZoom(initialZoom(duration, wrapper.current.clientWidth))
  }, [duration])

  /** Mostra no player o quadro de um ponto do vídeo editado. */
  const seek = useCallback((editedTime: number) => {
    const element = video.current
    if (element) element.currentTime = sourceTimeAt(piecesRef.current, editedTime).time
  }, [])

  const pause = useCallback(() => {
    playing.current = false
    setIsPlaying(false)
    video.current?.pause()
  }, [])

  // Excluir, desfazer ou ajustar uma ponta muda o vídeo editado: o player já mostra como ficou no ponto da linha.
  // Só quando os pedaços mudam: mover a linha já busca o quadro por conta própria.
  useEffect(() => {
    if (!playing.current) seek(Math.min(timeRef.current, editedDuration(edit.pieces)))
  }, [edit, seek])

  // Tocando: a cada quadro de tela, pula as partes excluídas e leva a linha junto.
  useEffect(() => {
    if (!isPlaying) return
    let frame = 0
    const follow = () => {
      const element = video.current
      if (!element || !playing.current) return
      const pieces = piecesRef.current
      let index = pieceIndexAt(pieces, element.currentTime)
      let piece = pieces[index]
      if (piece && element.currentTime < piece.start) element.currentTime = piece.start
      if (piece && element.currentTime >= piece.end - SEAM_MARGIN) {
        index += 1
        piece = pieces[index]
        if (piece) element.currentTime = piece.start
      }
      if (!piece) {
        pause()
        setTime(editedDuration(pieces))
        return
      }
      setTime((pieceOffsets(pieces)[index] ?? 0) + Math.max(0, element.currentTime - piece.start))
      frame = requestAnimationFrame(follow)
    }
    frame = requestAnimationFrame(follow)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, pause])

  function play() {
    const element = video.current
    if (!element) return
    const start = shown >= total - SEAM_MARGIN ? 0 : shown
    setTime(start)
    seek(start)
    playing.current = true
    element.play().then(
      () => setIsPlaying(playing.current),
      () => pause(), // o navegador recusou tocar (ex.: interrompido): volta ao estado parado
    )
  }

  /** Tempo falado ao leitor de tela depois de mover a linha pelas setas (quando a pessoa para de apertar). */
  const [spoken, setSpoken] = useState('')
  const speakTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(speakTimer.current), [])

  function scrub(editedTime: number, keyboard = false) {
    pause()
    setTime(editedTime)
    seek(editedTime)
    if (!keyboard) return
    window.clearTimeout(speakTimer.current)
    speakTimer.current = window.setTimeout(() => setSpoken(`${formatTime(editedTime)} de ${formatTime(total)}`), SPEAK_DELAY)
  }

  /** Arrastar uma ponta mostra no player o quadro exato do novo corte. */
  function handleEdge(id: number, edge: Edge, sourceTime: number, done: boolean) {
    pause()
    props.onEdge(id, edge, sourceTime, done)
    const index = edit.pieces.findIndex((piece) => piece.id === id)
    const piece = edit.pieces[index]
    if (!piece) return
    const { min, max } = edgeLimits(edit, id, edge, duration)
    const value = Math.min(max, Math.max(min, sourceTime))
    const offset = pieceOffsets(edit.pieces)[index] ?? 0
    setTime(edge === 'start' ? offset : offset + value - piece.start)
    if (video.current) video.current.currentTime = value
  }

  const zoomIndex = ZOOM_LEVELS.findIndex((level) => level === zoom)
  const canSplit = canSplitAt(edit, shown)
  const canDelete = selected !== undefined && edit.pieces.length > 1

  return (
    <div ref={wrapper} className="grid min-w-0 grid-cols-1 gap-3">
      <video
        ref={video}
        src={src}
        playsInline
        preload="auto"
        aria-label={`Vídeo ${name}, como está ficando`}
        onClick={() => (isPlaying ? pause() : play())}
        onPause={() => {
          if (playing.current) pause() // pausado pelo sistema (ex.: outra aba tocando)
        }}
        onError={() => setUnplayable(true)}
        className="max-h-[50dvh] w-full rounded-lg border border-border bg-bg"
      />
      {unplayable && (
        <p className="text-sm text-fg-muted">Este navegador não consegue mostrar este vídeo, mas você ainda pode editá-lo pela barra abaixo.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <IconButton
          icon={isPlaying ? Pause : Play}
          label={isPlaying ? 'Pausar' : 'Tocar o vídeo editado'}
          variant="secondary"
          onClick={() => (isPlaying ? pause() : play())}
          disabled={disabled || unplayable}
        />
        <Button icon={SquareSplitHorizontal} onClick={() => props.onSplit(shown)} disabled={disabled || !canSplit}>
          Dividir
        </Button>
        <Button icon={Trash2} onClick={props.onDelete} disabled={disabled || !canDelete}>
          Excluir
        </Button>
        <div className="ml-auto flex gap-1">
          <IconButton icon={Undo2} label="Desfazer" onClick={props.onUndo} disabled={disabled || !canUndo} />
          <IconButton icon={Redo2} label="Refazer" onClick={props.onRedo} disabled={disabled || !canRedo} />
          <IconButton icon={ZoomOut} label="Diminuir o zoom da barra" onClick={() => setZoom(ZOOM_LEVELS[zoomIndex - 1] ?? zoom)} disabled={zoomIndex <= 0} />
          <IconButton
            icon={ZoomIn}
            label="Aumentar o zoom da barra"
            onClick={() => setZoom(ZOOM_LEVELS[zoomIndex + 1] ?? zoom)}
            disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
          />
        </div>
      </div>

      <EditTimeline
        edit={edit}
        duration={duration}
        selected={selected}
        thumbnails={thumbnails}
        pixelsPerSecond={zoom}
        time={shown}
        onScrub={scrub}
        onSelect={props.onSelect}
        onEdge={handleEdge}
        disabled={disabled}
        hintId={hintId}
      />
      <div className="flex justify-between gap-3 font-mono text-xs tabular-nums">
        <span className="text-fg">{formatTime(shown)}</span>
        <span className="text-fg-muted">{formatTime(total)}</span>
      </div>
      <p aria-live="polite" className="sr-only">
        {spoken}
      </p>
      <p id={hintId} className="text-xs text-fg-muted">
        Arraste a barra (ou use as setas) para levar a linha branca ao ponto do corte. Dividir corta ali; toque num pedaço para
        selecioná-lo e excluir ou ajustar as pontas.
      </p>
    </div>
  )
}
