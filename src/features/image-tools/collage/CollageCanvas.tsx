import { ArrowLeftRight, Check, Crosshair, Maximize2, RotateCcw, RotateCw, SendToBack, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { IconButton } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { cx } from '../../../components/ui/cx'
import {
  DEFAULT_FRAMING,
  outerRadius,
  panFraming,
  zoomFraming,
  type FreePlacement,
  type PlannedPiece,
  type Size,
} from '../../../core/image/collage'
import type { CollagePhotoView, Collage } from './useCollage'

/* Medidas do plano (pixels do arquivo) viram porcentagens do quadro: a prévia acompanha qualquer largura. */
const pct = (value: number, total: number) => `${(value / total) * 100}%`
/** Em relação à largura do quadro (o quadro é um contêiner de consulta): bordas, cantos e sombra em escala. */
const cqw = (value: number, frameWidth: number) => `${(value / frameWidth) * 100}cqw`

const ZOOM_STEP = 0.25
const MOVE_STEP = 0.01
const SIZE_STEP = 1.08
const ROTATE_STEP = 5

type Point = { x: number; y: number }

type Gesture =
  | { kind: 'pan'; id: string; pointerId: number; start: Point; framing: CollagePhotoView['framing']; cell: Size; photo: Size; scale: number; moved: boolean }
  | { kind: 'move'; id: string; points: Map<number, Point>; start: FreePlacement; anchor: Map<number, Point>; frame: DOMRect }
  | { kind: 'handle'; id: string; pointerId: number; center: Point; from: Point; start: FreePlacement }

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)
const angle = (a: Point, b: Point) => Math.atan2(b.y - a.y, b.x - a.x)
const DEGREES = 180 / Math.PI

interface CollageCanvasProps {
  collage: Collage
  disabled: boolean
  onAnnounce: (text: string) => void
}

/**
 * A colagem como vai sair, desenhada com as mesmas contas do arquivo. Na grade: tocar numa foto marca
 * (com o símbolo de troca no meio) e tocar em outra troca as duas de lugar na hora; arrastar enquadra a
 * foto no espaço. No estilo livre: arrastar move, a alça do canto (ou dois dedos) gira e muda o tamanho.
 * Tudo também pelo teclado e pelos botões embaixo.
 */
