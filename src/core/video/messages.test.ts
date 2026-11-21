import { describe, expect, it } from 'vitest'
import { VIDEO_ERROR_CODES, videoErrorMessage, videoRejectionMessage } from './messages'

describe('videoRejectionMessage', () => {
  it('explica a recusa em linguagem simples', () => {
    expect(videoRejectionMessage({ code: 'empty' })).toBe('O arquivo está vazio.')
    expect(videoRejectionMessage({ code: 'too-large', maxBytes: 1024 ** 3 })).toBe('O vídeo tem mais de 1 GB, o limite por arquivo.')
    expect(videoRejectionMessage({ code: 'unsupported-format', formatName: 'AVI' })).toBe('AVI não é aceito. Use MP4, MOV ou WEBM.')
    expect(videoRejectionMessage({ code: 'unsupported-format' })).toBe('Formato não suportado. Use MP4, MOV ou WEBM.')
  })

  it('diz o que o arquivo é quando não é vídeo', () => {
    expect(videoRejectionMessage({ code: 'unsupported-format', formatName: 'JPG', category: 'image' })).toBe(
      'Este arquivo é uma imagem (JPG). Escolha um vídeo MP4, MOV ou WEBM.',
    )
    expect(videoRejectionMessage({ code: 'unsupported-format', formatName: 'MP3', category: 'audio' })).toBe(
      'Este arquivo é só áudio (MP3). Escolha um vídeo MP4, MOV ou WEBM.',
    )
  })
})

describe('videoErrorMessage', () => {
  it('toda falha tem mensagem, sem detalhe técnico', () => {
    for (const code of VIDEO_ERROR_CODES) {
      const message = videoErrorMessage(code)
      expect(message.length).toBeGreaterThan(20)
      expect(message).not.toMatch(/error|exception|undefined/i)
    }
  })
})
