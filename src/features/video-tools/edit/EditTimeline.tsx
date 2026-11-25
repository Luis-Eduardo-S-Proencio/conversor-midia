import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Icon } from '../../../components/ui/Icon'
import { cx } from '../../../components/ui/cx'
import { formatDuration, formatTime } from '../../../core/video/time'
import { editedDuration, pieceOffsets, selectionLimits, thumbnailCell, visibleTiles, type Edge, type Edit, type Selection } from '../../../core/video/timeline'
import { STRIP_HEIGHT, keyStep, rulerStep } from './settings'
import type { Thumbnails } from './useEditTool'

/** Largura visível das alças das pontas (o mínimo da WCAG 2.2); a área de toque se estende além dela. */
const HANDLE_WIDTH = 24

/** Marca da régua: segundos inteiros como "0:04"; meios segundos, "0:04,5". */
const tickLabel = (tick: number) => (Number.isInteger(tick) ? formatDuration(tick) : formatTime(tick).replace(/0$/, ''))

/** Movimento do ponteiro, em pixels, a partir do qual arrastar a barra deixa de ser um toque num pedaço. */
const DRAG_THRESHOLD = 4

/** Foco até este tempo (ms) depois de tocar a barra conta como foco por toque. */
const TAP_FOCUS_WINDOW = 800

/** Rolagem até este tempo (ms) depois de um foco por toque é a do navegador mostrando o pedaço. */
const TAP_SCROLL_WINDOW = 200

interface EditTimelineProps {
  edit: Edit
  /** Duração do vídeo original, em segundos. */
  duration: number
  /** A parte marcada para sair (dentro de um pedaço). */
  selection?: Selection
  thumbnails?: Thumbnails
  pixelsPerSecond: number
  /** Ponto atual no vídeo editado (a linha do meio). */
  time: number
  /** A pessoa moveu a barra (arrastando, rolando ou pelas setas, `keyboard`). */
  onScrub: (time: number, keyboard?: boolean) => void
  onSelect: (id: number) => void
  onSelectionEdge: (edge: Edge, sourceTime: number) => void
  disabled?: boolean
  /** Explica como usar a barra (leitores de tela). */
  hintId: string
}

/**
 * A barra do vídeo editado: os pedaços encostados um no outro, com miniaturas, sob uma linha fixa no meio
 * que marca o ponto atual. Arrastar (ou rolar, ou as setas) move o vídeo por baixo da linha. Tocar num
 * pedaço marca ele inteiro; as alças encolhem a marca até cobrir só a parte que deve sair.
 */
