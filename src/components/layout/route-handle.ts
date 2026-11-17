/** Metadados que uma rota pode declarar em `handle` para ajustar o shell. */
export interface RouteHandle {
  /** Telas de ferramenta trocam a barra inferior pela própria barra de ação. */
  hideBottomNav?: boolean
}

export function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null
}
