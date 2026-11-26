import { describe, expect, it } from 'vitest'
import { IMAGE_TOOLS, RECOMMENDED_TOOL, VIDEO_TOOLS, toolByPath, toolsFor, toolsForOpened } from './tool-catalog'

describe('catálogo de ferramentas', () => {
  it('GIF fica na aba Vídeos, com rota própria', () => {
    const gif = VIDEO_TOOLS.find((tool) => tool.id === 'video-gif')
    expect(gif?.title).toBe('Criar GIF')
    expect(gif?.to).toBe('/videos/gif')
  })

  it('Redimensionar imagem está disponível, com rota própria', () => {
    const resize = IMAGE_TOOLS.find((tool) => tool.id === 'image-resize')
    expect(resize?.to).toBe('/imagens/redimensionar')
    expect(resize?.description).toBe('Em porcentagem ou em pixels')
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

  it('"O que fazer com este arquivo?": no vídeo, o editor primeiro; com várias imagens, só as de lote', () => {
    expect(toolsForOpened('video', 1).map((tool) => tool.id)).toEqual([
      'video-edit',
      'video-compress',
      'video-convert',
      'video-audio',
      'video-resize',
      'video-crop',
      'video-gif',
    ])
    expect(RECOMMENDED_TOOL.video).toBe('video-edit')
    expect(toolsForOpened('image', 1)).toHaveLength(5)
    expect(toolsForOpened('image', 3).map((tool) => tool.id)).not.toContain('image-crop')
    // A colagem só aparece com pelo menos 2 fotos abertas.
    expect(toolsForOpened('image', 1).map((tool) => tool.id)).not.toContain('image-collage')
    expect(toolsForOpened('image', 2).map((tool) => tool.id)).toContain('image-collage')
  })

  it('a ferramenta de cada endereço, para o título e a troca de ferramenta', () => {
    expect(toolByPath('/videos/comprimir')?.title).toBe('Comprimir vídeo')
    expect(toolByPath('/videos')).toBeUndefined()
  })

  it('a descrição cabe numa linha da lista no celular de 360 px', () => {
    for (const tool of [...IMAGE_TOOLS, ...VIDEO_TOOLS]) expect(tool.description.length, tool.title).toBeLessThanOrEqual(32)
  })

  it('cada ferramenta diz o tipo de arquivo que abre, e o tipo leva às ferramentas certas', () => {
    expect(IMAGE_TOOLS.every((tool) => tool.media === 'image' && tool.to.startsWith('/imagens/'))).toBe(true)
    expect(VIDEO_TOOLS.every((tool) => tool.media === 'video' && tool.to.startsWith('/videos/'))).toBe(true)
    expect(toolsFor('image')).toBe(IMAGE_TOOLS)
    expect(toolsFor('video')).toBe(VIDEO_TOOLS)
  })

  it('todas as ferramentas de vídeo planejadas estão disponíveis', () => {
    expect(VIDEO_TOOLS.find((tool) => tool.id === 'video-edit')?.to).toBe('/videos/editar')
    expect(VIDEO_TOOLS.find((tool) => tool.id === 'video-crop')?.to).toBe('/videos/recortar')
    expect(VIDEO_TOOLS.find((tool) => tool.id === 'video-compress')?.to).toBe('/videos/comprimir')
    expect(VIDEO_TOOLS.find((tool) => tool.id === 'video-audio')?.to).toBe('/videos/extrair-audio')
    expect(VIDEO_TOOLS.find((tool) => tool.id === 'video-resize')?.to).toBe('/videos/resolucao')
    expect(VIDEO_TOOLS.find((tool) => tool.id === 'video-convert')?.to).toBe('/videos/converter')
    expect(VIDEO_TOOLS.slice(0, 6).map((tool) => tool.id)).toEqual(['video-edit', 'video-crop', 'video-compress', 'video-audio', 'video-resize', 'video-convert'])
    expect(VIDEO_TOOLS.filter((tool) => !tool.to)).toEqual([])
  })
})
