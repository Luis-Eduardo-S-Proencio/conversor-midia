import { describe, expect, it } from 'vitest'
import { IMAGE_TOOLS, VIDEO_TOOLS } from './tool-catalog'

describe('catálogo de ferramentas', () => {
  it('GIF fica na aba Vídeos, ainda em breve (sem rota)', () => {
    const gif = VIDEO_TOOLS.find((tool) => tool.id === 'video-gif')
    expect(gif?.title).toBe('Criar GIF')
    expect(gif?.to).toBeUndefined()
  })

  it('Redimensionar imagem está disponível, com rota própria', () => {
    const resize = IMAGE_TOOLS.find((tool) => tool.id === 'image-resize')
    expect(resize?.to).toBe('/imagens/redimensionar')
    expect(resize?.description).toBe('Por porcentagem ou em pixels')
  })

  it('Girar e espelhar está disponível, com rota própria', () => {
    expect(IMAGE_TOOLS.find((tool) => tool.id === 'image-rotate-flip')?.to).toBe('/imagens/girar')
  })

  it('Recortar imagem está disponível, com rota própria', () => {
    expect(IMAGE_TOOLS.find((tool) => tool.id === 'image-crop')?.to).toBe('/imagens/recortar')
  })

  it('todas as ferramentas de imagem da primeira versão estão disponíveis', () => {
    expect(IMAGE_TOOLS.filter((tool) => !tool.to)).toEqual([])
  })

  it('Cortar trecho, Recortar vídeo, Comprimir vídeo e Extrair áudio estão disponíveis, primeiro na lista; as demais de vídeo, em breve', () => {
    expect(VIDEO_TOOLS.find((tool) => tool.id === 'video-trim')?.to).toBe('/videos/cortar')
    expect(VIDEO_TOOLS.find((tool) => tool.id === 'video-crop')?.to).toBe('/videos/recortar')
    expect(VIDEO_TOOLS.find((tool) => tool.id === 'video-compress')?.to).toBe('/videos/comprimir')
    expect(VIDEO_TOOLS.find((tool) => tool.id === 'video-audio')?.to).toBe('/videos/extrair-audio')
    expect(VIDEO_TOOLS.slice(0, 4).map((tool) => tool.id)).toEqual(['video-trim', 'video-crop', 'video-compress', 'video-audio'])
    expect(VIDEO_TOOLS.filter((tool) => tool.to)).toHaveLength(4)
  })
})
