import { describe, expect, it } from 'vitest'
import { createTimeStretcher } from './time-stretch'

const RATE = 48_000

/** Tom puro como o dos vídeos de teste: 440 Hz, amplitude 0,2. */
function tone(seconds: number, frequency = 440): Float32Array {
  return Float32Array.from({ length: Math.round(seconds * RATE) }, (_, n) => 0.2 * Math.sin((2 * Math.PI * frequency * n) / RATE))
}

/** Passa o som em blocos de 20 ms (como chegam do vídeo) e junta tudo o que sai, em cada canal. */
function stretch(input: readonly Float32Array[], speed: number, block = 960): Float32Array[] {
  const stretcher = createTimeStretcher(input.length, RATE, speed)
  const chunks: Float32Array[][] = input.map(() => [])
  const collect = (planes: Float32Array[]) => planes.forEach((plane, channel) => chunks[channel]!.push(plane))
  const length = input[0]?.length ?? 0
  for (let start = 0; start < length; start += block) collect(stretcher.push(input.map((plane) => plane.slice(start, start + block))))
  collect(stretcher.flush())
  return chunks.map((parts) => {
    const joined = new Float32Array(parts.reduce((total, part) => total + part.length, 0))
    let offset = 0
    for (const part of parts) {
      joined.set(part, offset)
      offset += part.length
    }
    return joined
  })
}

/** Frequência pelos cruzamentos do zero e volume (RMS), longe das pontas. */
function measure(signal: Float32Array) {
  const middle = signal.slice(Math.round(signal.length * 0.1), Math.round(signal.length * 0.9))
  let crossings = 0
  let squares = 0
  for (let n = 0; n < middle.length; n += 1) {
    if (n > 0 && middle[n - 1]! < 0 !== middle[n]! < 0) crossings += 1
    squares += middle[n]! ** 2
  }
  return { frequency: crossings / 2 / (middle.length / RATE), rms: Math.sqrt(squares / middle.length) }
}

describe('mudar a velocidade do som sem mudar o tom', () => {
  it.each([0.25, 0.5, 0.75, 1.5, 2, 3, 4])('a %s×: dura entrada ÷ velocidade, no mesmo tom e no mesmo volume', (speed) => {
    const [output] = stretch([tone(2)], speed)
    expect(output!.length).toBe(Math.round((2 * RATE) / speed))
    const { frequency, rms } = measure(output!)
    expect(frequency).toBeGreaterThan(440 * 0.97)
    expect(frequency).toBeLessThan(440 * 1.03)
    expect(rms).toBeGreaterThan(0.14 * 0.85)
    expect(rms).toBeLessThan(0.14 * 1.1)
  })

  it('os canais seguem juntos (as emendas são as mesmas em todos)', () => {
    const left = tone(1)
    const right = tone(1).map((value) => value * 0.5)
    const [outLeft, outRight] = stretch([left, right], 2)
    expect(outLeft!.length).toBe(outRight!.length)
    for (let n = 0; n < outLeft!.length; n += 997) expect(outRight![n]).toBeCloseTo(outLeft![n]! * 0.5, 5)
  })

  it('o tamanho do bloco não muda o resultado', () => {
    const input = [tone(1, 330)]
    const [small] = stretch(input, 1.5, 256)
    const [large] = stretch(input, 1.5, 4800)
    expect(small!.length).toBe(large!.length)
    for (let n = 0; n < small!.length; n += 101) expect(small![n]).toBeCloseTo(large![n]!, 5)
  })

  it('som muito curto ou vazio não quebra', () => {
    expect(stretch([new Float32Array(100)], 2)[0]!.length).toBe(50)
    expect(stretch([new Float32Array(0)], 0.5)[0]!.length).toBe(0)
  })
})
