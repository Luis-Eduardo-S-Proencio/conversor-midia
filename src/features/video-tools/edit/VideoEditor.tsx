import { Pause, Play, Redo2, SquareSplitHorizontal, Trash2, Undo2, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Button, IconButton } from '../../../components/ui/Button'
import { formatTime } from '../../../core/video/time'
import type { VideoText } from '../../../core/video/text'
import { colorMatrix, hasColorChange, type VideoEffects } from '../../../core/video/effects'
import {
  canRemoveSelection,
  canSplitAt,
  editedDuration,
  editedTimeAt,
  pieceOffsets,
  selectionLimits,
  sourceTimeAt,
  type Edge,
  type Edit,
  type Piece,
  type Selection,
} from '../../../core/video/timeline'
import { EditTimeline } from './EditTimeline'
import { ColorFilterDefs, EffectsButton, EffectsPanel } from './EffectsPanel'
import { TextLayer } from './TextLayer'
import { TextButton, TextPanel } from './TextPanel'
import { ZOOM_LEVELS, filterIdBase, initialZoom } from './settings'
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
  /** A parte marcada para sair. */
  selection?: Selection
  thumbnails?: Thumbnails
  canUndo: boolean
  canRedo: boolean
  onSplit: (editedTime: number) => void
  onDelete: () => void
  onUndo: () => void
  onRedo: () => void
  onSelect: (id: number) => void
  onSelectionEdge: (edge: Edge, sourceTime: number) => void
  /** Textos sobre o vídeo e o aberto para editar. */
  texts: readonly VideoText[]
  selectedText?: VideoText
  onAddText: (editedTime: number) => void
  onSelectText: (id: number | undefined) => void
  onChangeText: (id: number, change: (text: VideoText) => VideoText) => void
  onTextTime: (id: number, edge: Edge, sourceTime: number) => void
  onDuplicateText: (id: number) => void
  onDeleteText: (id: number) => void
  /** Filtros, ajustes e velocidade do vídeo inteiro. */
  effects: VideoEffects
  onChangeEffects: (change: (current: VideoEffects) => VideoEffects, key?: string) => void
  disabled?: boolean
}

/** Pedaço que contém o tempo do original (ou o primeiro depois dele, se o tempo caiu numa parte excluída). */
function pieceIndexAt(pieces: readonly Piece[], sourceTime: number): number {
  const inside = pieces.findIndex((piece) => sourceTime >= piece.start && sourceTime < piece.end)
  return inside >= 0 ? inside : pieces.findIndex((piece) => piece.start > sourceTime)
}

/**
 * Editor do vídeo: o player mostra o vídeo como ele está ficando (as partes excluídas são puladas, sem
 * processar nada). Na barra embaixo, tocar num pedaço o marca, e as alças ajustam a parte marcada; "Excluir"
 * tira essa parte. "Dividir" corta o vídeo em dois pedaços no ponto da linha; os outros botões desfazem e mudam o zoom.
 */