export function CollageCanvas({ collage, disabled, onAnnounce }: CollageCanvasProps) {
  const { plan, photos, state, dispatch } = collage
  const hintId = useId()
  const frame = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const suppressClick = useRef(false)
  const pending = useRef<(() => void) | null>(null)
  const frameRequest = useRef(0)
  const [swaps, setSwaps] = useState<{ ids: readonly string[]; count: number }>({ ids: [], count: 0 })
  const free = state.mode === 'free'
  const selected = state.selected
  const selectedIndex = photos.findIndex((photo) => photo.id === selected)
  const selectedPhoto = photos[selectedIndex]
  const selectedPiece = plan.pieces.find((piece) => piece.index === selectedIndex)

  useEffect(() => () => cancelAnimationFrame(frameRequest.current), [])

  /** Um despacho por quadro da tela: arrastar não redesenha a página a cada evento do ponteiro. */
  function schedule(update: () => void) {
    pending.current = update
    if (frameRequest.current) return
    frameRequest.current = requestAnimationFrame(() => {
      frameRequest.current = 0
      pending.current?.()
      pending.current = null
    })
  }

  function flush() {
    cancelAnimationFrame(frameRequest.current)
    frameRequest.current = 0
    pending.current?.()
    pending.current = null
  }

  const cellOf = (piece: PlannedPiece): Size => ({ width: piece.box.width, height: piece.box.height })

  /* Grade */

  function tapCell(photo: CollagePhotoView, position: number) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (!selected) {
      dispatch({ type: 'select', id: photo.id })
      onAnnounce(`Foto ${position + 1} marcada. Toque em outra foto para trocar as duas de lugar.`)
      return
    }
    if (selected === photo.id) {
      dispatch({ type: 'select' })
      onAnnounce('Foto desmarcada.')
      return
    }
    dispatch({ type: 'swap', a: selected, b: photo.id })
    setSwaps((current) => ({ ids: [selected, photo.id], count: current.count + 1 }))
    onAnnounce(`Fotos ${selectedIndex + 1} e ${position + 1} trocadas de lugar.`)
  }

  function startPan(event: PointerEvent<HTMLButtonElement>, photo: CollagePhotoView, piece: PlannedPiece) {
    if (disabled || event.button !== 0) return
    const rect = frame.current?.getBoundingClientRect()
    if (!rect) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      kind: 'pan',
      id: photo.id,
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      framing: photo.framing,
      cell: cellOf(piece),
      photo,
      scale: plan.width / rect.width,
      moved: false,
    }
  }

  function movePan(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current
    if (current?.kind !== 'pan' || current.pointerId !== event.pointerId) return
    const dx = event.clientX - current.start.x
    const dy = event.clientY - current.start.y
    // Um tremido do dedo não é arrasto: abaixo de 6 px continua sendo um toque.
    if (!current.moved && Math.hypot(dx, dy) < 6) return
    current.moved = true
    const framing = panFraming(current.photo, current.cell, current.framing, dx * current.scale, dy * current.scale)
    schedule(() => dispatch({ type: 'framing', id: current.id, framing }))
  }

  function endPan(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current
    if (current?.kind !== 'pan' || current.pointerId !== event.pointerId) return
    flush()
    gesture.current = null
    if (current.moved) suppressClick.current = true
  }

  function zoomSelected(delta: number) {
    if (!selectedPhoto || !selectedPiece) return
    const framing = zoomFraming(selectedPhoto, cellOf(selectedPiece), selectedPhoto.framing, selectedPhoto.framing.zoom + delta)
    dispatch({ type: 'framing', id: selectedPhoto.id, framing })
  }

  function cellKeyDown(event: KeyboardEvent<HTMLButtonElement>, photo: CollagePhotoView, piece: PlannedPiece) {
    if (event.key === 'Escape' && selected) {
      event.preventDefault()
      dispatch({ type: 'select' })
      onAnnounce('Foto desmarcada.')
      return
    }
    const step: Partial<Record<string, Point>> = { ArrowLeft: { x: 1, y: 0 }, ArrowRight: { x: -1, y: 0 }, ArrowUp: { x: 0, y: 1 }, ArrowDown: { x: 0, y: -1 } }
    const arrow = step[event.key]
    if (arrow) {
      event.preventDefault()
      const amount = (event.shiftKey ? 0.2 : 0.05) * Math.min(piece.box.width, piece.box.height)
      dispatch({ type: 'framing', id: photo.id, framing: panFraming(photo, cellOf(piece), photo.framing, arrow.x * amount, arrow.y * amount) })
      return
    }
    if (event.key === '+' || event.key === '=' || event.key === '-') {
      event.preventDefault()
      const zoom = photo.framing.zoom + (event.key === '-' ? -ZOOM_STEP : ZOOM_STEP)
      dispatch({ type: 'framing', id: photo.id, framing: zoomFraming(photo, cellOf(piece), photo.framing, zoom) })
    }
  }

  /* Estilo livre */

  function updatePlacement(id: string, placement: FreePlacement) {
    schedule(() => dispatch({ type: 'placement', id, placement }))
  }

  function startMove(event: PointerEvent<HTMLButtonElement>, photo: CollagePhotoView) {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
    const rect = frame.current?.getBoundingClientRect()
    if (!rect) return
    event.currentTarget.setPointerCapture(event.pointerId)
    if (selected !== photo.id) dispatch({ type: 'select', id: photo.id })
    const point = { x: event.clientX, y: event.clientY }
    const current = gesture.current
    if (current?.kind === 'move' && current.id === photo.id) {
      // Segundo dedo na mesma foto: a partir daqui, pinça (tamanho e giro) a partir de onde ela está.
      current.points.set(event.pointerId, point)
      current.anchor = new Map(current.points)
      current.start = photo.placement
      return
    }
    gesture.current = { kind: 'move', id: photo.id, points: new Map([[event.pointerId, point]]), anchor: new Map([[event.pointerId, point]]), start: photo.placement, frame: rect }
  }

  function movePhoto(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current
    if (current?.kind !== 'move' || !current.points.has(event.pointerId)) return
    current.points.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const [first, second] = [...current.points.values()]
    const [firstAnchor, secondAnchor] = [...current.anchor.values()]
    if (!first || !firstAnchor) return
    if (Math.hypot(first.x - firstAnchor.x, first.y - firstAnchor.y) >= 4) suppressClick.current = true
    const { frame: rect, start } = current
    if (second && secondAnchor) {
      const middle = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
      const middleAnchor = { x: (firstAnchor.x + secondAnchor.x) / 2, y: (firstAnchor.y + secondAnchor.y) / 2 }
      updatePlacement(current.id, {
        x: start.x + (middle.x - middleAnchor.x) / rect.width,
        y: start.y + (middle.y - middleAnchor.y) / rect.height,
        width: start.width * (distance(first, second) / Math.max(1, distance(firstAnchor, secondAnchor))),
        rotation: start.rotation + (angle(first, second) - angle(firstAnchor, secondAnchor)) * DEGREES,
      })
      return
    }
    updatePlacement(current.id, { ...start, x: start.x + (first.x - firstAnchor.x) / rect.width, y: start.y + (first.y - firstAnchor.y) / rect.height })
  }

  function endMove(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current
    if (current?.kind !== 'move' || !current.points.has(event.pointerId)) return
    flush()
    current.points.delete(event.pointerId)
    if (current.points.size === 0) {
      gesture.current = null
      return
    }
    // Um dedo saiu da pinça: o que ficou continua arrastando, a partir de onde a foto está agora.
    const photo = photos.find((item) => item.id === current.id)
    current.anchor = new Map(current.points)
    if (photo) current.start = photo.placement
  }

  function startHandle(event: PointerEvent<HTMLSpanElement>, photo: CollagePhotoView) {
    if (disabled) return
    event.stopPropagation()
    const rect = frame.current?.getBoundingClientRect()
    if (!rect) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      kind: 'handle',
      id: photo.id,
      pointerId: event.pointerId,
      center: { x: rect.left + photo.placement.x * rect.width, y: rect.top + photo.placement.y * rect.height },
      from: { x: event.clientX, y: event.clientY },
      start: photo.placement,
    }
  }

  function moveHandle(event: PointerEvent<HTMLSpanElement>) {
    const current = gesture.current
    if (current?.kind !== 'handle' || current.pointerId !== event.pointerId) return
    const point = { x: event.clientX, y: event.clientY }
    updatePlacement(current.id, {
      ...current.start,
      width: current.start.width * (distance(current.center, point) / Math.max(1, distance(current.center, current.from))),
      rotation: current.start.rotation + (angle(current.center, point) - angle(current.center, current.from)) * DEGREES,
    })
  }

  function endHandle(event: PointerEvent<HTMLSpanElement>) {
    if (gesture.current?.kind !== 'handle' || gesture.current.pointerId !== event.pointerId) return
    flush()
    gesture.current = null
  }

  function nudge(photo: CollagePhotoView, change: Partial<FreePlacement>) {
    dispatch({ type: 'placement', id: photo.id, placement: { ...photo.placement, ...change } })
  }

  function photoKeyDown(event: KeyboardEvent<HTMLButtonElement>, photo: CollagePhotoView) {
    const { placement } = photo
    const step = event.shiftKey ? MOVE_STEP * 5 : MOVE_STEP
    const keys: Record<string, Partial<FreePlacement>> = {
      ArrowLeft: { x: placement.x - step },
      ArrowRight: { x: placement.x + step },
      ArrowUp: { y: placement.y - step },
      ArrowDown: { y: placement.y + step },
      '+': { width: placement.width * SIZE_STEP },
      '=': { width: placement.width * SIZE_STEP },
      '-': { width: placement.width / SIZE_STEP },
      '[': { rotation: placement.rotation - (event.shiftKey ? 15 : ROTATE_STEP) },
      ']': { rotation: placement.rotation + (event.shiftKey ? 15 : ROTATE_STEP) },
    }
    if (event.key === 'Escape' && selected) {
      event.preventDefault()
      dispatch({ type: 'select' })
      return
    }
    const change = keys[event.key]
    if (!change) return
    event.preventDefault()
    if (selected !== photo.id) dispatch({ type: 'select', id: photo.id })
    nudge(photo, change)
  }

  function tapPhoto(photo: CollagePhotoView, position: number) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (selected === photo.id) return
    dispatch({ type: 'select', id: photo.id })
    onAnnounce(`Foto ${position + 1} marcada. Arraste para mover; use os botões embaixo para girar e mudar o tamanho.`)
  }

  /** Tocar no fundo desmarca. */
  function backgroundDown(event: PointerEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && selected) dispatch({ type: 'select' })
  }

  // No estilo livre, as fotos ficam na ordem de abertura (o foco não pula ao trazer uma para a frente);
  // quem está por cima vem do índice de profundidade.
  const stableOrder = (id: string) => state.order.indexOf(id)
  const pieces = free ? [...plan.pieces].sort((a, b) => stableOrder(photos[a.index]?.id ?? '') - stableOrder(photos[b.index]?.id ?? '')) : plan.pieces

  return (
    <div className="grid gap-3">
      <div className="grid place-items-center">
        <div
          ref={frame}
          role="group"
          aria-label={`Prévia da colagem, ${plan.width} por ${plan.height} pixels`}
          onPointerDown={backgroundDown}
          className={cx(
            'relative overflow-hidden shadow-2 ring-1 ring-border-strong select-none [container-type:inline-size]',
            '[--collage-max-h:min(58dvh,36rem)] lg:[--collage-max-h:calc(100dvh-15rem)]',
            disabled && 'pointer-events-none opacity-60',
          )}
          style={{
            aspectRatio: `${plan.width} / ${plan.height}`,
            width: `min(100%, calc(var(--collage-max-h) * ${plan.width / plan.height}))`,
            backgroundColor: plan.background,
          }}
        >
          {pieces.map((piece) => {
            const photo = photos[piece.index]
            if (!photo) return null
            const position = state.order.indexOf(photo.id)
            return free ? (
              <FreePhoto
                key={photo.id}
                photo={photo}
                piece={piece}
                frameWidth={plan.width}
                frameHeight={plan.height}
                shadow={plan.shadow}
                depth={piece.index}
                position={position}
                selected={selected === photo.id}
                disabled={disabled}
                hintId={hintId}
                onPointerDown={(event) => startMove(event, photo)}
                onPointerMove={movePhoto}
                onPointerUp={endMove}
                onClick={() => tapPhoto(photo, position)}
                onKeyDown={(event) => photoKeyDown(event, photo)}
                onHandleDown={(event) => startHandle(event, photo)}
                onHandleMove={moveHandle}
                onHandleUp={endHandle}
              />
            ) : (
              <GridCell
                // Pela posição: depois de trocar, o foco continua no espaço tocado.
                key={piece.index}
                photo={photo}
                piece={piece}
                frameWidth={plan.width}
                frameHeight={plan.height}
                position={piece.index}
                total={photos.length}
                selected={selected === photo.id}
                swapping={Boolean(selected) && selected !== photo.id}
                swapKey={swaps.ids.includes(photo.id) ? swaps.count : 0}
                disabled={disabled}
                hintId={hintId}
                onPointerDown={(event) => startPan(event, photo, piece)}
                onPointerMove={movePan}
                onPointerUp={endPan}
                onClick={() => tapCell(photo, piece.index)}
                onKeyDown={(event) => cellKeyDown(event, photo, piece)}
              />
            )
          })}
        </div>
      </div>

      <div className="flex min-h-11 flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <p id={hintId} className="max-w-sm min-w-0 flex-1 basis-56 text-center text-xs text-fg-muted text-pretty">
          {hintFor(free, Boolean(selectedPhoto))}
        </p>
        {selectedPhoto && selectedPiece && (
          <div role="toolbar" aria-label="Ajustar a foto marcada" className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface-1 p-1">
            {free ? (
              <>
                <IconButton icon={ZoomOut} label="Diminuir" disabled={disabled} onClick={() => nudge(selectedPhoto, { width: selectedPhoto.placement.width / SIZE_STEP })} />
                <IconButton icon={ZoomIn} label="Aumentar" disabled={disabled} onClick={() => nudge(selectedPhoto, { width: selectedPhoto.placement.width * SIZE_STEP })} />
                <IconButton icon={RotateCcw} label="Girar para a esquerda" disabled={disabled} onClick={() => nudge(selectedPhoto, { rotation: selectedPhoto.placement.rotation - 15 })} />
                <IconButton icon={RotateCw} label="Girar para a direita" disabled={disabled} onClick={() => nudge(selectedPhoto, { rotation: selectedPhoto.placement.rotation + 15 })} />
                <IconButton icon={SendToBack} label="Mandar para trás" disabled={disabled} onClick={() => dispatch({ type: 'back', id: selectedPhoto.id })} />
              </>
            ) : (
              <>
                <IconButton icon={ZoomOut} label="Afastar" disabled={disabled || selectedPhoto.framing.zoom <= 1} onClick={() => zoomSelected(-ZOOM_STEP)} />
                <IconButton icon={ZoomIn} label="Aproximar" disabled={disabled || selectedPhoto.framing.zoom >= 4} onClick={() => zoomSelected(ZOOM_STEP)} />
                <IconButton
                  icon={Crosshair}
                  label="Centralizar"
                  disabled={disabled}
                  onClick={() => dispatch({ type: 'framing', id: selectedPhoto.id, framing: DEFAULT_FRAMING })}
                />
              </>
            )}
            <IconButton icon={Check} label="Concluir" tooltipAlign="end" disabled={disabled} onClick={() => dispatch({ type: 'select' })} />
          </div>
        )}
      </div>
    </div>
  )
}

