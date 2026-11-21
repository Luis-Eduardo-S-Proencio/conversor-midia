/**
 * Leitura de vídeos nos testes de navegador: formato, faixas, duração e a cor de pontos dos quadros,
 * pelo Mediabunny (independente do Worker testado no que importa: aqui só se lê, nada se gera).
 */
import { ALL_FORMATS, BlobSource, CanvasSink, EncodedPacketSink, Input } from 'mediabunny'

export type Color = 'red' | 'green' | 'blue' | 'yellow' | 'other'

/**
 * Cor dominante de um pixel. Codificar vídeo altera as cores (e o Firefox converte cores de outro
 * jeito), então a conferência é pelo canal que domina, não pelo valor exato.
 */
export function classify([red = 0, green = 0, blue = 0]: readonly number[]): Color {
  const high = (value: number) => value > 150
  const low = (value: number) => value < 100
  if (high(red) && low(green) && low(blue)) return 'red'
  if (low(red) && high(green) && low(blue)) return 'green'
  if (low(red) && low(green) && high(blue)) return 'blue'
  if (high(red) && high(green) && low(blue)) return 'yellow'
  return 'other'
}

export async function fixtureBlob(url: string): Promise<Blob> {
  const response = await fetch(url)
  return response.blob()
}

export interface VideoReport {
  format: string
  duration: number
  width: number
  height: number
  rotation: number
  videoCodec: string | null
  audioCodec: string | null
  /** Fim do som, em segundos (null sem som): deve acompanhar o fim da imagem. */
  audioDuration: number | null
  firstTimestamp: number
  tags: Record<string, unknown>
  /** Cor do pixel (x, y), em medidas do quadro como ele aparece, no tempo pedido (segundos). */
  colorAt: (time: number, x: number, y: number) => Promise<Color>
  dispose: () => void
}

/** Bytes de cada pacote de vídeo, em ordem: iguais aos do original quando o vídeo foi copiado sem refazer. */
export async function videoPackets(blob: Blob): Promise<Uint8Array[]> {
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS })
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error('sem faixa de vídeo')
    const packets: Uint8Array[] = []
    for await (const packet of new EncodedPacketSink(track).packets()) packets.push(packet.data)
    return packets
  } finally {
    input.dispose()
  }
}

export async function readVideo(blob: Blob): Promise<VideoReport> {
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS })
  const video = await input.getPrimaryVideoTrack()
  if (!video) throw new Error('sem faixa de vídeo')
  const audio = await input.getPrimaryAudioTrack()
  const sink = new CanvasSink(video)
  const { raw, ...tags } = await input.getMetadataTags()
  return {
    format: (await input.getFormat()).name,
    duration: await input.computeDuration(),
    width: await video.getDisplayWidth(),
    height: await video.getDisplayHeight(),
    rotation: await video.getRotation(),
    videoCodec: await video.getCodec(),
    audioCodec: audio ? await audio.getCodec() : null,
    audioDuration: audio ? await audio.computeDuration() : null,
    firstTimestamp: await video.getFirstTimestamp(),
    tags: { ...tags, ...(raw && { raw }) },
    async colorAt(time, x, y) {
      const frame = await sink.getCanvas(time)
      if (!frame) throw new Error(`sem quadro em ${time} s`)
      const context = frame.canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
      if (!context) throw new Error('canvas indisponível')
      return classify(Array.from(context.getImageData(x, y, 1, 1).data))
    },
    dispose: () => input.dispose(),
  }
}
