/**
 * Worker de vídeo: abre, corta, recorta, comprime e converte vídeos e extrai o som, com o Mediabunny (WebCodecs),
 * fora da thread principal. O arquivo é lido aos pedaços e o resultado é montado na memória do Worker;
 * nada sai do aparelho. Cada pedido recebe exatamente uma resposta, de sucesso ou com um código de erro estável.
 */
import {
  BlobSource,
  BufferTarget,
  CanvasSource,
  Conversion,
  EncodedPacketSink,
  Input,
  MP4,
  MovOutputFormat,
  Mp3OutputFormat,
  Mp4OutputFormat,
  Output,
  QTFF,
  Quality,
  WEBM,
  WebMOutputFormat,
  canEncodeAudio,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  type AudioCodec,
  type AudioSample,
  type ConversionAudioOptions,
  type ConversionVideoOptions,
  type DiscardedTrack,
  type InputAudioTrack,
  type InputFormat,
  type InputVideoTrack,
  type OutputFormat,
  type VideoCodec,
  type VideoSample,
} from 'mediabunny'
import { isCropWithin, type CropRect } from '../core/image/crop'
import type { Dimensions } from '../core/image/resize'
import { AUDIO_FORMATS, REENCODED_AUDIO_BITRATE, copyableAudioFormat, type AudioFormat } from '../core/video/audio'
import { VIDEO_MODES, convertActions } from '../core/video/convert'
import { MIN_VIDEO_CROP_SIDE, encodableCrop, encodableSize } from '../core/video/crop'
import { VIDEO_FORMATS, type VideoFormat } from '../core/video/formats'
import type { VideoErrorCode } from '../core/video/messages'
import { joinSegments, keptPieces, segmentAt, type JoinSegment } from '../core/video/remove'
import { TIME_TOLERANCE, type TrimRange } from '../core/video/trim'
import type {
  CompressJob,
  CompressOutput,
  ConvertJob,
  ConvertOutput,
  CropJob,
  CropOutput,
  ExtractAudioJob,
  ExtractAudioOutput,
  InspectJob,
  InspectOutput,
  JoinJob,
  JoinOutput,
  TrimJob,
  TrimOutput,
  VideoJob,
  VideoJobOutput,
  VideoWorkerRequest,
  VideoWorkerResponse,
} from './video-protocol'

class JobError extends Error {
  readonly code: VideoErrorCode

  constructor(code: VideoErrorCode) {
    super(code)
    this.code = code
  }
}

const INPUT_FORMATS: InputFormat[] = [MP4, QTFF, WEBM]

/** Codecs para recodificar, em ordem de preferência. MP4 e MOV saem só em H.264, que toca em todo lugar. */
const TRANSCODE_CODECS: Record<VideoFormat, VideoCodec[]> = {
  mp4: ['avc'],
  mov: ['avc'],
  webm: ['vp9', 'vp8', 'av1'],
}

/**
 * Som recodificado (remover partes, corte exato de WEBM, converter): AAC no MP4 e no MOV, para tocar em todo
 * lugar, inclusive nos aparelhos da Apple; Opus (ou Vorbis) no WEBM.
 */
const AUDIO_CODECS: Record<VideoFormat, AudioCodec[]> = {
  mp4: ['aac'],
  mov: ['aac'],
  webm: ['opus', 'vorbis'],
}

/** Configuração de referência para saber se o navegador gera um codec de som. */
const STEREO_48K = { numberOfChannels: 2, sampleRate: 48_000 }

const QUALITY = new Quality('high')

/** Pacotes de som lidos para medir a taxa média (cerca de 4 s de AAC). */
const AUDIO_STATS_PACKETS = 200

/* Clipes de teste para saber se o codificador respeita a taxa: meio segundo, pequeno, com textura. */
const PROBE_SIZE = { width: 320, height: 240 }
const PROBE_FPS = 30
const PROBE_FRAMES = 15
const PROBE_BLOCK = 16
const PROBE_LOW_BITRATE = 150_000
const PROBE_HIGH_BITRATE = 1_500_000
/** O clipe na taxa baixa precisa sair com menos de 60% do tamanho do outro. */
const PROBE_MAX_RATIO = 0.6

