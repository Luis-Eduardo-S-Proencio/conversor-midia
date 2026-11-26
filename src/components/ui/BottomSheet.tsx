import { Check, X } from 'lucide-react'
import { useId, useRef, type PointerEvent, type ReactNode } from 'react'
import { IconButton } from './Button'
import { cx } from './cx'
import { useModalDialog } from './useModalDialog'

interface BottomSheetProps {
  open: boolean
  /** Fechar sem aplicar: ✕, Esc, toque no fundo, arrastar para baixo, voltar do Android. */
  onClose: () => void
  title: string
  description?: ReactNode
  /** Painel de ferramenta: mostra o ✓, que aplica (e o pai fecha). */
  onApply?: () => void
  applyLabel?: string
  closeLabel?: string
  /** Rodapé fixo (ex.: botão principal). */
  footer?: ReactNode
  children?: ReactNode
  className?: string
}

/** Arrastar além disto (px), ou rápido além de FLING_DISTANCE, fecha. */
const CLOSE_DISTANCE = 120
const FLING_DISTANCE = 40
const FLING_SPEED = 0.6 // px/ms

/**
 * Painel que sobe de baixo: raio 24 no topo, alça, até 85% da altura da tela.
 * Fecha arrastando a alça (ou o título) para baixo. A partir de 768 px fica centralizado embaixo,
 * com largura limitada.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  onApply,
  applyLabel = 'Aplicar',
  closeLabel = 'Cancelar',
  footer,
  children,
  className,
}: BottomSheetProps) {
  const titleId = useId()
  const descriptionId = useId()
  const { ref: dialogRef, onCancel: handleCancel, onClick: handleBackdropClick } = useModalDialog(open, onClose)
  const panel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; startTime: number; offset: number } | null>(null)

  function setOffset(offset: number) {
    const element = panel.current
    if (!element) return
    element.style.translate = offset > 0 ? `0 ${offset}px` : ''
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    // Só o botão principal do mouse, dedo ou caneta; e não quando o toque começa num botão.
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startY: event.clientY, startTime: event.timeStamp, offset: 0 }
    panel.current?.setAttribute('data-dragging', '')
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state) return
    // Para cima, resiste (o painel não descola do chão).
    const delta = event.clientY - state.startY
    state.offset = delta > 0 ? delta : delta / 6
    setOffset(state.offset)
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state) return
    drag.current = null
    panel.current?.removeAttribute('data-dragging')
    const elapsed = Math.max(1, event.timeStamp - state.startTime)
    const fling = state.offset > FLING_DISTANCE && state.offset / elapsed > FLING_SPEED
    if (state.offset > CLOSE_DISTANCE || fling) {
      // Continua descendo a partir de onde o dedo soltou; depois de fechado, volta ao lugar.
      if (panel.current) panel.current.style.translate = '0 100%'
      onClose()
      window.setTimeout(() => setOffset(0), 260)
      return
    }
    setOffset(0)
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className="sheet-dialog"
    >
      <div
        ref={panel}
        className={cx(
          'sheet-panel flex max-h-[85dvh] w-full flex-col rounded-t-xl border border-b-0 border-border-strong bg-surface-1 text-fg shadow-sheet',
          'pb-[env(safe-area-inset-bottom)] md:mb-4 md:rounded-xl md:border-b md:pb-0',
          className,
        )}
      >
        <div
          className="shrink-0 cursor-grab touch-none px-4 pt-2 pb-3 select-none active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span aria-hidden="true" className="mx-auto block h-1 w-9 rounded-full bg-fg-subtle/60" />
          <div className="mt-2 flex min-h-11 items-center gap-2">
            <IconButton icon={X} label={closeLabel} onClick={onClose} className="-ml-2" />
            <div className="min-w-0 flex-1 text-center">
              <h2 id={titleId} className="truncate font-sans text-base font-semibold">
                {title}
              </h2>
            </div>
            {onApply ? (
              <IconButton icon={Check} label={applyLabel} variant="primary" size="sm" onClick={onApply} className="-mr-1 rounded-full" />
            ) : (
              <span aria-hidden="true" className="size-11 shrink-0" />
            )}
          </div>
          {description && (
            <p id={descriptionId} className="mt-1 text-center text-secondary text-fg-muted">
              {description}
            </p>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-border px-4 pt-3 pb-4">{footer}</div>}
      </div>
    </dialog>
  )
}
