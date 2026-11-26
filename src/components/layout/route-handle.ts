/**
 * Como o shell trata a tela:
 * - `root`: Início, Imagens e Vídeos. Cabeçalho com o menu (☰) e a marca; no celular, abas embaixo.
 * - `page`: tela interna comum (Sobre, licenças, página não encontrada). Só a barra superior com voltar.
 * - `tool`: ferramenta. Só a barra superior com voltar (modo foco).
 * - `editor`: tela cheia, sem nenhuma barra do site (a própria tela traz o que precisa).
 */
export type ShellLayout = 'root' | 'page' | 'tool' | 'editor'

/** Metadados que uma rota pode declarar em `handle` para ajustar o shell. */
export interface RouteHandle {
  layout?: ShellLayout
}

export function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null
}

/** O layout da rota mais específica que declarou um; sem declaração, `page`. */
export function layoutOf(handles: readonly unknown[]): ShellLayout {
  for (let index = handles.length - 1; index >= 0; index--) {
    const handle = handles[index]
    if (isRouteHandle(handle) && handle.layout) return handle.layout
  }
  return 'page'
}