/** Diferença (em segundos) até a qual o início do corte conta como o próprio quadro-chave. */
const KEY_FRAME_TOLERANCE = 0.001

type ProgressReporter = (value: number) => void

interface OpenedVideo {
  input: Input
  format: VideoFormat
  video: InputVideoTrack
  audio: InputAudioTrack | null
  extraTracks: boolean
}

function formatOf(format: InputFormat): VideoFormat {
  if (format === QTFF) return 'mov'
  if (format === WEBM) return 'webm'
  return 'mp4'
}

/** Falta de memória aparece como RangeError no Chromium e como InternalError no Firefox. */
function isMemoryError(error: unknown): boolean {
  return error instanceof Error && (error instanceof RangeError || error.name === 'InternalError') && /alloc|memory/i.test(error.message)
}

/** Erro do Mediabunny ou do navegador vira um código estável; o detalhe técnico fica no console de desenvolvimento. */
function toJobError(error: unknown, fallback: VideoErrorCode): JobError {
  if (error instanceof JobError) return error
  if (import.meta.env.DEV) console.error(error)
  return new JobError(isMemoryError(error) ? 'memory' : fallback)
}

/** Leitura do arquivo antes de processar: falha aqui é arquivo ilegível (corrompido ou incompleto). */
async function reading<T>(task: Promise<T>): Promise<T> {
  try {
    return await task
  } catch (error) {
    throw toJobError(error, 'read-failed')
  }
}

/**
 * Abre o vídeo e escolhe as faixas principais (uma de vídeo e, se houver, uma de áudio). Faixas
 * extras, como uma segunda língua, ficam de fora; a interface avisa quando existem.
 */
async function openVideo(file: Blob): Promise<OpenedVideo> {
  const input = new Input({ source: new BlobSource(file), formats: INPUT_FORMATS })
  try {
    const format = formatOf(await input.getFormat())
    // Sem faixa nenhuma, o índice do arquivo falta ou está danificado (ex.: arquivo incompleto).
    if ((await input.getTracks()).length === 0) throw new JobError('read-failed')
    const videoTracks = await input.getVideoTracks()
    const audioTracks = await input.getAudioTracks()
    const video = await input.getPrimaryVideoTrack()
    if (!video) throw new JobError('no-video')
    if ((await video.getCodec()) === null) throw new JobError('codec-unsupported')
    const audio = await input.getPrimaryAudioTrack({ filter: async (track) => (await track.getCodec()) !== null })
    // Áudio que não dá para ler nem copiar: melhor recusar do que entregar o vídeo mudo sem avisar.
    if (audioTracks.length > 0 && !audio) throw new JobError('codec-unsupported')
    return { input, format, video, audio, extraTracks: videoTracks.length > 1 || audioTracks.length > 1 }
  } catch (error) {
    input.dispose()
    throw toJobError(error, 'read-failed')
  }
}

const selectedTracks = ({ video, audio }: OpenedVideo) => (audio ? [video, audio] : [video])

/**
 * Medidas do quadro como ele aparece: pixels quadrados (proporção de pixel aplicada) e rotação aplicada.
 * É o mesmo espaço em que o Mediabunny aplica o recorte.
 */
async function displaySize(video: InputVideoTrack): Promise<Dimensions> {
  const width = await video.getSquarePixelWidth()
  const height = await video.getSquarePixelHeight()
  return (await video.getRotation()) % 180 === 0 ? { width, height } : { width: height, height: width }
}

function outputFormatFor(format: VideoFormat) {
  if (format === 'mov') return new MovOutputFormat()
  if (format === 'webm') return new WebMOutputFormat()
  return new Mp4OutputFormat()
}

