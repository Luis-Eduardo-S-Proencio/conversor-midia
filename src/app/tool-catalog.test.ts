import { describe, expect, it } from 'vitest'
import { VIDEO_TOOLS } from './tool-catalog'

describe('catálogo de ferramentas', () => {
  it('GIF fica na aba Vídeos, ainda em breve (sem rota)', () => {
    const gif = VIDEO_TOOLS.find((tool) => tool.id === 'video-gif')
    expect(gif?.title).toBe('Criar GIF')
    expect(gif?.to).toBeUndefined()
  })
})
