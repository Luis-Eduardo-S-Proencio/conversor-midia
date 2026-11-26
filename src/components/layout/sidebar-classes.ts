/**
 * Item da barra lateral do computador (link ou botão): 40 px com mouse, 44 px com toque.
 * O atual (aria-current) fica com o fundo suave do acento e o ícone no acento.
 */
export const SIDEBAR_LINK =
  'pressable group/item relative flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-fg-muted ' +
  'pointer-coarse:h-11 hover:bg-surface-2 hover:text-fg focus-visible:-outline-offset-2 ' +
  'aria-[current=page]:bg-accent-soft aria-[current=page]:text-fg ' +
  'forced-colors:aria-[current=page]:underline forced-colors:aria-[current=page]:underline-offset-4'

/** Texto do item: uma linha, cortado com reticências se faltar espaço. */
export const SIDEBAR_LABEL = 'min-w-0 flex-1 truncate text-left'
