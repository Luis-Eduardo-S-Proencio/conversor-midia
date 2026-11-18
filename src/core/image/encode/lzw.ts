/**
 * Compactação LZW do GIF, no algoritmo clássico do "compress" do Unix usado pelos codificadores
 * de GIF: códigos de largura variável (até 12 bits), gravados a partir do bit menos significativo,
 * em sub-blocos de até 255 bytes. Recebe os índices aos poucos (`write`), para a imagem nunca
 * precisar estar inteira na memória, e entrega os bytes já prontos (`drain`).
 */
const MAX_BITS = 12
const MAX_CODES = 1 << MAX_BITS
// Tabela de dispersão do compress original: primo acima de 4096 e deslocamento correspondente.
const HASH_SIZE = 5003
const HASH_SHIFT = 4
const BLOCK_SIZE = 255

export class GifLzwEncoder {
  private readonly hashKeys = new Int32Array(HASH_SIZE).fill(-1)
  private readonly hashCodes = new Uint16Array(HASH_SIZE)
  private readonly initialBits: number
  private readonly clearCode: number
  private readonly endCode: number
  private codeBits: number
  private maxCode: number
  private nextCode: number
  private resetPending = false
  /** Código da sequência em andamento; -1 antes do primeiro pixel. */
  private current = -1
  private bitBuffer = 0
  private bitCount = 0
  private readonly block = new Uint8Array(BLOCK_SIZE)
  private blockLength = 0
  private output = new Uint8Array(64 * 1024)
  private outputLength = 0

  constructor(minCodeSize: number) {
    this.initialBits = minCodeSize + 1
    this.clearCode = 1 << minCodeSize
    this.endCode = this.clearCode + 1
    this.codeBits = this.initialBits
    this.maxCode = (1 << this.codeBits) - 1
    this.nextCode = this.clearCode + 2
    this.emit(this.clearCode)
  }

  write(indices: Uint8Array): void {
    let start = 0
    if (this.current < 0) {
      if (indices.length === 0) return
      this.current = indices[0] ?? 0
      start = 1
    }
    for (let index = start; index < indices.length; index += 1) {
      const pixel = indices[index] ?? 0
      const key = (pixel << MAX_BITS) + this.current
      let slot = (pixel << HASH_SHIFT) ^ this.current
      if (this.hashKeys[slot] === key) {
        this.current = this.hashCodes[slot] ?? 0
        continue
      }
      if ((this.hashKeys[slot] ?? -1) >= 0) {
        // Colisão: sondagem secundária, como no compress.
        const step = slot === 0 ? 1 : HASH_SIZE - slot
        let found = false
        do {
          slot -= step
          if (slot < 0) slot += HASH_SIZE
          if (this.hashKeys[slot] === key) {
            this.current = this.hashCodes[slot] ?? 0
            found = true
            break
          }
        } while ((this.hashKeys[slot] ?? -1) >= 0)
        if (found) continue
      }
      this.emit(this.current)
      this.current = pixel
      if (this.nextCode < MAX_CODES) {
        this.hashCodes[slot] = this.nextCode
        this.hashKeys[slot] = key
        this.nextCode += 1
      } else {
        // Dicionário cheio: recomeça (código "limpar") e volta aos códigos curtos.
        this.hashKeys.fill(-1)
        this.nextCode = this.clearCode + 2
        this.resetPending = true
        this.emit(this.clearCode)
      }
    }
  }

  /** Bytes dos sub-blocos completos até agora. */
  drain(): Uint8Array<ArrayBuffer> {
    const bytes = this.output.slice(0, this.outputLength)
    this.outputLength = 0
    return bytes
  }

  /** Grava a última sequência e o código de fim e devolve o restante dos dados. */
  finish(): Uint8Array<ArrayBuffer> {
    if (this.current >= 0) this.emit(this.current)
    this.emit(this.endCode)
    if (this.bitCount > 0) this.pushByte(this.bitBuffer & 0xff)
    this.bitBuffer = 0
    this.bitCount = 0
    this.flushBlock()
    return this.drain()
  }

  private emit(code: number) {
    this.bitBuffer = (this.bitBuffer & ((1 << this.bitCount) - 1)) | (code << this.bitCount)
    this.bitCount += this.codeBits
    while (this.bitCount >= 8) {
      this.pushByte(this.bitBuffer & 0xff)
      this.bitBuffer >>= 8
      this.bitCount -= 8
    }
    // O código seguinte precisa de mais um bit quando o próximo número livre não cabe mais.
    if (this.resetPending) {
      this.codeBits = this.initialBits
      this.maxCode = (1 << this.codeBits) - 1
      this.resetPending = false
    } else if (this.nextCode > this.maxCode) {
      this.codeBits += 1
      this.maxCode = this.codeBits === MAX_BITS ? MAX_CODES : (1 << this.codeBits) - 1
    }
  }

  private pushByte(byte: number) {
    this.block[this.blockLength] = byte
    this.blockLength += 1
    if (this.blockLength === BLOCK_SIZE) this.flushBlock()
  }

  private flushBlock() {
    if (this.blockLength === 0) return
    if (this.outputLength + this.blockLength + 1 > this.output.length) {
      const larger = new Uint8Array(this.output.length * 2)
      larger.set(this.output.subarray(0, this.outputLength))
      this.output = larger
    }
    this.output[this.outputLength] = this.blockLength
    this.output.set(this.block.subarray(0, this.blockLength), this.outputLength + 1)
    this.outputLength += this.blockLength + 1
    this.blockLength = 0
  }
}
