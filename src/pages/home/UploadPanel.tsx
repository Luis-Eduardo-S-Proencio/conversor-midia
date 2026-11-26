import { Upload } from 'lucide-react'
import { useRef } from 'react'
import { cx } from '../../components/ui/cx'
import { Icon } from '../../components/ui/Icon'
import { OPEN_ACCEPT } from '../../features/open/accept'

interface UploadPanelProps {
  onFiles: (files: File[]) => void
  /** Arquivo arrastado sobre a página: as cantoneiras se fecham no acento. */
  dragging: boolean
  className?: string
}

/**
 * Computador: área grande de abrir arquivo, com cantos de visor de câmera no lugar da borda tracejada.
 * Clicar abre o seletor; arrastar funciona em qualquer ponto da página.
 */
export function UploadPanel({ onFiles, dragging, className }: UploadPanelProps) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        data-dragover={dragging || undefined}
        onClick={() => input.current?.click()}
        className={cx('viewfinder group grid min-h-72 place-items-center rounded-xl px-8 py-10 text-center', className)}
      >
        <span className="grid justify-items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-14 place-items-center rounded-lg bg-surface-3 text-fg transition-[translate,color] duration-(--dur-2) group-hover:-translate-y-0.5 group-data-dragover:-translate-y-1 group-data-dragover:text-accent"
          >
            <Icon icon={Upload} size="lg" />
          </span>
          <span className="grid gap-1">
            <span className="text-section text-fg">Arraste um arquivo</span>
            <span className="text-secondary text-fg-muted">ou clique para abrir</span>
          </span>
          <span className="text-caption font-normal text-fg-subtle tabular-nums">JPG, PNG, WEBP · MP4, MOV, WEBM até 1 GB</span>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept={OPEN_ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? [])
          if (files.length > 0) onFiles(files)
          event.currentTarget.value = ''
        }}
      />
    </>
  )
}
