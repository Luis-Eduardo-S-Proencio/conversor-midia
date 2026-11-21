/**
 * Leitura de arquivos de som nos testes de navegador: formato, faixas, duração, pacotes e o tom do som,
 * pelo Mediabunny (independente do Worker testado no que importa: aqui só se lê e decodifica, nada se gera).
 */
import { ALL_FORMATS, AudioSampleSink, BlobSource, EncodedPacketSink, Input, type InputAudioTrack } from 'mediabunny'

export interface AudioReport {
  format: string
  /** O arquivo de som não pode ter faixa de vídeo. */
  videoTracks: number
  audioTracks: number
  codec: string | null
  duration: number
  numberOfChannels: number
  sampleRate: number
  tags: Record<string, unknown>
}

async function withAudioTrack<T>(blob: Blob, read: (input: Input, track: InputAudioTrack) => Promise<T>): Promise<T> {
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS })
  try {
    const track = await input.getPrimaryAudioTrack()
    if (!track) throw new Error('sem faixa de som')
    return await read(input, track)
  } finally {
    input.dispose()
  }
}

export function readAudio(blob: Blob): Promise<AudioReport> {
  return withAudioTrack(blob, async (input, track) => {
    const { raw, ...tags } = await input.getMetadataTags()
    return {
      format: (await input.getFormat()).name,
      videoTracks: (await input.getVideoTracks()).length,
      audioTracks: (await input.getAudioTracks()).length,
      codec: await track.getCodec(),
      duration: await input.computeDuration(),
      numberOfChannels: await track.getNumberOfChannels(),
      sampleRate: await track.getSampleRate(),
      tags: { ...tags, ...(raw && { raw }) },
    }
  })
}

/** Bytes de cada pacote de som, em ordem: iguais aos do original quando o som foi copiado sem refazer. */
export function audioPackets(blob: Blob): Promise<Uint8Array[]> {
  return withAudioTrack(blob, async (_input, track) => {
    const packets: Uint8Array[] = []
    for await (const packet of new EncodedPacketSink(track).packets()) packets.push(packet.data)
    return packets
  })
}

/**
 * Tom do som entre `start` e `end` (segundos), no primeiro canal: frequência pelos cruzamentos do zero e
 * volume médio (RMS). Os vídeos de teste têm um tom de 440 Hz com amplitude 0,2 (RMS ≈ 0,14).
 */
export function measureTone(blob: Blob, start: number, end: number): Promise<{ frequency: number; rms: number }> {
  return withAudioTrack(blob, async (_input, track) => {
    const sampleRate = await track.getSampleRate()
    let crossings = 0
    let sumOfSquares = 0
    let count = 0
    let previous = 0
    for await (const sample of new AudioSampleSink(track).samples(start, end)) {
      const data = new Float32Array(sample.numberOfFrames)
      sample.copyTo(data, { planeIndex: 0, format: 'f32-planar' })
      sample.close()
      for (const value of data) {
        if (count > 0 && previous < 0 !== value < 0) crossings += 1
        sumOfSquares += value * value
        previous = value
        count += 1
      }
    }
    if (count === 0) throw new Error(`sem som entre ${start} e ${end} s`)
    return { frequency: crossings / 2 / (count / sampleRate), rms: Math.sqrt(sumOfSquares / count) }
  })
}
