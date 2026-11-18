import { Upload } from 'lucide-react'
import { useId, useRef, useState, type DragEvent, type ReactNode, type Ref } from 'react'
import { cx } from '../ui/cx'
import { Icon } from '../ui/Icon'
import { FilePickerButton } from './FilePickerButton'

interface DropzoneProps {
  /** Filtro do seletor do sistema (ex.: "image/jpeg,image/png"). Não substitui a validação do conteúdo. */
  accept: string
  onFiles: (files: File[]) => void
  multiple?: boolean
  buttonLabel?: string
  dragLabel?: string
  hint?: ReactNode
  disabled?: boolean
  className?: string
  /** Permite levar o foco ao botão (ex.: ao recomeçar, quando o botão anterior some). */
  buttonRef?: Ref<HTMLButtonElement>
}

function carriesFiles(event: DragEvent): boolean {
  return event.dataTransfer.types.includes('Files')
}

/**
 * Seleção de arquivos. O botão abre o seletor do sistema (galeria ou arquivos no celular);
 * arrastar e soltar é um atalho para quem usa mouse, e o texto sobre ele só aparece nesse caso.
 */
export function Dropzone({
  accept,
  onFiles,
  multiple = true,
  buttonLabel = 'Selecionar arquivos',
  dragLabel = 'Arraste arquivos para cá',
  hint,
  disabled = false,
  className,
  buttonRef,
}: DropzoneProps) {
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const hintId = useId()

  function deliver(files: File[]) {
    if (files.length === 0) return
    onFiles(multiple ? files : files.slice(0, 1))
  }

  // Contar entradas e saídas evita piscar ao passar sobre elementos internos.
  function handleDragEnter(event: DragEvent) {
    if (disabled || !carriesFiles(event)) return
    event.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  function handleDragOver(event: DragEvent) {
    if (disabled || !carriesFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  function handleDragLeave() {
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (!disabled) deliver(Array.from(event.dataTransfer.files))
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-dragging={dragging || undefined}
      className={cx(
        'grid justify-items-center gap-3 rounded-lg border-2 border-dashed border-border-strong bg-surface px-5 py-8 text-center transition-colors',
        'data-dragging:border-accent data-dragging:bg-accent-subtle',
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-surface-raised text-fg-muted">
        <Icon icon={Upload} />
      </span>
      <p className="hidden font-semibold text-fg pointer-fine:block">{dragLabel}</p>
      <FilePickerButton
        ref={buttonRef}
        variant="primary"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
        onFiles={deliver}
      >
        {buttonLabel}
      </FilePickerButton>
      {hint && (
        <p id={hintId} className="text-xs text-fg-subtle">
          {hint}
        </p>
      )}
    </div>
  )
}
