import { LogoMark } from '../components/brand/Logo'

/**
 * Mostrado enquanto o código de uma página carregada sob demanda chega, quando ela é aberta
 * direto pelo endereço. Evita a tela em branco nesse instante.
 */
export function RouteLoading() {
  return (
    <div role="status" className="grid min-h-dvh place-content-center justify-items-center gap-3">
      <LogoMark className="size-8 animate-pulse" />
      <p className="text-sm text-fg-muted">Carregando…</p>
    </div>
  )
}
