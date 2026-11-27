/**
 * Muda a velocidade do som sem mudar o tom (WSOLA): o som é refeito com pedaços de 40 ms sobrepostos pela
 * metade, tirados do original num ritmo `speed` vezes mais rápido (ou mais lento); cada pedaço é procurado
 * a até 12 ms do ponto exato, onde ele melhor continua o anterior, para a emenda não estalar.
 *
 * É assim que o player do navegador toca o vídeo mais rápido na prévia, então o arquivo soa como a prévia.
 * Funciona em fluxo (o som chega em blocos de cerca de 20 ms): `push` devolve o que já dá para entregar e
 * `flush`, no fim, o resto, com o total exato de `entrada ÷ speed` amostras. Função pura: sem DOM.
 */

export interface TimeStretcher {
  /** Um bloco de som (um `Float32Array` por canal, todos do mesmo tamanho); devolve o som pronto até aqui. */
  push(planes: readonly Float32Array[]): Float32Array[]
  /** Fim do som: entrega o que faltava. */
  flush(): Float32Array[]
}

/** Passo da busca grossa (em amostras), antes de afinar em volta do melhor ponto. */
const COARSE_STEP = 4

export function createTimeStretcher(channels: number, sampleRate: number, speed: number): TimeStretcher {
  const half = Math.max(16, Math.round(0.02 * sampleRate))
  const size = half * 2
  const seek = Math.round(0.012 * sampleRate)
  const analysisHop = half * speed
  // Janela de Hann periódica: com sobreposição de metade, as janelas somam 1 e o volume fica igual.
  const window = Float32Array.from({ length: size }, (_, n) => 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / size))

  let planes = Array.from({ length: channels }, () => new Float32Array(0))
  /** Soma dos canais, só para escolher onde emendar. */
  let mono = new Float32Array(0)
  /** Índice (na entrada inteira) da primeira amostra guardada. */
  let bufferStart = 0
  let received = 0
  /** Onde, na entrada, começaria o próximo pedaço sem a busca. */
  let nominal = 0
  /** Onde começou o pedaço anterior (−1 antes do primeiro). */
  let previous = -1
  let produced = 0
  const overlap = Array.from({ length: channels }, () => new Float32Array(size))

  const sample = (plane: Float32Array, index: number) => {
    const local = index - bufferStart
    return local >= 0 && local < plane.length ? plane[local]! : 0
  }

  function append(input: readonly Float32Array[]) {
    const length = input[0]?.length ?? 0
    if (length === 0) return
    planes = planes.map((plane, channel) => {
      const next = new Float32Array(plane.length + length)
      next.set(plane)
      next.set(input[channel] ?? new Float32Array(length), plane.length)
      return next
    })
    const nextMono = new Float32Array(mono.length + length)
    nextMono.set(mono)
    for (let n = 0; n < length; n += 1) {
      let sum = 0
      for (const plane of input) sum += plane[n] ?? 0
      nextMono[mono.length + n] = sum
    }
    mono = nextMono
    received += length
  }

  /** Quanto o trecho que começa em `start` se parece com a continuação natural do pedaço anterior. */
  function similarity(start: number, natural: number, step: number) {
    let score = 0
    for (let n = 0; n < half; n += step) score += sample(mono, start + n) * sample(mono, natural + n)
    return score
  }

  function bestStart(target: number): number {
    if (previous < 0) return Math.max(0, target)
    const natural = previous + half
    const low = Math.max(bufferStart, target - seek)
    const high = target + seek
    let best = Math.max(low, target)
    let bestScore = similarity(best, natural, COARSE_STEP)
    for (let start = low; start <= high; start += COARSE_STEP) {
      const score = similarity(start, natural, COARSE_STEP)
      if (score > bestScore) {
        best = start
        bestScore = score
      }
    }
    const coarse = best
    bestScore = similarity(coarse, natural, 1)
    for (let start = Math.max(low, coarse - COARSE_STEP + 1); start <= Math.min(high, coarse + COARSE_STEP - 1); start += 1) {
      const score = similarity(start, natural, 1)
      if (score > bestScore) {
        best = start
        bestScore = score
      }
    }
    return best
  }

  /** Soma o pedaço que começa em `start` e entrega a metade que ficou completa. */
  function addFrame(start: number, output: Float32Array[][]) {
    overlap.forEach((accumulated, channel) => {
      const plane = planes[channel]!
      for (let n = 0; n < size; n += 1) accumulated[n]! += window[n]! * sample(plane, start + n)
      output[channel]!.push(accumulated.slice(0, half))
      accumulated.copyWithin(0, half)
      accumulated.fill(0, half)
    })
    produced += half
    previous = start
    nominal += analysisHop
    // Fica guardado só o que o próximo pedaço ainda pode usar.
    const keepFrom = Math.min(previous + half, Math.round(nominal) - seek)
    const drop = keepFrom - bufferStart
    if (drop > 0) {
      planes = planes.map((plane) => plane.slice(Math.min(drop, plane.length)))
      mono = mono.slice(Math.min(drop, mono.length))
      bufferStart += drop
    }
  }

  function run(final: boolean): Float32Array[][] {
    const output: Float32Array[][] = Array.from({ length: channels }, () => [])
    for (;;) {
      const target = Math.round(nominal)
      const ready = final ? target < received : target + seek + size <= received && (previous < 0 || previous + size <= received)
      if (!ready) break
      addFrame(bestStart(target), output)
    }
    return output
  }

  const join = (chunks: Float32Array[]) => {
    const result = new Float32Array(chunks.reduce((total, chunk) => total + chunk.length, 0))
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    return result
  }

  return {
    push(input) {
      append(input)
      return run(false).map(join)
    },
    flush() {
      const output = run(true)
      // A última metade, que nenhum pedaço seguinte completa.
      overlap.forEach((accumulated, channel) => output[channel]!.push(accumulated.slice(0, half)))
      produced += half
      const expected = Math.round(received / speed)
      const surplus = produced - expected
      return output.map((chunks) => {
        const joined = join(chunks)
        if (surplus >= 0) return joined.slice(0, Math.max(0, joined.length - surplus))
        const padded = new Float32Array(joined.length - surplus)
        padded.set(joined)
        return padded
      })
    },
  }
}
