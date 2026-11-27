import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'
import { cx } from '../../../components/ui/cx'
import { canvasMeasure, drawText, layoutText, textsAt, type TextCanvas, type TextFontId, type TextLayout, type VideoText } from '../../../core/video/text'
import { ensureTextFont } from './text-fonts'

/** Retângulo onde o quadro do vídeo aparece dentro do player (o vídeo é encaixado sem cortar). */
interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/** Onde o quadro aparece: o player mostra o vídeo inteiro, com faixas pretas onde sobra espaço. */
function contentRect(video: HTMLVideoElement): Rect | null {
  const { videoWidth, videoHeight, clientWidth, clientHeight } = video
  if (!videoWidth || !videoHeight || !clientWidth || !clientHeight) return null
  const scale = Math.min(clientWidth / videoWidth, clientHeight / videoHeight)
  const width = videoWidth * scale
  const height = videoHeight * scale
  return {
    left: video.offsetLeft + video.clientLeft + (clientWidth - width) / 2,
    top: video.offsetTop + video.clientTop + (clientHeight - height) / 2,
    width,
    height,
  }
}

/** Mede o player a cada mudança de tamanho e quando o vídeo carrega. */
function useContentRect(video: RefObject<HTMLVideoElement | null>): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null)
  useLayoutEffect(() => {
    const element = video.current
    if (!element) return
    const measure = () => setRect(contentRect(element))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    element.addEventListener('loadedmetadata', measure)
    return () => {
      observer.disconnect()
      element.removeEventListener('loadedmetadata', measure)
    }
  }, [video])
  return rect
}

/** Carrega os pesos da fonte usados pelos textos antes de desenhar (o canvas não espera a fonte sozinho). */
function useFontsReady(texts: readonly VideoText[]): number {
  const [version, setVersion] = useState(0)
  const fonts = [...new Set(texts.map((text) => text.font ?? 'inter'))].join('|')
  useEffect(() => {
    if (!fonts) return
    let alive = true
    Promise.all(fonts.split('|').map((font) => ensureTextFont(font as TextFontId))).then(
      () => alive && setVersion((value) => value + 1),
      (error: unknown) => {
        if (import.meta.env.DEV) console.error(error) // sem a fonte, o texto aparece na do sistema
      },
    )
    return () => {
      alive = false
    }
  }, [fonts])
  return version
}

/** Passo das setas ao mover um texto: 1% do quadro; com Shift, 5%. */
const keyStep = (shift: boolean) => (shift ? 0.05 : 0.01)

interface TextLayerProps {
  video: RefObject<HTMLVideoElement | null>
  texts: readonly VideoText[]
  /** Instante do vídeo original que o player mostra. */
  sourceTime: number
  selectedId?: number
  onSelect: (id: number) => void
  onMove: (id: number, x: number, y: number) => void
  disabled: boolean
}

/**
 * Os textos por cima do player, desenhados pelas mesmas funções que o Worker usa em cada quadro do arquivo.
 * Por cima do desenho, cada texto visível tem uma área de toque: tocar abre o texto, arrastar o move, e as
 * setas também o movem.
 */
export function TextLayer({ video, texts, sourceTime, selectedId, onSelect, onMove, disabled }: TextLayerProps) {
  const rect = useContentRect(video)
  const canvas = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ id: number; pointerId: number; x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null)
  const frame = useRef(0)
  const suppressClick = useRef(false)
  const fontsVersion = useFontsReady(texts)
  // Tocando, o tempo muda a cada quadro, mas o desenho só muda quando entra ou sai um texto (ou quando os textos mudam).
  const visibleIds = textsAt(texts, sourceTime)
    .map((text) => text.id)
    .join(',')
  const visible = useMemo(() => {
    const ids = new Set(visibleIds.split(',').filter(Boolean).map(Number))
    return texts.filter((text) => ids.has(text.id))
  }, [texts, visibleIds])
  const [layouts, setLayouts] = useState<Map<number, TextLayout>>(new Map())
  const ratio = typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1)

  // Desenha a cada mudança (tempo, textos, tamanho do player). O quadro de desenho tem a densidade da tela.
  useLayoutEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context || !rect) return
    const width = Math.max(1, Math.round(rect.width * ratio))
    const height = Math.max(1, Math.round(rect.height * ratio))
    if (element.width !== width) element.width = width
    if (element.height !== height) element.height = height
    context.clearRect(0, 0, width, height)
    const target = context as unknown as TextCanvas
    const measure = canvasMeasure(target)
    const next = new Map<number, TextLayout>()
    for (const text of visible) {
      const layout = layoutText(text, { width, height }, measure)
      drawText(target, text, layout)
      next.set(text.id, layout)
    }
    setLayouts(next)
  }, [rect, ratio, fontsVersion, visible])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  function startDrag(event: PointerEvent<HTMLButtonElement>, text: VideoText) {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { id: text.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: text.x, startY: text.y, moved: false }
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId || !rect) return
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    if (!current.moved && Math.hypot(dx, dy) < 4) return
    current.moved = true
    const x = Math.min(1, Math.max(0, current.startX + dx / rect.width))
    const y = Math.min(1, Math.max(0, current.startY + dy / rect.height))
    // Um movimento por quadro de tela.
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => onMove(current.id, x, y))
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    drag.current = null
    if (current.moved) suppressClick.current = true
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, text: VideoText) {
    const step = keyStep(event.shiftKey)
    const moves: Partial<Record<string, [number, number]>> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const move = moves[event.key]
    if (!move || disabled) return
    event.preventDefault()
    onMove(text.id, Math.min(1, Math.max(0, text.x + move[0])), Math.min(1, Math.max(0, text.y + move[1])))
  }

  if (!rect) return null
  return (
    <div aria-hidden={visible.length === 0 || undefined} className="pointer-events-none absolute" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}>
      <canvas ref={canvas} className="absolute inset-0 size-full" />
      {visible.map((text) => {
        const layout = layouts.get(text.id)
        if (!layout) return null
        const { bounds } = layout
        const selected = text.id === selectedId
        return (
          <button
            key={text.id}
            type="button"
            aria-label={`Texto: ${text.text || 'sem texto'}`}
            aria-pressed={selected}
            disabled={disabled}
            onPointerDown={(event) => startDrag(event, text)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false
                return
              }
              onSelect(text.id)
            }}
            onKeyDown={(event) => handleKeyDown(event, text)}
            className={cx(
              'pointer-events-auto absolute cursor-grab touch-none rounded-md active:cursor-grabbing',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg',
              selected && 'outline-solid outline-2 outline-offset-2 outline-accent shadow-[0_0_0_4px_rgb(0_0_0/0.25)]',
            )}
            style={{ left: bounds.x / ratio, top: bounds.y / ratio, width: bounds.width / ratio, height: bounds.height / ratio }}
          />
        )
      })}
    </div>
  )
}
