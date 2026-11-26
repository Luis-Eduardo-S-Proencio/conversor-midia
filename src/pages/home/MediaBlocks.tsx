import { Film, Image as ImageIcon, type LucideIcon } from 'lucide-react'
import { useId, useRef } from 'react'
import { cx } from '../../components/ui/cx'
import { Icon } from '../../components/ui/Icon'
import { IMAGE_ACCEPT, VIDEO_ACCEPT } from '../open/accept'

interface BlockProps {
  icon: LucideIcon
  title: string
  text: string
  accept: string
  multiple: boolean
  onFiles: (files: File[]) => void
}

/** Bloco grande que abre o seletor do sistema já filtrado (galeria de vídeos ou de fotos, no celular). */
function PickerBlock({ icon, title, text, accept, multiple, onFiles }: BlockProps) {
  const input = useRef<HTMLInputElement>(null)
  const descriptionId = useId()
  return (
    <>
      {/* Nome "Abrir vídeo" (o visível "Vídeo" com o verbo para o leitor de tela); o resto é descrição. */}
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-describedby={descriptionId}
        className="pressable surface-card grid min-h-35 content-between gap-4 rounded-xl p-4 text-left hover:pointer-fine:border-border-strong"
      >
        <span aria-hidden="true" className="grid size-12 place-items-center rounded-lg bg-accent-soft text-accent">
          <Icon icon={icon} size="lg" />
        </span>
        <span className="grid gap-0.5">
          <span className="font-display text-section text-fg">
            <span className="sr-only">Abrir </span>
            {title}
          </span>
          <span id={descriptionId} aria-hidden="true" className="text-secondary text-fg-muted">
            {text}
          </span>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? [])
          if (files.length > 0) onFiles(files)
          event.currentTarget.value = '' // permite escolher o mesmo arquivo de novo
        }}
      />
    </>
  )
}

/** Celular e tablet: os dois pontos de partida, Vídeo e Imagem, como nos apps de edição. */
export function MediaBlocks({ onFiles, className }: { onFiles: (files: File[]) => void; className?: string }) {
  return (
    <div className={cx('grid grid-cols-2 gap-3', className)}>
      <PickerBlock icon={Film} title="Vídeo" text="Editar, comprimir, converter" accept={VIDEO_ACCEPT} multiple={false} onFiles={onFiles} />
      <PickerBlock icon={ImageIcon} title="Imagem" text="Converter, comprimir, recortar" accept={IMAGE_ACCEPT} multiple onFiles={onFiles} />
    </div>
  )
}
