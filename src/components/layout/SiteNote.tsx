import { cx } from '../ui/cx'

// Calculado uma vez, fora do render: o ano não muda durante uma visita.
const CURRENT_YEAR = new Date().getFullYear()

/**
 * O que sobrou do rodapé de site: uma linha discreta no fim do Início e do Sobre, só no computador.
 * No app (celular, instalado) a navegação já está nas abas, e um rodapé daria cara de site.
 */
export function SiteNote({ className }: { className?: string }) {
  return (
    <p className={cx('hidden border-t border-border pt-5 text-caption font-normal text-fg-subtle lg:block', className)}>
      © {CURRENT_YEAR} Media Tools · Fotos e vídeos processados no seu aparelho, sem enviar nada.
    </p>
  )
}