/** Faixa descartada pelo Mediabunny vira erro: o vídeo nunca sai sem som ou sem imagem em silêncio. */
function discardError(discarded: readonly DiscardedTrack[]): JobError | null {
  const problem = discarded.find((item) => item.reason !== 'discarded_by_user')
  if (!problem) return null
  switch (problem.reason) {
    case 'unknown_source_codec':
      return new JobError('codec-unsupported')
    case 'undecodable_source_codec':
      return new JobError('decode-unsupported')
    case 'no_encodable_target_codec':
      return new JobError('encode-unsupported')
    default:
      return new JobError('unexpected')
  }
}

/** Avisa o progresso só quando muda o ponto percentual, sem inundar a thread principal de mensagens. */
function throttled(report: ProgressReporter): ProgressReporter {
  let last = -1
  return (value) => {
    const percent = Math.floor(Math.min(1, Math.max(0, value)) * 100)
    if (percent === last) return
    last = percent
    report(percent / 100)
  }
}

interface ConvertOptions {
  trim?: { start: number; end: number }
  video: ConversionVideoOptions
  /** Sem opções, o som é copiado quando possível. */
  audio?: ConversionAudioOptions
  /** Tipo do arquivo gerado; sem ele, o mesmo formato do vídeo original. */
  container?: { format: OutputFormat; mimeType: string }
  /**
   * Só copiar, como foi prometido na tela: faixa que o Mediabunny teria de refazer vira erro, em vez de
   * ser refeita em silêncio. Mantém também o início do som como no original (o Opus começa alguns
   * milissegundos antes do zero, e sem isto o Mediabunny preferiria refazê-lo).
   */
  copyOnly?: boolean
}

/** Gera o arquivo (por padrão, o vídeo no mesmo formato do original), sem metadados (localização, data, aparelho). */
async function convert(opened: OpenedVideo, options: ConvertOptions, onProgress: ProgressReporter): Promise<Blob> {
  const { input, format, video, audio } = opened
  const container = options.container ?? { format: outputFormatFor(format), mimeType: VIDEO_FORMATS[format].mimeType }
  const output = new Output({ format: container.format, target: new BufferTarget() })
  let conversion: Conversion
  try {
    conversion = await Conversion.init({
      input,
      output,
      trim: options.trim,
      ...(options.copyOnly && { copy: { mode: 'forced' as const } }),
      video: (track) => (track.id === video.id ? options.video : { discard: true }),
      audio: (track) => (audio && track.id === audio.id ? (options.audio ?? {}) : { discard: true }),
      tags: {},
      showWarnings: false,
    })
  } catch (error) {
    throw toJobError(error, 'read-failed')
  }
  const discarded = discardError(conversion.discardedTracks)
  if (discarded) throw discarded
  if (!conversion.isValid) throw new JobError('unexpected')

  conversion.onProgress = throttled(onProgress)
  try {
    await conversion.execute()
  } catch (error) {
    throw toJobError(error, 'unexpected')
  }
  const { buffer } = output.target
  if (!buffer) throw new JobError('unexpected')
  return new Blob([buffer], { type: container.mimeType })
}

interface TranscodeRequest {
  /** Recorte pedido, já com medidas pares. */
  area?: CropRect
  /** Novas medidas (pares) do quadro inteiro, ao comprimir. */
  size?: Dimensions
  /** Taxa do vídeo em bits por segundo; sem ela, qualidade alta. */
  bitrate?: number
  /** Formato do arquivo gerado, ao converter; sem ele, o do original. */
  target?: VideoFormat
}

/**
 * Opções para recodificar o vídeo. Sem recorte nem medidas novas, medidas ímpares perdem 1 px
 * (H.264 exige pares).
 */
