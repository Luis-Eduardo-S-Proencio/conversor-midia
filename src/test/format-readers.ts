/**
 * Leitores mínimos dos formatos que o app escreve (TIFF, GIF, ICO e PDF). Os testes conferem
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

/* GIF */

/** Descompactação LZW do GIF (códigos de largura variável, bits do menos significativo). */
export function lzwDecode(data: Uint8Array, minCodeSize: number, pixelCount: number): Uint8Array<ArrayBuffer> {
  const clearCode = 1 << minCodeSize
  const endCode = clearCode + 1
  const prefix = new Int32Array(4096)
  const suffix = new Uint8Array(4096)
  const first = new Uint8Array(4096)
  const length = new Int32Array(4096)
  for (let code = 0; code < clearCode; code += 1) {
    prefix[code] = -1
    suffix[code] = code
    first[code] = code
    length[code] = 1
  }
  const output = new Uint8Array(pixelCount)
  let written = 0
  const emit = (code: number) => {
    const size = length[code] ?? 0
    if (written + size > pixelCount) throw new Error('Mais pixels que o tamanho da imagem')
    let cursor = code
    for (let index = size - 1; index >= 0; index -= 1) {
      output[written + index] = suffix[cursor] ?? 0
      cursor = prefix[cursor] ?? -1
    }
    written += size
  }

  let codeSize = minCodeSize + 1
  let nextCode = clearCode + 2
  let previous = -1
  let bit = 0
  while (bit + codeSize <= data.length * 8) {
    let code = 0
    for (let index = 0; index < codeSize; index += 1) {
      code |= (((data[(bit + index) >> 3] ?? 0) >> ((bit + index) & 7)) & 1) << index
    }
    bit += codeSize
    if (code === clearCode) {
      codeSize = minCodeSize + 1
      nextCode = clearCode + 2
      previous = -1
      continue
    }
    if (code === endCode) {
      if (written !== pixelCount) throw new Error(`Fim com ${written} de ${pixelCount} pixels`)
      return output
    }
    if (previous === -1) {
      if (code >= clearCode) throw new Error('O primeiro código depois de "limpar" deve ser um pixel')
      emit(code)
      previous = code
      continue
    }
    if (code > nextCode) throw new Error(`Código LZW inválido: ${code}`)
    if (nextCode < 4096) {
      prefix[nextCode] = previous
      // Código ainda não definido (caso "KwKwK"): a sequência anterior mais o próprio primeiro pixel.
      suffix[nextCode] = code < nextCode ? (first[code] ?? 0) : (first[previous] ?? 0)
      first[nextCode] = first[previous] ?? 0
      length[nextCode] = (length[previous] ?? 0) + 1
      nextCode += 1
      if (nextCode === 1 << codeSize && codeSize < 12) codeSize += 1
    }
    emit(code)
    previous = code
  }
  throw new Error('Dados LZW sem código de fim')
}

/** Junta os sub-blocos (tamanho + até 255 bytes) e confere que nenhum passa do limite. */
export function joinSubBlocks(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const parts: Uint8Array[] = []
  let position = 0
  while (position < bytes.length) {
    const size = bytes[position] ?? 0
    if (size === 0) throw new Error('Sub-bloco vazio no meio dos dados')
    parts.push(bytes.subarray(position + 1, position + 1 + size))
    position += size + 1
  }
  if (position !== bytes.length) throw new Error('Sub-bloco cortado')
  return concat(...parts)
}

export interface GifFrameInfo {
  x: number
  y: number
  width: number
  height: number
  /** Em centésimos de segundo. */
  delay: number
  disposal: number
  transparentIndex?: number
  /** A tela inteira depois de desenhar este quadro sobre os anteriores (transparente = 0, 0, 0, 0). */
  rgba: Uint8Array<ArrayBuffer>
}

export interface GifInfo {
  width: number
  height: number
  palette: Array<[number, number, number]>
  /** Repetições pedidas pela extensão NETSCAPE2.0 (0 = sem fim); ausente quando não há. */
  loops?: number
  minCodeSize: number
  frames: GifFrameInfo[]
}

