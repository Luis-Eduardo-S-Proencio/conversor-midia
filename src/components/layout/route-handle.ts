/** Metadados que uma rota pode declarar em `handle` para ajustar o shell. */
export interface RouteHandle {
  /**
   * Tela de editor (ferramenta): no celular a barra inferior dá lugar à barra da própria ferramenta;
   * no computador a barra lateral fica estreita, para sobrar espaço para a foto ou o vídeo.
   */
  editor?: boolean
}

export function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null
}