async function transcodeOptions(opened: OpenedVideo, { area, size, bitrate, target: format = opened.format }: TranscodeRequest = {}): Promise<ConversionVideoOptions> {
  const { video } = opened
  const full = await displaySize(video)
  const even = encodableSize(full)
  const crop = size ? undefined : (area ?? (even.width === full.width && even.height === full.height ? undefined : { x: 0, y: 0, ...even }))
  const target = size ?? crop ?? full
  if (!(await video.canDecode())) throw new JobError('decode-unsupported')
  const quality = bitrate ? new Quality({ bitrate }) : QUALITY
  const codec = await getFirstEncodableVideoCodec(TRANSCODE_CODECS[format], { width: target.width, height: target.height, quality })
  if (!codec) throw new JobError('encode-unsupported')
  return {
    forceTranscode: true,
    codec,
    quality,
    ...(crop && { crop: { left: crop.x, top: crop.y, width: crop.width, height: crop.height } }),
    ...(size && { width: size.width, height: size.height, fit: 'fill' as const }),
  }
}

/**
 * Início do corte em que o vídeo pode ser copiado sem recodificar: o começo do vídeo (corte só no fim)
 * ou um quadro-chave. `null` quando o início cai no meio de um grupo de quadros.
 */
async function copyableStart(video: InputVideoTrack, start: number): Promise<number | null> {
  const first = await video.getFirstTimestamp()
  if (start <= first + KEY_FRAME_TOLERANCE) return Math.min(start, first)
  const key = await new EncodedPacketSink(video).getKeyPacket(start, { verifyKeyPackets: true })
  return key && start - key.timestamp < KEY_FRAME_TOLERANCE ? key.timestamp : null
}

/** Taxa média do som, medida nos primeiros pacotes (alguns segundos bastam: o som tem taxa quase constante). */
async function audioBitrate(audio: InputAudioTrack): Promise<number | null> {
  const { averageBitrate } = await audio.computePacketStats(AUDIO_STATS_PACKETS)
  return Number.isFinite(averageBitrate) && averageBitrate > 0 ? Math.round(averageBitrate) : null
}

/** Bytes de um clipe de teste curto, com textura, codificado na taxa pedida. */
async function probeClipBytes(codec: VideoCodec, bitrate: number): Promise<number> {
  const canvas = new OffscreenCanvas(PROBE_SIZE.width, PROBE_SIZE.height)
  const context = canvas.getContext('2d')
  if (!context) return 0
  const output = new Output({ format: codec === 'avc' ? new Mp4OutputFormat() : new WebMOutputFormat(), target: new BufferTarget() })
  const source = new CanvasSource(canvas, { codec, quality: new Quality({ bitrate }) })
  output.addVideoTrack(source, { frameRate: PROBE_FPS })
  await output.start()
  // A mesma textura nas duas taxas: só a taxa muda o tamanho.
  let seed = 1
  const shade = () => {
    seed = (seed * 16807) % 2147483647
    return seed % 256
  }
  for (let frame = 0; frame < PROBE_FRAMES; frame += 1) {
    for (let y = 0; y < PROBE_SIZE.height; y += PROBE_BLOCK) {
      for (let x = 0; x < PROBE_SIZE.width; x += PROBE_BLOCK) {
        const value = shade()
        context.fillStyle = `rgb(${value}, ${255 - value}, ${(value * 7) % 256})`
        context.fillRect(x, y, PROBE_BLOCK, PROBE_BLOCK)
      }
    }
    await source.add(frame / PROBE_FPS, 1 / PROBE_FPS)
  }
  source.close()
  await output.finalize()
  return output.target.buffer?.byteLength ?? 0
}

const sizeControl = new Map<VideoCodec, Promise<boolean>>()

/**
 * O codificador respeita a taxa pedida? Dois clipes de teste minúsculos, numa taxa baixa e numa alta:
 * se o baixo não sair bem menor, o navegador ignora a taxa (como o H.264 do Firefox do Playwright).
 * O resultado fica guardado por codec enquanto o Worker existir.
 */
