import { ImagePlus } from 'lucide-react'
import { useRef } from 'react'
import { cx } from '../../components/ui/cx'
import { Icon } from '../../components/ui/Icon'
import { OPEN_ACCEPT } from '../../features/open/accept'

interface DropPanelProps {
  onFiles: (files: File[]) => void
  /** Arquivo arrastado sobre a página: o contorno fica no acento. */
  dragging: boolean
  className?: string
}

/**
 * Computador: área grande de soltar a foto ou o vídeo, ao lado do título. Clicar também abre o seletor;
 * soltar funciona em qualquer ponto da página.
 */
export function DropPanel({ onFiles, dragging, className }: DropPanelProps) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        data-dragover={dragging || undefined}
        onClick={() => input.current?.click()}
        className={cx(
          'drop-target group grid min-h-64 place-items-center rounded-xl px-8 py-10 text-center hover:pointer-fine:bg-surface-2',
          className,
        )}
      >
        <span className="grid justify-items-center gap-4">
          <span
            aria-hidden="true"
            className="grid size-14 place-items-center rounded-full bg-surface-3 text-fg transition-colors duration-(--dur-2) group-data-dragover:bg-accent-solid group-data-dragover:text-on-accent"
          >
            <Icon icon={ImagePlus} size="lg" />
          </span>
          <span className="grid gap-1">
            <span className="text-label text-fg">Solte uma foto ou um vídeo aqui</span>
            <span className="text-secondary text-fg-muted">ou clique para escolher no computador</span>
          </span>
          <span className="text-caption font-normal text-fg-subtle">Fotos em JPG, PNG e WEBP. Vídeos em MP4, MOV e WEBM, até 1 GB.</span>
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
