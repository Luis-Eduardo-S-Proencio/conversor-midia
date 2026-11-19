import { describe, expect, it } from 'vitest'
import { outputFileName, uniqueFileNames } from './output-name'

describe('outputFileName', () => {
  it('troca a extensão pela do formato de saída', () => {
    expect(outputFileName('foto.png', 'jpeg')).toBe('foto.jpg')
    expect(outputFileName('foto.JPEG', 'png')).toBe('foto.png')
    expect(outputFileName('foto', 'webp')).toBe('foto.webp')
  })

  it('usa a extensão dos formatos gerados pelo app', () => {
    expect(outputFileName('foto.png', 'pdf')).toBe('foto.pdf')
    expect(outputFileName('foto.png', 'tiff')).toBe('foto.tiff')
    expect(outputFileName('logo.png', 'ico')).toBe('logo.ico')
  })

  it('mantém os pontos internos do nome', () => {
    expect(outputFileName('ferias.2026.final.png', 'jpeg')).toBe('ferias.2026.final.jpg')
  })

  it('troca caracteres proibidos e de controle', () => {
    expect(outputFileName('a<b>c:d"e|f?g*h.png', 'jpeg')).toBe('a_b_c_d_e_f_g_h.jpg')
    expect(outputFileName('linha\nnova\u0000.png', 'jpeg')).toBe('linha_nova_.jpg')
  })

  it('descarta qualquer caminho antes do nome', () => {
    expect(outputFileName('C:\\fotos\\praia.png', 'jpeg')).toBe('praia.jpg')
    expect(outputFileName('../pasta/praia.png', 'jpeg')).toBe('praia.jpg')
  })

  it('remove pontos e espaços no fim, que o Windows não aceita', () => {
    expect(outputFileName('foto. .png', 'jpeg')).toBe('foto.jpg')
  })

  it('evita nomes reservados do Windows', () => {
    expect(outputFileName('CON.png', 'jpeg')).toBe('CON_.jpg')
    expect(outputFileName('com1.png', 'png')).toBe('com1_.png')
  })

  it('usa "imagem" quando não sobra nome', () => {
    expect(outputFileName('.png', 'jpeg')).toBe('imagem.jpg')
    expect(outputFileName('   .png', 'jpeg')).toBe('imagem.jpg')
  })

  it('limita o nome a 120 caracteres sem partir emojis', () => {
    expect(outputFileName(`${'a'.repeat(200)}.png`, 'jpeg')).toBe(`${'a'.repeat(120)}.jpg`)
    expect(outputFileName(`${'😀'.repeat(130)}.png`, 'jpeg')).toBe(`${'😀'.repeat(120)}.jpg`)
  })

  it('normaliza acentos para a forma composta', () => {
    expect(outputFileName('cafe\u0301.png', 'jpeg')).toBe('caf\u00e9.jpg')
  })
})

describe('uniqueFileNames', () => {
  it('numera repetidos, sem diferenciar maiúsculas', () => {
    expect(uniqueFileNames(['a.jpg', 'A.jpg', 'a.jpg'])).toEqual(['a.jpg', 'A (2).jpg', 'a (3).jpg'])
  })

  it('evita nomes já usados', () => {
    expect(uniqueFileNames(['a.jpg'], ['a.jpg', 'a (2).jpg'])).toEqual(['a (3).jpg'])
  })

  it('não colide com um nome que já tem número', () => {
    expect(uniqueFileNames(['a (2).jpg', 'a.jpg', 'a.jpg'])).toEqual(['a (2).jpg', 'a.jpg', 'a (3).jpg'])
  })
})