function hintFor(free: boolean, selected: boolean): string {
  if (free) {
    return selected
      ? 'Arraste para mover. A alça do canto, ou dois dedos, gira e muda o tamanho.'
      : 'Toque numa foto para mover, girar e mudar o tamanho.'
  }
  return selected ? 'Toque em outra foto para trocar as duas de lugar.' : 'Toque numa foto e depois em outra para trocar de lugar. Arraste para enquadrar.'
}

interface PieceHandlers {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void
  onClick: () => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
}

interface GridCellProps extends PieceHandlers {
  photo: CollagePhotoView
  piece: PlannedPiece
  frameWidth: number
  frameHeight: number
  position: number
  total: number
  selected: boolean
  /** Há outra foto marcada: tocar nesta troca as duas. */
  swapping: boolean
  /** Muda a cada troca que envolveu esta foto: a foto entra com um pequeno destaque. */
  swapKey: number
  disabled: boolean
  hintId: string
}

function GridCell({ photo, piece, frameWidth, frameHeight, position, total, selected, swapping, swapKey, disabled, hintId, ...handlers }: GridCellProps) {
  const { box, source } = piece
  const left = box.cx - box.width / 2
  const top = box.cy - box.height / 2
  // A parte que aparece ocupa o espaço inteiro: a foto toda fica maior que ele, deslocada.
  const image: CSSProperties = {
    width: pct(photo.width, source.width),
    height: pct(photo.height, source.height),
    left: pct(-source.x, source.width),
    top: pct(-source.y, source.height),
  }
  return (
    <button
      type="button"
      aria-label={`Foto ${position + 1} de ${total}: ${photo.name}`}
      aria-pressed={selected}
      aria-describedby={hintId}
      disabled={disabled}
      {...handlers}
      onPointerCancel={handlers.onPointerUp}
      className={cx(
        'group/cell absolute cursor-grab touch-none overflow-hidden bg-surface-3 outline-none active:cursor-grabbing',
        // Contorno por dentro (o quadro corta o que passa da borda): marcada, no acento; com o teclado, claro.
        'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:transition-shadow after:duration-(--dur-2)',
        selected ? 'after:shadow-[inset_0_0_0_3px_var(--color-accent)]' : 'focus-visible:after:shadow-[inset_0_0_0_3px_var(--color-fg)]',
        swapping && 'hover:pointer-fine:after:shadow-[inset_0_0_0_2px_var(--color-fg)]',
      )}
      style={{
        left: pct(left, frameWidth),
        top: pct(top, frameHeight),
        width: pct(box.width, frameWidth),
        height: pct(box.height, frameHeight),
        borderRadius: cqw(piece.radius, frameWidth),
      }}
    >
      <img
        key={`${photo.id}-${swapKey}`}
        src={photo.previewUrl}
        alt=""
        draggable={false}
        className={cx('pointer-events-none absolute max-w-none select-none', swapKey > 0 && 'animate-pop')}
        style={image}
      />
      {selected && (
        // O símbolo de troca, no meio da foto marcada: o próximo toque em outra foto troca as duas.
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center animate-pop">
          <span className="grid size-12 place-items-center rounded-full bg-bg/70 text-white shadow-2 ring-2 ring-white/85">
            <Icon icon={ArrowLeftRight} />
          </span>
        </span>
      )}
    </button>
  )
}