export function VideoEditor(props: VideoEditorProps) {
  const { src, name, duration, edit, selection, thumbnails, canUndo, canRedo, texts, selectedText, effects, disabled = false } = props
  const video = useRef<HTMLVideoElement>(null)
  const wrapper = useRef<HTMLDivElement>(null)
  const playing = useRef(false)
  const piecesRef = useRef(edit.pieces)
  const timeRef = useRef(0)
  const [time, setTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [zoom, setZoom] = useState<number>(ZOOM_LEVELS[0])
  const [unplayable, setUnplayable] = useState(false)
  const [effectsOpen, setEffectsOpen] = useState(false)
  const hintId = useId()
  const effectsPanelId = useId()
  const lookFilterId = `${filterIdBase(useId())}-look`
  const matrix = colorMatrix(effects.color)
  const { speed } = effects
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

  // A prévia toca na velocidade escolhida; o navegador mantém o tom do som, como o arquivo salvo.
  useEffect(() => {
    const element = video.current
    if (!element) return
    element.defaultPlaybackRate = speed
    element.playbackRate = speed
  }, [speed])

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
      // Acelerado, o player anda mais entre dois quadros de tela: a emenda é tratada antes, na mesma proporção.
      if (piece && element.currentTime >= piece.end - SEAM_MARGIN * Math.max(1, element.playbackRate)) {
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

  /** Arrastar uma alça mostra no player o quadro exato daquela ponta da parte marcada. */
  function handleSelectionEdge(edge: Edge, sourceTime: number) {
    if (!selection) return
    pause()
    props.onSelectionEdge(edge, sourceTime)
    const index = edit.pieces.findIndex((piece) => piece.id === selection.id)
    const piece = edit.pieces[index]
    if (!piece) return
    const { min, max } = selectionLimits(edit, selection, edge)
    const value = Math.min(max, Math.max(min, sourceTime))
    setTime((pieceOffsets(edit.pieces)[index] ?? 0) + value - piece.start)
    if (video.current) video.current.currentTime = value
  }

  /** Abrir um texto que não aparece no ponto da linha leva a linha até o começo dele (para ele aparecer no player). */
  function openText(id: number) {
    const text = texts.find((item) => item.id === id)
    const now = sourceTimeAt(edit.pieces, shown).time
    if (text && !(now >= text.start && now < text.end)) scrub(Math.min(total, editedTimeAt(edit.pieces, text.start) + 0.001))
    setEffectsOpen(false)
    props.onSelectText(id)
  }

  /** Um painel aberto por vez: abrir os efeitos fecha o texto aberto. */
  function toggleEffects() {
    if (!effectsOpen) props.onSelectText(undefined)
    setEffectsOpen(!effectsOpen)
  }

  const sourceNow = sourceTimeAt(edit.pieces, shown).time
  const zoomIndex = ZOOM_LEVELS.findIndex((level) => level === zoom)
  const canSplit = canSplitAt(edit, shown)
  const canDelete = canRemoveSelection(edit, selection)

  return (
    <div ref={wrapper} className="grid min-w-0 grid-cols-1 gap-3">
      <div className="relative min-w-0">
        {matrix && <ColorFilterDefs filters={[{ id: lookFilterId, matrix }]} />}
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
          // A cor dos efeitos só no vídeo: os textos, desenhados por cima, ficam na cor deles, como no arquivo.
          style={matrix ? { filter: `url(#${lookFilterId})` } : undefined}
        />
        <TextLayer
          video={video}
          texts={texts}
          sourceTime={sourceNow}
          selectedId={selectedText?.id}
          onSelect={openText}
          onMove={(id, x, y) => props.onChangeText(id, (text) => ({ ...text, x, y }))}
          disabled={disabled}
        />
      </div>
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
        <TextButton
          onClick={() => {
            setEffectsOpen(false)
            props.onAddText(shown)
          }}
          disabled={disabled}
        />
        <EffectsButton
          active={hasColorChange(effects.color) || speed !== 1}
          aria-expanded={effectsOpen && !selectedText}
          aria-controls={effectsOpen && !selectedText ? effectsPanelId : undefined}
          onClick={toggleEffects}
          disabled={disabled}
        />
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

      {selectedText && (
        <TextPanel
          key={selectedText.id}
          text={selectedText}
          sourceTime={sourceNow}
          onChange={(change) => props.onChangeText(selectedText.id, change)}
          onTime={(edge, time) => props.onTextTime(selectedText.id, edge, time)}
          onDuplicate={() => props.onDuplicateText(selectedText.id)}
          onDelete={() => props.onDeleteText(selectedText.id)}
          onClose={() => props.onSelectText(undefined)}
          disabled={disabled}
        />
      )}

      {effectsOpen && !selectedText && (
        <div id={effectsPanelId}>
          <EffectsPanel
            effects={effects}
            onChange={props.onChangeEffects}
            onClose={() => setEffectsOpen(false)}
            thumbnails={thumbnails}
            duration={duration}
            sourceTime={sourceNow}
            editedDuration={total}
            disabled={disabled}
          />
        </div>
      )}

      <EditTimeline
        edit={edit}
        duration={duration}
        selection={selection}
        thumbnails={thumbnails}
        pixelsPerSecond={zoom}
        time={shown}
        onScrub={scrub}
        onSelect={props.onSelect}
        onSelectionEdge={handleSelectionEdge}
        disabled={disabled}
        hintId={hintId}
        texts={texts}
        selectedTextId={selectedText?.id}
        onSelectText={openText}
        onTextEdge={(id, edge, value) => {
          pause()
          props.onTextTime(id, edge, value)
          // O player mostra o quadro da ponta movida, como nas alças do corte.
          if (video.current) video.current.currentTime = value
        }}
      />
      <div className="flex justify-between gap-3 text-xs tabular-nums">
        <span className="text-fg">{formatTime(shown)}</span>
        <span className="text-fg-muted">{formatTime(total)}</span>
      </div>
      <p aria-live="polite" className="sr-only">
        {spoken}
      </p>
      <p id={hintId} className="text-xs text-fg-muted">
        Para tirar uma parte: toque no vídeo na barra, arraste as alças ‹ e › até cobrir só o que quer tirar e toque em
        Excluir. Arrastar a barra (ou as setas) leva a linha branca a um ponto; Dividir corta o vídeo ali em dois pedaços. O T põe um
        texto no ponto da linha: arraste o texto no vídeo para mudar o lugar e as pontas do bloco dele, na barra, para mudar quando aparece. Efeitos muda as cores e a
        velocidade do vídeo inteiro.
      </p>
    </div>
  )
}