export function EditTimeline({
  edit,
  duration,
  selection,
  thumbnails,
  pixelsPerSecond,
  time,
  onScrub,
  onSelect,
  onSelectionEdge,
  disabled = false,
  hintId,
}: EditTimelineProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  /** Posição que o próprio componente pôs na barra: o evento de rolagem dela não é um movimento da pessoa. */
  const programmatic = useRef<number | null>(null)
  const drag = useRef<{ x: number; scrollLeft: number; moved: boolean } | null>(null)
  /** O clique que vem logo depois de arrastar a barra com o mouse não seleciona o pedaço embaixo. */
  const swallowClick = useRef(false)
  /**
   * Tocar num pedaço o foca, e o navegador rola a barra para mostrá-lo inteiro: essa rolagem não é a pessoa
   * movendo a linha. Guarda quando o último toque e o último foco por toque aconteceram.
   */
  const pointerAt = useRef(-Infinity)
  const tapFocusAt = useRef(-Infinity)
  const { pieces } = edit
  const total = editedDuration(pieces)
  const offsets = pieceOffsets(pieces)
  const pad = width / 2

  useLayoutEffect(() => {
    const element = scroller.current
    if (!element) return
    const observer = new ResizeObserver(() => setWidth(element.clientWidth))
    observer.observe(element)
    setWidth(element.clientWidth)
    return () => observer.disconnect()
  }, [])

  // O ponto atual (tocando, depois de excluir, mudando o zoom) leva a barra junto.
  useLayoutEffect(() => {
    const element = scroller.current
    if (!element) return
    const target = Math.round(Math.min(time, total) * pixelsPerSecond)
    if (Math.abs(element.scrollLeft - target) < 1) return
    programmatic.current = target
    element.scrollLeft = target
    setScrollLeft(element.scrollLeft)
  }, [time, total, pixelsPerSecond, width])

  useEffect(() => {
    const end = () => {
      if (drag.current?.moved) swallowClick.current = true
      drag.current = null
    }
    window.addEventListener('pointerup', end)
    return () => window.removeEventListener('pointerup', end)
  }, [])

  function handleScroll() {
    const element = scroller.current
    if (!element) return
    const expected = programmatic.current
    programmatic.current = null
    if (expected !== null && Math.abs(element.scrollLeft - expected) <= 1) {
      setScrollLeft(element.scrollLeft)
      return
    }
    // Rolagem logo depois de um toque que focou um pedaço: volta a barra para o ponto da linha.
    if (performance.now() - tapFocusAt.current < TAP_SCROLL_WINDOW && !drag.current?.moved) {
      const target = Math.round(Math.min(time, total) * pixelsPerSecond)
      programmatic.current = target
      element.scrollLeft = target
      return
    }
    setScrollLeft(element.scrollLeft)
    onScrub(Math.min(total, element.scrollLeft / pixelsPerSecond))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return // setas nas alças e nos pedaços são deles
    const step = keyStep(event.shiftKey)
    const next =
      event.key === 'ArrowLeft' ? time - step : event.key === 'ArrowRight' ? time + step : event.key === 'Home' ? 0 : event.key === 'End' ? total : null
    if (next === null) return
    event.preventDefault()
    onScrub(Math.min(total, Math.max(0, next)), true)
  }

  // Com o mouse, arrastar a barra a move (no toque, a rolagem do próprio navegador já faz isso).
  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    swallowClick.current = false
    if (event.pointerType !== 'mouse' || event.button !== 0 || !scroller.current) return
    drag.current = { x: event.clientX, scrollLeft: scroller.current.scrollLeft, moved: false }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    const element = scroller.current
    if (!current || !element) return
    const dx = event.clientX - current.x
    if (Math.abs(dx) > DRAG_THRESHOLD) current.moved = true
    if (current.moved) element.scrollLeft = current.scrollLeft - dx
  }

  const tileWidth = thumbnails ? Math.max(8, Math.round((STRIP_HEIGHT * thumbnails.width) / thumbnails.height)) : 0
  const viewStart = scrollLeft - pad - width
  const viewEnd = scrollLeft - pad + 2 * width
  const tiles = thumbnails ? visibleTiles(pieces, pixelsPerSecond, tileWidth, viewStart, viewEnd) : []
  const step = rulerStep(pixelsPerSecond)
  const firstTick = Math.max(0, Math.floor(viewStart / pixelsPerSecond / step) * step)
  const ticks: number[] = []
  for (let tick = firstTick; tick <= total && tick * pixelsPerSecond <= viewEnd; tick += step) ticks.push(tick)
  const selectedIndex = selection ? pieces.findIndex((piece) => piece.id === selection.id) : -1

  return (
    // A largura vem do espaço disponível, nunca do conteúdo (que é a barra inteira): sem isso, medir a barra
    // e alargar o conteúdo se alimentariam sem fim.
    <div className="relative min-w-0 [contain:inline-size]">
      <div
        ref={scroller}
        role="group"
        aria-label="Linha do tempo do vídeo editado"
        aria-describedby={hintId}
        tabIndex={0}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        onPointerDownCapture={() => {
          pointerAt.current = performance.now()
        }}
        onFocusCapture={() => {
          // Foco vindo de toque ou clique (não do Tab, em que acompanhar o pedaço focado ajuda quem vê a tela).
          if (performance.now() - pointerAt.current < TAP_FOCUS_WINDOW) tapFocusAt.current = performance.now()
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="overflow-x-auto overflow-y-hidden rounded-md bg-bg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="relative" style={{ width: total * pixelsPerSecond + width, height: STRIP_HEIGHT + 28 }}>
          {pieces.map((piece, index) => {
            const left = pad + (offsets[index] ?? 0) * pixelsPerSecond
            const pieceWidth = (piece.end - piece.start) * pixelsPerSecond
            const isSelected = piece.id === selection?.id
            return (
              <button
                key={piece.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={`Pedaço ${index + 1} de ${pieces.length}: de ${formatTime(piece.start)} a ${formatTime(piece.end)} do vídeo original`}
                disabled={disabled}
                onClick={() => {
                  // Fim de um arraste com o mouse: não é um toque no pedaço.
                  if (swallowClick.current) {
                    swallowClick.current = false
                    return
                  }
                  onSelect(piece.id)
                }}
                className={cx('absolute top-0 overflow-hidden border-x border-bg bg-surface-2 outline-offset-[-2px]', isSelected && 'z-10')}
                style={{ left, width: Math.max(2, pieceWidth), height: STRIP_HEIGHT }}
              >
                {thumbnails &&
                  tiles
                    .filter((tile) => tile.piece === index)
                    .map((tile) => (
                      <span
                        key={tile.left}
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 bg-no-repeat"
                        style={{
                          left: tile.left,
                          width: tileWidth,
                          height: STRIP_HEIGHT,
                          backgroundImage: `url(${thumbnails.url})`,
                          backgroundSize: `${tileWidth * thumbnails.count}px ${STRIP_HEIGHT}px`,
                          backgroundPosition: `${-thumbnailCell(tile.source, duration, thumbnails.count) * tileWidth}px 0`,
                        }}
                      />
                    ))}
                {/* A parte marcada, por cima das miniaturas: moldura e um véu violeta. */}
                {isSelected && selection && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 border-y-[3px] border-accent bg-accent/30"
                    style={{ left: (selection.start - piece.start) * pixelsPerSecond, width: (selection.end - selection.start) * pixelsPerSecond }}
                  />
                )}
              </button>
            )
          })}

          {selection &&
            selectedIndex >= 0 &&
            (['start', 'end'] as const).map((edge) => {
              const piece = pieces[selectedIndex]
              if (!piece) return null
              const offset = offsets[selectedIndex] ?? 0
              const x = pad + (offset + selection[edge] - piece.start) * pixelsPerSecond
              return (
                <EdgeHandle
                  key={edge}
                  edge={edge}
                  label={`${edge === 'start' ? 'Começo' : 'Fim'} da parte marcada`}
                  value={selection[edge]}
                  limits={selectionLimits(edit, selection, edge)}
                  left={edge === 'start' ? x - HANDLE_WIDTH : x}
                  pixelsPerSecond={pixelsPerSecond}
                  onChange={(value) => onSelectionEdge(edge, value)}
                  disabled={disabled}
                />
              )
            })}

          <div aria-hidden="true" className="absolute inset-x-0" style={{ top: STRIP_HEIGHT + 6 }}>
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute -translate-x-1/2 text-[11px] tabular-nums text-fg-subtle"
                style={{ left: pad + tick * pixelsPerSecond }}
              >
                {tickLabel(tick)}
              </span>
            ))}
          </div>
        </div>
      </div>
      {/* A linha do ponto atual fica parada no meio; o vídeo passa por baixo dela. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 z-20 w-0.5 -translate-x-1/2 rounded-full bg-fg shadow-[0_0_0_1px_var(--color-bg)] forced-colors:bg-[CanvasText]"
        style={{ height: STRIP_HEIGHT }}
      />
    </div>
  )
}

interface EdgeHandleProps {
  edge: Edge
  label: string
  /** Tempo da ponta no vídeo original. */
  value: number
  limits: { min: number; max: number }
  left: number
  pixelsPerSecond: number
  onChange: (value: number) => void
  disabled: boolean
}