function controlsSize(codec: VideoCodec): Promise<boolean> {
  let check = sizeControl.get(codec)
  if (!check) {
    check = (async () => {
      try {
        const low = await probeClipBytes(codec, PROBE_LOW_BITRATE)
        const high = await probeClipBytes(codec, PROBE_HIGH_BITRATE)
        return low > 0 && low < high * PROBE_MAX_RATIO
      } catch (error) {
        if (import.meta.env.DEV) console.error(error)
        return false // sem conseguir conferir, melhor não prometer compressão
      }
    })()
    sizeControl.set(codec, check)
  }
  return check
}

async function inspect(job: InspectJob): Promise<InspectOutput> {
  const opened = await openVideo(job.file)
  try {
    const { input, format, video, audio, extraTracks } = opened
    const duration = await input.computeDuration(selectedTracks(opened))
    if (!(duration > 0)) throw new JobError('read-failed')
    const { width, height } = await displaySize(video)
    const even = encodableSize({ width, height })
    const canDecodeVideo = await video.canDecode()
    const canDecodeAudio = audio !== null && (await audio.canDecode())
    const encodable = async (target: VideoFormat) => ({
      video: canDecodeVideo && (await getFirstEncodableVideoCodec(TRANSCODE_CODECS[target], { ...even, quality: QUALITY })) !== null,
      audio: canDecodeAudio && (await getFirstEncodableAudioCodec(AUDIO_CODECS[target], STEREO_48K)) !== null,
    })
    // MP4 e MOV refazem nos mesmos codecs (H.264 e AAC).
    const isobmff = await encodable('mp4')
    const reencodable = { mp4: isobmff, mov: isobmff, webm: await encodable('webm') }
    const canTranscodeVideo = reencodable[format].video
    // Recodificam o som: remover partes (emendas) e o corte exato de WEBM (o formato não começa antes do zero).
    const canTranscodeAudio = !audio || reencodable[format].audio
    const probeCodec = job.checkSizeControl && canTranscodeVideo ? await getFirstEncodableVideoCodec(TRANSCODE_CODECS[format], PROBE_SIZE) : null
    return {
      kind: 'inspect',
      info: {
        format,
        duration,
        width,
        height,
        codec: (await video.getCodec()) ?? '',
        hasAudio: audio !== null,
        audioBitrate: audio ? await audioBitrate(audio) : null,
        canTranscodeVideo,
        canTranscodeAudio,
        audioCodec: audio ? await audio.getCodec() : null,
        canDecodeAudio,
        canEncodeAac: isobmff.audio,
        // O MP3 vem do codificador próprio, em WebAssembly (desligado, por exemplo, no Modo de Isolamento do iPhone).
        canEncodeMp3: canDecodeAudio && typeof WebAssembly === 'object',
        rotated: (await video.getRotation()) !== 0,
        reencodable,
        extraTracks,
        ...(job.checkSizeControl && { controlsSize: probeCodec !== null && (await controlsSize(probeCodec)) }),
      },
    }
  } catch (error) {
    throw toJobError(error, 'read-failed')
  } finally {
    opened.input.dispose()
  }
}

async function trim(job: TrimJob, onProgress: ProgressReporter): Promise<TrimOutput> {
  const opened = await openVideo(job.file)
  try {
    const duration = await reading(opened.input.computeDuration(selectedTracks(opened)))
    if (!(job.start >= 0 && job.end > job.start && job.start < duration)) throw new JobError('unexpected')
    const end = Math.min(job.end, duration)
    // WEBM não guarda quadros antes do zero: lá o corte rápido não existe e o exato vale sempre.
    const exact = job.mode === 'exact' || opened.format === 'webm'
    const keyStart = exact ? await reading(copyableStart(opened.video, job.start)) : job.start
    const copied = keyStart !== null
    const video = copied ? {} : await reading(transcodeOptions(opened))
    const blob = await convert(opened, { trim: { start: keyStart ?? job.start, end }, video }, onProgress)
    return { kind: 'trim', blob, copied }
  } finally {
    opened.input.dispose()
  }
}

