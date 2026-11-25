import { useId, type ReactNode } from 'react'
import { Button } from './Button'
import { useModalDialog } from './useModalDialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** Ação que perde algo (ex.: "Descartar"): botão de perigo. */
  destructive?: boolean
  onConfirm: () => void
  /** Cancelar: botão, Esc, toque no fundo, voltar do Android. */
  onCancel: () => void
}

/**
 * Pergunta de confirmação (ex.: "Descartar edição?"). O foco começa em cancelar, a opção segura,
 * e volta a quem abriu ao fechar.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const { ref: dialogRef, onCancel: handleCancel, onClick: handleBackdropClick } = useModalDialog(open, onCancel)

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className="modal-dialog"
    >
      <div className="modal-panel grid gap-5 rounded-xl border border-border-strong bg-surface-2 p-5 text-fg shadow-2">
        <div className="grid gap-1.5">
          <h2 id={titleId} className="text-section">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="text-secondary text-fg-muted">
              {description}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button autoFocus onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'secondary' : 'primary'}
            onClick={onConfirm}
            className={destructive ? 'text-danger not-disabled:hover:bg-danger-subtle' : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
