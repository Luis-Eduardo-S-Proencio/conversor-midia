import { describe, expect, it } from 'vitest'
import { PROCESSING_ERROR_CODES, batchLimitMessage, processingErrorMessage, rejectionMessage, webpFallbackNote } from './messages'

describe('rejectionMessage', () => {
  it('explica cada motivo de recusa em linguagem simples', () => {
    expect(rejectionMessage({ code: 'empty' })).toBe('O arquivo está vazio.')
    expect(rejectionMessage({ code: 'too-large', maxBytes: 50 * 1024 * 1024 })).toBe(
      'O arquivo tem mais de 50 MB, o limite por arquivo.',
    )
    expect(rejectionMessage({ code: 'unsupported-format', formatName: 'GIF' })).toBe(
      'GIF não é aceito. Use JPG, PNG ou WEBP.',
    )
    expect(rejectionMessage({ code: 'unsupported-format' })).toBe('Formato não suportado. Use JPG, PNG ou WEBP.')
    expect(rejectionMessage({ code: 'corrupt' })).toBe('Não foi possível ler a imagem. O arquivo pode estar corrompido.')
    expect(rejectionMessage({ code: 'too-many-pixels', megapixels: 64.24, maxMegapixels: 50 })).toBe(
      'A imagem tem 64,2 megapixels; o limite é 50.',
    )
  })

  it('para HEIC, ensina o caminho que funciona no iPhone', () => {
    expect(rejectionMessage({ code: 'unsupported-format', formatName: 'HEIC' })).toBe(
      'Fotos HEIC não são aceitas. No iPhone, escolha a foto pela galeria: ela chega como JPG.',
    )
  })
})

describe('processingErrorMessage', () => {
  it('tem mensagem própria, sem código técnico, para cada erro de processamento', () => {
    for (const code of PROCESSING_ERROR_CODES) {
      const message = processingErrorMessage(code)
      expect(message.length).toBeGreaterThan(10)
      expect(message).not.toContain(code)
    }
  })

  it('falta de memória do aparelho sugere uma saída', () => {
    expect(processingErrorMessage('canvas-unavailable')).toMatch(/memória/)
  })
})

describe('batchLimitMessage', () => {
  it('diz quantos ficaram de fora e por quê', () => {
    expect(batchLimitMessage(1, 20)).toBe('1 arquivo ficou de fora: o limite é de 20 arquivos por vez.')
    expect(batchLimitMessage(3, 20)).toBe('3 arquivos ficaram de fora: o limite é de 20 arquivos por vez.')
  })

  it('ferramenta de uma imagem por vez explica isso, sem "1 arquivos"', () => {
    expect(batchLimitMessage(2, 1)).toBe('2 arquivos ficaram de fora: esta ferramenta trabalha com uma imagem por vez.')
  })
})

describe('webpFallbackNote', () => {
  it('explica por que um WEBP saiu em outro formato (Safari, que não gera WEBP)', () => {
    expect(webpFallbackNote('jpeg')).toBe('Este navegador não gera WEBP: a imagem saiu em JPG.')
    expect(webpFallbackNote('png')).toBe('Este navegador não gera WEBP: a imagem saiu em PNG.')
  })
})
