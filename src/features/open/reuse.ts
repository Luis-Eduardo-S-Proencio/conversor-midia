import type { MediaKind } from '../../core/media-kind'

/** Extensões que as ferramentas abrem: só esses resultados podem seguir para outra ferramenta. */
const REUSABLE: Record<MediaKind, RegExp> = {
  image: /\.(jpe?g|png|webp)$/i,
  video: /\.(mp4|mov|webm)$/i,
}

/** O resultado pode ir para outra ferramenta (ex.: converter e depois comprimir)? */
export function canReuse(kind: MediaKind, names: readonly string[]): boolean {
  return names.length > 0 && names.every((name) => REUSABLE[kind].test(name))
}
