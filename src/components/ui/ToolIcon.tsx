import type { LucideIcon } from 'lucide-react'
import { cx } from './cx'
import { Icon } from './Icon'

/** Tipo de ferramenta: define a cor do ícone, a mesma na imagem e no vídeo. */
export type ToolTone = 'edit' | 'crop' | 'rotate' | 'gif' | 'convert' | 'audio' | 'compress' | 'size'

// Classes completas (o Tailwind só gera as que aparecem escritas no código).
const TONES: Record<ToolTone, string> = {
  edit: 'bg-tool-edit/15 text-tool-edit',
  crop: 'bg-tool-crop/15 text-tool-crop',
  rotate: 'bg-tool-rotate/15 text-tool-rotate',
  gif: 'bg-tool-gif/15 text-tool-gif',
  convert: 'bg-tool-convert/15 text-tool-convert',
  audio: 'bg-tool-audio/15 text-tool-audio',
  compress: 'bg-tool-compress/15 text-tool-compress',
  size: 'bg-tool-size/15 text-tool-size',
}

const SIZES = {
  md: { box: 'size-10 rounded-md', icon: 'md' },
  lg: { box: 'size-14 rounded-lg', icon: 'lg' },
} as const

interface ToolIconProps {
  icon: LucideIcon
  tone: ToolTone
  size?: keyof typeof SIZES
  className?: string
}

/** Ícone de ferramenta num ladrilho do mesmo tom. Decorativo: o nome fica no texto ao lado. */
export function ToolIcon({ icon, tone, size = 'md', className }: ToolIconProps) {
  return (
    <span aria-hidden="true" className={cx('grid shrink-0 place-items-center', SIZES[size].box, TONES[tone], className)}>
      <Icon icon={icon} size={SIZES[size].icon} />
    </span>
  )
}
