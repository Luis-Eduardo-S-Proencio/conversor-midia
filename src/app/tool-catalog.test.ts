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
})