/** Quadro dentro de um pedaço que fica: encosta no pedaço anterior. Fora dos pedaços, sai do vídeo. */
function joinVideoSample(segments: readonly JoinSegment[], sample: VideoSample): VideoSample | null {
  const segment = segmentAt(segments, sample.timestamp)
  if (!segment) return null
  const start = sample.timestamp
  const end = Math.min(start + sample.duration, segment.end)
  sample.setTimestamp(start - segment.shift)
  sample.setDuration(end - start)
  return sample
}

/**
 * Bloco de som (cerca de 20 ms): fica só o que cai dentro dos pedaços, cortado na amostra exata e
 * encostado no pedaço anterior. Assim o som emendado continua contínuo e junto da imagem.
 */
function joinAudioSample(segments: readonly JoinSegment[], sample: AudioSample): AudioSample[] | null {
  const parts: AudioSample[] = []
  for (const piece of keptPieces(segments, sample.timestamp, sample.duration)) {
    const from = Math.round((piece.from - sample.timestamp) * sample.sampleRate)
    const to = Math.min(sample.numberOfFrames, Math.round((piece.to - sample.timestamp) * sample.sampleRate))
    if (to <= from) continue
    const part = sample.trim(from, to)
    part.setTimestamp(piece.outputStart)
    parts.push(part)
  }
  return parts.length > 0 ? parts : null
}

/** Trechos em ordem, sem sobreposição, dentro do vídeo. */
function validRanges(ranges: readonly TrimRange[], duration: number): boolean {
  return (
    ranges.length > 0 &&
    ranges.every(
      (range, index) =>
        Number.isFinite(range.start) &&
        range.start >= 0 &&
        range.end > range.start &&
        range.end <= duration + TIME_TOLERANCE &&
        range.start >= (ranges[index - 1]?.end ?? 0),
    )
  )
}

async function join(job: JoinJob, onProgress: ProgressReporter): Promise<JoinOutput> {
  const opened = await openVideo(job.file)
  try {
    const duration = await reading(opened.input.computeDuration(selectedTracks(opened)))
    if (!validRanges(job.ranges, duration)) throw new JobError('unexpected')
    const ranges = job.ranges.map((range) => ({ start: range.start, end: Math.min(range.end, duration) }))
    const first = ranges[0]
    const last = ranges.at(-1)
    if (!first || !last) throw new JobError('unexpected')
    // O Mediabunny entrega os quadros já com o tempo contado a partir do início do primeiro pedaço.
    const segments = joinSegments(ranges)
    const video: ConversionVideoOptions = {
      ...(await reading(transcodeOptions(opened))),
      process: (sample) => joinVideoSample(segments, sample),
    }
    const audio: ConversionAudioOptions = {
      ...(opened.format !== 'webm' && { codec: 'aac' as const }),
      process: (sample) => joinAudioSample(segments, sample),
    }
    const blob = await convert(opened, { trim: { start: first.start, end: last.end }, video, audio }, onProgress)
    return { kind: 'join', blob }
  } finally {
    opened.input.dispose()
  }
}

async function crop(job: CropJob, onProgress: ProgressReporter): Promise<CropOutput> {
  const opened = await openVideo(job.file)
  try {
    const area = encodableCrop(job.crop)
    const valid =
      [area.x, area.y, area.width, area.height].every(Number.isInteger) &&
      area.width >= MIN_VIDEO_CROP_SIDE &&
      area.height >= MIN_VIDEO_CROP_SIDE &&
      isCropWithin(area, await reading(displaySize(opened.video)))
    if (!valid) throw new JobError('unexpected')
    const video = await reading(transcodeOptions(opened, { area }))
    const blob = await convert(opened, { video }, onProgress)
    return { kind: 'crop', blob, width: area.width, height: area.height }
  } finally {
    opened.input.dispose()
  }
}

