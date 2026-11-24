import { cx } from '../ui/cx'
import { LOGO_BLADE_PATHS, LOGO_VIEWBOX } from './logo-geometry'

interface LogoMarkProps {
  className?: string
}

/**
 * Símbolo "Obturador" num ladrilho com o degradê da marca, como um ícone de app.
 * O degradê é CSS (sem id de SVG), então vários símbolos na mesma página não conflitam.
 * Decorativo: o nome vem do texto ao lado ou do link que o envolve.
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <span aria-hidden="true" className={cx('inline-block shrink-0 rounded-[26%] bg-brand', className)}>
      <svg viewBox={LOGO_VIEWBOX} focusable="false" className="block size-full">
        {LOGO_BLADE_PATHS.map((path) => (
          <path key={path} d={path} className="fill-fg forced-colors:fill-[CanvasText]" />
        ))}
      </svg>
    </span>
  )
}

const SIZES = {
  sm: { mark: 'size-6', text: 'text-sm' },
  md: { mark: 'size-8', text: 'text-lg' },
} as const

interface LogoProps {
  size?: keyof typeof SIZES
  className?: string
}

/** Assinatura completa: símbolo + "Media Tools", com "Tools" em peso e cor secundários. */
export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <span className={cx('inline-flex items-center gap-2.5 font-bold tracking-tight text-fg', SIZES[size].text, className)}>
      <LogoMark className={SIZES[size].mark} />
      <span>
        Media <span className="font-medium text-fg-muted">Tools</span>
      </span>
    </span>
  )
}
