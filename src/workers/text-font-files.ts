/**
 * Arquivos das fontes dos textos (só as letras do português), servidos pelo próprio site. Usados pela prévia
 * (thread principal) e pelo Worker de vídeo, que registram a fonte só quando um texto a usa.
 */
import interUrl from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url'
import bebasUrl from '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2?url'
import caveatUrl from '@fontsource/caveat/files/caveat-latin-700-normal.woff2?url'
import courierUrl from '@fontsource/courier-prime/files/courier-prime-latin-700-normal.woff2?url'
import dancingUrl from '@fontsource/dancing-script/files/dancing-script-latin-700-normal.woff2?url'
import fredokaUrl from '@fontsource/fredoka/files/fredoka-latin-600-normal.woff2?url'
import playfairUrl from '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2?url'
import { fontOf, type TextFontId } from '../core/video/text'

const FILES: Record<TextFontId, string> = {
  inter: interUrl,
  cursiva: dancingUrl,
  classica: playfairUrl,
  maquina: courierUrl,
  redonda: fredokaUrl,
  condensada: bebasUrl,
  caneta: caveatUrl,
}

interface FontRegistry {
  add(face: FontFace): unknown
}

/**
 * Registra e carrega a fonte uma vez por lugar (página ou Worker). Sem suporte a fontes (alguns Safari no
 * Worker), o texto sai na reserva da lista (`family`), sem erro.
 */
export function textFontLoader(registry: FontRegistry | undefined) {
  const loading = new Map<TextFontId, Promise<void>>()
  return (id: TextFontId = 'inter'): Promise<void> => {
    const cached = loading.get(id)
    if (cached) return cached
    const task = (async () => {
      if (typeof FontFace === 'undefined' || !registry) return
      const font = fontOf(id)
      try {
        const face = new FontFace(font.face, `url(${FILES[id]})`, { weight: font.weight ? String(font.weight) : '100 900' })
        registry.add(await face.load())
      } catch (error) {
        if (import.meta.env.DEV) console.error(error) // sem a fonte, o texto sai na reserva
      }
    })()
    loading.set(id, task)
    return task
  }
}
