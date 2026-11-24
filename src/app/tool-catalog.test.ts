import { describe, expect, it } from 'vitest'
import { IMAGE_TOOLS, TOOL_GROUPS, VIDEO_TOOLS, switcherTools, toolsFor } from './tool-catalog'

describe('catálogo de ferramentas', () => {
  it('GIF fica na aba Vídeos, com rota própria', () => {
    const gif = VIDEO_TOOLS.find((tool) => tool.id === 'video-gif')
    expect(gif?.title).toBe('Criar GIF')
    expect(gif?.to).toBe('/videos/gif')
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

  it('os grupos do início mostram cada ferramenta exatamente uma vez', () => {
    const grouped = TOOL_GROUPS.flatMap((group) => group.tools.map((tool) => tool.id)).sort()
    const all = [...IMAGE_TOOLS, ...VIDEO_TOOLS].map((tool) => tool.id).sort()
    expect(grouped).toEqual(all)
    expect(TOOL_GROUPS.map((group) => group.title)).toEqual(['Editar', 'Converter', 'Deixar menor'])
  })

  it('cada ferramenta diz o tipo de arquivo que abre, e o tipo leva às ferramentas certas', () => {
    expect(IMAGE_TOOLS.every((tool) => tool.media === 'image' && tool.to.startsWith('/imagens/'))).toBe(true)
    expect(VIDEO_TOOLS.every((tool) => tool.media === 'video' && tool.to.startsWith('/videos/'))).toBe(true)
    expect(toolsFor('image')).toBe(IMAGE_TOOLS)
    expect(toolsFor('video')).toBe(VIDEO_TOOLS)
  })

  it('a troca de ferramenta do editor usa uma palavra por ferramenta, na ordem do catálogo', () => {
    expect(switcherTools('image').map((tool) => tool.label)).toEqual(['Converter', 'Comprimir', 'Tamanho', 'Recortar', 'Girar'])
    expect(switcherTools('video').map((tool) => tool.label)).toEqual(['Editar', 'Recortar', 'Comprimir', 'Áudio', 'Resolução', 'Converter', 'GIF'])
    expect(switcherTools('video').every((tool) => tool.to.startsWith('/videos/'))).toBe(true)
  })

  it('o nome curto do celular cabe em duas linhas da grade', () => {
    for (const tool of [...IMAGE_TOOLS, ...VIDEO_TOOLS]) {
      expect(tool.shortTitle.split(' ').every((word) => word.length <= 13), tool.shortTitle).toBe(true)
    }
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