async function compress(job: CompressJob, onProgress: ProgressReporter): Promise<CompressOutput> {
  const opened = await openVideo(job.file)
  try {
    const full = await reading(displaySize(opened.video))
    const { width, height, bitrate } = job
    // Lados pares podem passar 1 px do original (ex.: 1081 vira 1082); nunca mais que isso.
    const valid =
      [width, height, bitrate].every(Number.isInteger) &&
      width >= 2 &&
      height >= 2 &&
      width % 2 === 0 &&
      height % 2 === 0 &&
      width <= full.width + 1 &&
      height <= full.height + 1 &&
      bitrate > 0
    if (!valid) throw new JobError('unexpected')
    const video = await reading(transcodeOptions(opened, { size: { width, height }, bitrate }))
    const blob = await convert(opened, { video }, onProgress)
    return { kind: 'compress', blob }
  } finally {
    opened.input.dispose()
  }
}

let mp3Encoder: Promise<void> | null = null

/**
 * O codificador de MP3 (LAME em WebAssembly, cerca de 120 KB) só carrega quando alguém pede MP3: os
 * navegadores não geram MP3 pelo WebCodecs. Ele roda num Worker próprio, criado a partir de `blob:`
 * (a CSP permite `worker-src blob:` e `'wasm-unsafe-eval'` por causa dele).
 */
function loadMp3Encoder(): Promise<void> {
  mp3Encoder ??= (async () => {
    if (await canEncodeAudio('mp3')) return // um navegador que passe a gerar MP3 usa o próprio
    const { registerMp3Encoder } = await import('@mediabunny/mp3-encoder')
    registerMp3Encoder()
  })().catch((error: unknown) => {
    mp3Encoder = null // falha ao carregar (ex.: sem conexão) não impede tentar de novo
    throw toJobError(error, 'unexpected')
  })
  return mp3Encoder
}

/** Taxas de amostragem que todo tocador aceita; outras (ex.: 96 kHz de gravador) saem em 48 kHz. */
const REENCODED_SAMPLE_RATES = [44_100, 48_000]

/** Som refeito, em estéreo no máximo e numa taxa de amostragem que o codec e todo tocador aceitam. */
async function reencodedAudio(audio: InputAudioTrack, codec: AudioCodec, bitrate = REENCODED_AUDIO_BITRATE): Promise<ConversionAudioOptions> {
  const sampleRate = await audio.getSampleRate()
  // O Opus só trabalha em 48 kHz.
  const keepRate = codec !== 'opus' && REENCODED_SAMPLE_RATES.includes(sampleRate)
  return {
    codec,
    forceTranscode: true,
    quality: new Quality({ bitrate }),
    numberOfChannels: Math.min(await audio.getNumberOfChannels(), 2),
    ...(!keepRate && { sampleRate: 48_000 }),
  }
}

/** Som refeito para um arquivo de som: AAC (M4A) ou MP3. */
async function reencodedAudioOptions(audio: InputAudioTrack, format: Exclude<AudioFormat, 'webm'>): Promise<ConversionAudioOptions> {
  if (!(await audio.canDecode())) throw new JobError('decode-unsupported')
  if (format === 'mp3') await loadMp3Encoder()
  return reencodedAudio(audio, format === 'mp3' ? 'mp3' : 'aac')
}

/** Opções do som: copiar, quando o formato pedido comporta o som original, ou refazer. */
async function extractedAudioOptions(audio: InputAudioTrack, format: AudioFormat): Promise<{ options: ConversionAudioOptions; copied: boolean }> {
  if (copyableAudioFormat(await audio.getCodec()) === format) return { options: {}, copied: true }
  // WEBM só serve para copiar Opus ou Vorbis: refazer o som sai em M4A ou MP3.
  if (format === 'webm') throw new JobError('unexpected')
  return { options: await reencodedAudioOptions(audio, format), copied: false }
}

function audioContainerFor(format: AudioFormat): OutputFormat {
  if (format === 'mp3') return new Mp3OutputFormat()
  if (format === 'webm') return new WebMOutputFormat()
  return new Mp4OutputFormat()
}

