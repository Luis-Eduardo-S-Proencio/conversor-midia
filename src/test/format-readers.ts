/**
 * Leitores mínimos dos formatos que o app escreve (TIFF, ICO e PDF). Os testes conferem
 * estrutura e pixels com eles, sem depender do mesmo código que gerou o arquivo.
 */
import { concat } from './image-bytes'

// Decodificação de 1 byte por caractere: a posição no texto é a posição no arquivo.
const latin1 = new TextDecoder('latin1')

const viewOf = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

/* TIFF */

export interface TiffInfo {
  tags: Map<number, number[]>
  /** Na ordem em que aparecem: a especificação exige ordem crescente. */
  tagOrder: number[]
  nextIfd: number
  width: number
  height: number
  samplesPerPixel: number
  /** Conteúdo das faixas (strips) concatenado. */
  pixels: Uint8Array<ArrayBuffer>
}

export function readTiff(bytes: Uint8Array): TiffInfo {
  const view = viewOf(bytes)
  if (latin1.decode(bytes.subarray(0, 2)) !== 'II' || view.getUint16(2, true) !== 42) throw new Error('Não é um TIFF little-endian')
  const ifd = view.getUint32(4, true)
  const count = view.getUint16(ifd, true)
  const tags = new Map<number, number[]>()
  const tagOrder: number[] = []
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + index * 12
    const tag = view.getUint16(entry, true)
    const type = view.getUint16(entry + 2, true)
    const length = view.getUint32(entry + 4, true)
    const size = type === 3 ? 2 : type === 5 ? 8 : 4
    const base = size * length <= 4 ? entry + 8 : view.getUint32(entry + 8, true)
    const values: number[] = []
    for (let k = 0; k < length; k += 1) {
      if (type === 3) values.push(view.getUint16(base + k * 2, true))
      else if (type === 4) values.push(view.getUint32(base + k * 4, true))
      else if (type === 5) values.push(view.getUint32(base + k * 8, true), view.getUint32(base + k * 8 + 4, true))
      else throw new Error(`Tipo de campo TIFF inesperado: ${type}`)
    }
    tags.set(tag, values)
    tagOrder.push(tag)
  }
  const single = (tag: number) => {
    const value = tags.get(tag)?.[0]
    if (value === undefined) throw new Error(`Campo TIFF ${tag} ausente`)
    return value
  }
  const offsets = tags.get(273) ?? []
  const counts = tags.get(279) ?? []
  const pixels = concat(...offsets.map((offset, index) => bytes.subarray(offset, offset + (counts[index] ?? 0))))
  return {
    tags,
    tagOrder,
    nextIfd: view.getUint32(ifd + 2 + count * 12, true),
    width: single(256),
    height: single(257),
    samplesPerPixel: single(277),
    pixels,
  }
}

/* ICO */

export interface IcoEntry {
  width: number
  height: number
  planes: number
  bitCount: number
  data: Uint8Array
}

export function readIco(bytes: Uint8Array): IcoEntry[] {
  const view = viewOf(bytes)
  if (view.getUint16(0, true) !== 0 || view.getUint16(2, true) !== 1) throw new Error('Cabeçalho ICO inválido')
  return Array.from({ length: view.getUint16(4, true) }, (_, index) => {
    const entry = 6 + index * 16
    const size = view.getUint32(entry + 8, true)
    const offset = view.getUint32(entry + 12, true)
    if (offset + size > bytes.length) throw new Error('Imagem do ICO fora do arquivo')
    return {
      width: bytes[entry] || 256,
      height: bytes[entry + 1] || 256,
      planes: view.getUint16(entry + 4, true),
      bitCount: view.getUint16(entry + 6, true),
      data: bytes.subarray(offset, offset + size),
    }
  })
}

/* PDF */

export interface PdfInfo {
  version: string
  objectCount: number
  mediaBox: number[]
  /** Comandos da página (stream de conteúdo). */
  content: string
  image: { width: number; height: number; filter: string; colorSpace: string; bytes: Uint8Array }
}

/** Confere a tabela xref (cada objeto onde ela diz) e extrai a imagem embutida. */
export function readPdf(bytes: Uint8Array): PdfInfo {
  const text = latin1.decode(bytes)
  const version = /^%PDF-(\d\.\d)\n/.exec(text)?.[1]
  if (!version) throw new Error('Cabeçalho PDF inválido')
  const startxref = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(text)?.[1])
  if (!text.startsWith('xref\n', startxref)) throw new Error('startxref não aponta para a tabela xref')
  const table = /^xref\n0 (\d+)\n/.exec(text.slice(startxref))
  if (!table) throw new Error('Tabela xref inválida')
  const size = Number(table[1])
  let position = startxref + table[0].length
  for (let object = 0; object < size; object += 1, position += 20) {
    const line = text.slice(position, position + 20)
    if (!/^\d{10} \d{5} [fn] \n$/.test(line)) throw new Error(`Linha xref inválida: ${JSON.stringify(line)}`)
    if (object > 0 && !text.startsWith(`${object} 0 obj\n`, Number(line.slice(0, 10)))) throw new Error(`Objeto ${object} fora do lugar`)
  }
  if (!text.startsWith('trailer\n', position)) throw new Error('Trailer ausente')

  const subtype = text.indexOf('/Subtype /Image')
  const dictionary = text.slice(text.lastIndexOf('<<', subtype), text.indexOf('>>', subtype))
  const number = (key: string) => Number(new RegExp(`/${key} (\\d+)`).exec(dictionary)?.[1])
  const name = (key: string) => new RegExp(`/${key} /(\\w+)`).exec(dictionary)?.[1] ?? ''
  const streamStart = text.indexOf('stream\n', subtype) + 'stream\n'.length
  const streamLength = number('Length')
  if (!text.startsWith('\nendstream', streamStart + streamLength)) throw new Error('/Length não confere com o stream')

  const contentMatch = /\/Contents (\d+) 0 R/.exec(text)
  const contentObject = text.indexOf(`${contentMatch?.[1]} 0 obj\n`)
  const contentStart = text.indexOf('stream\n', contentObject) + 'stream\n'.length
  return {
    version,
    objectCount: size - 1,
    mediaBox: (/\/MediaBox \[([^\]]+)\]/.exec(text)?.[1] ?? '').trim().split(/\s+/).map(Number),
    content: text.slice(contentStart, text.indexOf('\nendstream', contentStart)),
    image: {
      width: number('Width'),
      height: number('Height'),
      filter: name('Filter'),
      colorSpace: name('ColorSpace'),
      bytes: bytes.subarray(streamStart, streamStart + streamLength),
    },
  }
}
