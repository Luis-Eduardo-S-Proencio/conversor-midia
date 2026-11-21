import { describe, expect, it } from 'vitest'
import { videoOutputName } from './output-name'

describe('videoOutputName', () => {
  it('acrescenta o sufixo e usa a extensão do formato, em minúsculas', () => {
    expect(videoOutputName('praia.MOV', 'mov', '-trecho')).toBe('praia-trecho.mov')
    expect(videoOutputName('aula 3.mp4', 'mp4', '-recortado')).toBe('aula 3-recortado.mp4')
    expect(videoOutputName('clipe.m4v', 'mp4', '-trecho')).toBe('clipe-trecho.mp4')
    expect(videoOutputName('tela.webm', 'webm', '-trecho')).toBe('tela-trecho.webm')
  })

  it('limpa o nome como nas imagens e usa "video" quando não sobra nome', () => {
    expect(videoOutputName('C:\\videos\\a<b>.mp4', 'mp4', '-trecho')).toBe('a_b_-trecho.mp4')
    expect(videoOutputName('.mp4', 'mp4', '-trecho')).toBe('video-trecho.mp4')
    expect(videoOutputName(`${'a'.repeat(200)}.webm`, 'webm', '-recortado')).toBe(`${'a'.repeat(120)}-recortado.webm`)
  })
})