async function extractAudio(job: ExtractAudioJob, onProgress: ProgressReporter): Promise<ExtractAudioOutput> {
  // O protocolo é tipado, mas o pedido vem de outra thread: formato desconhecido é recusado.
  if (!Object.hasOwn(AUDIO_FORMATS, job.format)) throw new JobError('unexpected')
  const opened = await openVideo(job.file)
  try {
    const { audio } = opened
    if (!audio) throw new JobError('no-audio')
    const { options, copied } = await reading(extractedAudioOptions(audio, job.format))
    const container = { format: audioContainerFor(job.format), mimeType: AUDIO_FORMATS[job.format].mimeType }
    const blob = await convert(opened, { video: { discard: true }, audio: options, container, copyOnly: copied }, onProgress)
    return { kind: 'extract-audio', blob, copied }
  } finally {
    opened.input.dispose()
  }
}

/** Som refeito no codec do formato novo: AAC no MP4 e no MOV; Opus (ou Vorbis) no WEBM. */
async function convertedAudioOptions(audio: InputAudioTrack, target: VideoFormat, bitrate: number): Promise<ConversionAudioOptions> {
  if (!(await audio.canDecode())) throw new JobError('decode-unsupported')
  const codec = await getFirstEncodableAudioCodec(AUDIO_CODECS[target], STEREO_48K)
  if (!codec) throw new JobError('encode-unsupported')
  return reencodedAudio(audio, codec, bitrate)
}

const isBitrate = (value: number) => Number.isInteger(value) && value > 0

async function convertFormat(job: ConvertJob, onProgress: ProgressReporter): Promise<ConvertOutput> {
  // O protocolo é tipado, mas o pedido vem de outra thread: formato, modo ou taxas inválidos são recusados.
  const valid = Object.hasOwn(VIDEO_FORMATS, job.format) && VIDEO_MODES.includes(job.mode) && isBitrate(job.bitrate) && isBitrate(job.audioBitrate)
  if (!valid) throw new JobError('unexpected')
  const opened = await openVideo(job.file)
  try {
    const { video, audio } = opened
    if (opened.format === job.format) throw new JobError('unexpected')
    const source = {
      codec: (await reading(video.getCodec())) ?? '',
      audioCodec: audio ? await reading(audio.getCodec()) : null,
      rotated: (await reading(video.getRotation())) !== 0,
    }
    const actions = convertActions(source, job.format, job.mode)
    const videoOptions = actions.video === 'copy' ? {} : await reading(transcodeOptions(opened, { bitrate: job.bitrate, target: job.format }))
    const audioOptions = audio && actions.audio === 'encode' ? await reading(convertedAudioOptions(audio, job.format, job.audioBitrate)) : {}
    const container = { format: outputFormatFor(job.format), mimeType: VIDEO_FORMATS[job.format].mimeType }
    // Tudo copiado, como a tela prometeu: nada é refeito em silêncio.
    const copyOnly = actions.video === 'copy' && actions.audio !== 'encode'
    const blob = await convert(opened, { video: videoOptions, audio: audioOptions, container, copyOnly }, onProgress)
    return { kind: 'convert', blob, ...actions }
  } finally {
    opened.input.dispose()
  }
}

function run(job: VideoJob, onProgress: ProgressReporter): Promise<VideoJobOutput> {
  switch (job.kind) {
    case 'inspect':
      return inspect(job)
    case 'trim':
      return trim(job, onProgress)
    case 'join':
      return join(job, onProgress)
    case 'crop':
      return crop(job, onProgress)
    case 'compress':
      return compress(job, onProgress)
    case 'extract-audio':
      return extractAudio(job, onProgress)
    case 'convert':
      return convertFormat(job, onProgress)
  }
}

function respond(response: VideoWorkerResponse) {
  self.postMessage(response)
}

self.addEventListener('message', (event: MessageEvent<VideoWorkerRequest>) => {
  const request = event.data
  const { id } = request
  run(request, (value) => respond({ id, type: 'progress', value })).then(
    (output) => respond({ id, type: 'done', output }),
    (error: unknown) => respond({ id, type: 'error', code: toJobError(error, 'unexpected').code }),
  )
})