/**
 * Leitor de GIF89a com paleta global, quadros que ocupam só parte da tela e transparência, como o app
 * grava. Cada quadro é desenhado sobre o anterior ("não descartar"), e o leitor devolve a tela resultante.
 */
export function decodeGif(bytes: Uint8Array): GifInfo {
  if (latin1.decode(bytes.subarray(0, 6)) !== 'GIF89a') throw new Error('Cabeçalho GIF inválido')
  const view = viewOf(bytes)
  const width = view.getUint16(6, true)
  const height = view.getUint16(8, true)
  const screenFlags = bytes[10] ?? 0
  let position = 13
  const palette: Array<[number, number, number]> = []
  if (screenFlags & 0x80) {
    const size = 2 << (screenFlags & 7)
    for (let index = 0; index < size; index += 1, position += 3) {
      palette.push([bytes[position] ?? 0, bytes[position + 1] ?? 0, bytes[position + 2] ?? 0])
    }
  }
  let loops: number | undefined
  let control = { delay: 0, disposal: 0, transparentIndex: undefined as number | undefined }
  let minCodeSize = 0
  const frames: GifFrameInfo[] = []
  let canvas = new Uint8Array(width * height * 4)

  while (position < bytes.length) {
    const marker = bytes[position]
    if (marker === 0x3b) {
      if (position !== bytes.length - 1) throw new Error('Bytes depois do fim do GIF')
      if (frames.length === 0) throw new Error('GIF sem imagem')
      return { width, height, palette, loops, minCodeSize, frames }
    }
    if (marker === 0x21) {
      const label = bytes[position + 1]
      position += 2
      if (label === 0xf9) {
        const flags = bytes[position + 1] ?? 0
        control = {
          delay: view.getUint16(position + 2, true),
          disposal: (flags >> 2) & 7,
          transparentIndex: flags & 1 ? bytes[position + 4] : undefined,
        }
      }
      if (label === 0xff && latin1.decode(bytes.subarray(position + 1, position + 12)) === 'NETSCAPE2.0') {
        loops = view.getUint16(position + 14, true)
      }
      while ((bytes[position] ?? 0) !== 0) position += (bytes[position] ?? 0) + 1
      position += 1
      continue
    }
    if (marker !== 0x2c) throw new Error(`Bloco GIF inesperado: ${marker}`)
    const x = view.getUint16(position + 1, true)
    const y = view.getUint16(position + 3, true)
    const frameWidth = view.getUint16(position + 5, true)
    const frameHeight = view.getUint16(position + 7, true)
    if (x + frameWidth > width || y + frameHeight > height) throw new Error('Quadro fora da tela')
    if (((bytes[position + 9] ?? 0) & 0xc0) !== 0) throw new Error('Tabela local ou entrelaçamento não esperados')
    position += 10
    minCodeSize = bytes[position] ?? 0
    position += 1
    const start = position
    while ((bytes[position] ?? 0) !== 0) position += (bytes[position] ?? 0) + 1
    const indices = lzwDecode(joinSubBlocks(bytes.subarray(start, position)), minCodeSize, frameWidth * frameHeight)
    position += 1
    if (control.disposal !== 0 && control.disposal !== 1) throw new Error(`Descarte não esperado: ${control.disposal}`)
    canvas = canvas.slice()
    indices.forEach((index, pixel) => {
      if (index === control.transparentIndex) return
      const color = palette[index]
      if (!color) throw new Error(`Índice fora da paleta: ${index}`)
      const at = ((y + Math.floor(pixel / frameWidth)) * width + x + (pixel % frameWidth)) * 4
      canvas.set([...color, 255], at)
    })
    frames.push({ x, y, width: frameWidth, height: frameHeight, ...control, rgba: canvas })
    control = { delay: 0, disposal: 0, transparentIndex: undefined }
  }
  throw new Error('GIF sem o byte de fim')
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
