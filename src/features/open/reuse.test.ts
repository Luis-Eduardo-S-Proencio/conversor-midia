import { describe, expect, it } from 'vitest'
import { canReuse } from './reuse'

describe('canReuse', () => {
  it('só resultados que as ferramentas abrem seguem para outra ferramenta', () => {
    expect(canReuse('image', ['praia.jpg', 'logo.png', 'foto.webp'])).toBe(true)
    expect(canReuse('image', ['praia.jpg', 'documento.pdf'])).toBe(false)
    expect(canReuse('image', ['icone.ico'])).toBe(false)
    expect(canReuse('video', ['ferias-comprimido.mp4'])).toBe(true)
    expect(canReuse('video', ['ferias-audio.mp3'])).toBe(false)
    expect(canReuse('image', [])).toBe(false)
  })
})
