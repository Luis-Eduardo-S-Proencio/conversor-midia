import { Film, Image as ImageIcon, type LucideIcon } from 'lucide-react'
import type { MediaKind } from '../../core/media-kind'
import { cx } from './cx'
import { Icon } from './Icon'

/** Categoria da ferramenta: define a cor do ícone. Só quatro, a mesma na imagem e no vídeo. */
export type ToolTone = 'edit' | 'convert' | 'compress' | 'audio'

// Classes completas (o Tailwind só gera as que aparecem escritas no código).
const TONES: Record<ToolTone, string> = {
  edit: 'bg-cat-edit/12 text-cat-edit',
  convert: 'bg-cat-convert/12 text-cat-convert',
  compress: 'bg-cat-compress/12 text-cat-compress',
  audio: 'bg-cat-audio/12 text-cat-audio',
}

const SIZES = {
  sm: { box: 'size-8 rounded-sm', icon: 'sm', badge: 'size-4 -right-1 -bottom-1' },
  md: { box: 'size-10 rounded-md', icon: 'md', badge: 'size-4.5 -right-1 -bottom-1' },
  lg: { box: 'size-14 rounded-lg', icon: 'lg', badge: 'size-5.5 -right-1 -bottom-1' },
} as const

const MEDIA_ICONS: Record<MediaKind, LucideIcon> = { image: ImageIcon, video: Film }

interface ToolIconProps {
  icon: LucideIcon
  tone: ToolTone
  size?: keyof typeof SIZES
  /**
   * Selo de imagem ou vídeo no canto: diferencia as duas versões da mesma ação
   * (Recortar imagem × Recortar vídeo), que usam o mesmo ícone.
   */
  media?: MediaKind
  /**
   * Nome de View Transition: o mesmo nome no cartão e no título da ferramenta faz o ícone "voar" de
   * um para o outro na troca de página. Único por página.
   */
  transitionName?: string
  className?: string
}

/** Ícone de ferramenta num ladrilho da cor da categoria. Decorativo: o nome fica no texto ao lado. */
export function ToolIcon({ icon, tone, size = 'md', media, transitionName, className }: ToolIconProps) {
  const dimensions = SIZES[size]
  return (
    <span
      aria-hidden="true"
      className={cx('relative grid shrink-0 place-items-center', dimensions.box, TONES[tone], className)}
      style={transitionName ? { viewTransitionName: transitionName } : undefined}
    >
      <Icon icon={icon} size={dimensions.icon} />
      {media && (
        <span
          data-media={media}
          className={cx('absolute grid place-items-center rounded-full border border-bg bg-surface-3 text-fg-muted', dimensions.badge)}
        >
          <Icon icon={MEDIA_ICONS[media]} size="sm" className="size-[62%]" />
        </span>
      )}
    </span>
  )
}
