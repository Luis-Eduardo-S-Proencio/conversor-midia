import { cx } from '../ui/cx'
import { LOGO_FRAME_PATH, LOGO_PIECE_PATH, LOGO_VIEWBOX } from './logo-geometry'

interface LogoMarkProps {
  className?: string
}

/** Símbolo "Recorte". Decorativo: o nome vem do texto ao lado ou do link que o envolve. */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg viewBox={LOGO_VIEWBOX} aria-hidden="true" focusable="false" className={cx('shrink-0', className)}>
      <path d={LOGO_FRAME_PATH} className="fill-accent" />
      <path d={LOGO_PIECE_PATH} className="fill-accent-soft" />
    </svg>
  )
}

const SIZES = {
  sm: { mark: 'size-5', text: 'text-sm' },
  md: { mark: 'size-7', text: 'text-lg' },
} as const

interface LogoProps {
  size?: keyof typeof SIZES
  className?: string
}

/** Assinatura completa: símbolo + "Media Tools", com "Tools" em peso e cor secundários. */
export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <span className={cx('inline-flex items-center gap-2.5 font-semibold tracking-tight text-fg', SIZES[size].text, className)}>
      <LogoMark className={SIZES[size].mark} />
      <span>
        Media <span className="font-medium text-fg-muted">Tools</span>
      </span>
    </span>
  )
}