/** Alça de uma ponta da parte marcada: arrastar ou usar as setas (0,1 s; com Shift, 1 s). Um controle deslizante para o leitor de tela. */
function EdgeHandle({ edge, label, value, limits, left, pixelsPerSecond, onChange, disabled }: EdgeHandleProps) {
  const start = useRef<{ x: number; value: number } | null>(null)
  const clamp = (next: number) => Math.min(limits.max, Math.max(limits.min, next))

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    const step = keyStep(event.shiftKey)
    const next = event.key === 'ArrowLeft' ? value - step : event.key === 'ArrowRight' ? value + step : null
    if (next === null || disabled) return
    event.preventDefault()
    onChange(clamp(next))
  }

  return (
    <span
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={limits.min}
      aria-valuemax={limits.max}
      aria-valuenow={value}
      aria-valuetext={`${formatTime(value)} do vídeo original`}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        if (disabled) return
        event.stopPropagation() // não arrasta a barra
        event.currentTarget.setPointerCapture(event.pointerId)
        start.current = { x: event.clientX, value }
      }}
      onPointerMove={(event) => {
        if (!start.current) return
        onChange(clamp(start.current.value + (event.clientX - start.current.x) / pixelsPerSecond))
      }}
      onPointerUp={(event) => {
        if (!start.current) return
        onChange(clamp(start.current.value + (event.clientX - start.current.x) / pixelsPerSecond))
        start.current = null
      }}
      className={cx(
        // A faixa invisível (before) aumenta a área de toque para os lados, sem aumentar a alça na tela.
        "absolute top-0 z-20 grid cursor-ew-resize touch-none place-items-center bg-accent text-on-accent before:absolute before:inset-y-0 before:-inset-x-2.5 before:content-['']",
        edge === 'start' ? 'rounded-l-md' : 'rounded-r-md',
        disabled && 'opacity-50',
      )}
      style={{ left, width: HANDLE_WIDTH, height: STRIP_HEIGHT }}
    >
      <Icon icon={edge === 'start' ? ChevronLeft : ChevronRight} size="sm" />
    </span>
  )
}