interface FreePhotoProps extends PieceHandlers {
  photo: CollagePhotoView
  piece: PlannedPiece
  frameWidth: number
  frameHeight: number
  shadow: Collage['plan']['shadow']
  depth: number
  position: number
  selected: boolean
  disabled: boolean
  hintId: string
  onHandleDown: (event: PointerEvent<HTMLSpanElement>) => void
  onHandleMove: (event: PointerEvent<HTMLSpanElement>) => void
  onHandleUp: (event: PointerEvent<HTMLSpanElement>) => void
}

function FreePhoto({
  photo,
  piece,
  frameWidth,
  frameHeight,
  shadow,
  depth,
  position,
  selected,
  disabled,
  hintId,
  onHandleDown,
  onHandleMove,
  onHandleUp,
  ...handlers
}: FreePhotoProps) {
  const { box, border } = piece
  const outerWidth = box.width + 2 * border
  const outerHeight = box.height + 2 * border
  const framed = border > 0 || Boolean(shadow)
  return (
    <button
      type="button"
      aria-label={`Foto ${position + 1}: ${photo.name}`}
      aria-pressed={selected}
      aria-describedby={hintId}
      disabled={disabled}
      {...handlers}
      onPointerCancel={handlers.onPointerUp}
      className={cx(
        'absolute cursor-grab touch-none active:cursor-grabbing',
        'outline-offset-[3px] focus-visible:outline-3 focus-visible:outline-fg',
        selected && 'outline-solid outline-2 outline-accent focus-visible:outline-3 focus-visible:outline-accent',
      )}
      style={{
        left: pct(box.cx - outerWidth / 2, frameWidth),
        top: pct(box.cy - outerHeight / 2, frameHeight),
        width: pct(outerWidth, frameWidth),
        height: pct(outerHeight, frameHeight),
        transform: `rotate(${box.rotation}deg)`,
        zIndex: depth + 1,
        padding: cqw(border, frameWidth),
        borderRadius: cqw(outerRadius(piece), frameWidth),
        backgroundColor: framed ? '#ffffff' : undefined,
        boxShadow: shadow ? `0 ${cqw(shadow.offsetY, frameWidth)} ${cqw(shadow.blur, frameWidth)} ${shadow.color}` : undefined,
      }}
    >
      <img
        src={photo.previewUrl}
        alt=""
        draggable={false}
        className="pointer-events-none block size-full select-none object-cover"
        style={{ borderRadius: cqw(piece.radius, frameWidth) }}
      />
      {selected && !disabled && (
        // Alça do canto: arrastar gira e muda o tamanho em volta do centro (o teclado e os botões fazem o mesmo).
        <span
          aria-hidden="true"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
          className="absolute right-0 bottom-0 grid size-7 translate-x-1/2 translate-y-1/2 cursor-nwse-resize touch-none place-items-center rounded-full border-2 border-accent bg-white text-accent-solid shadow-2 before:absolute before:-inset-2.5 before:content-['']"
        >
          <Icon icon={Maximize2} size="sm" className="rotate-90" />
        </span>
      )}
    </button>
  )
}
