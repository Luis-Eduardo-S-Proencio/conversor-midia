/**
 * Worker de vídeo: abre, corta e recorta vídeos com o Mediabunny (WebCodecs), fora da thread principal.
 * O arquivo é lido aos pedaços e o resultado é montado na memória do Worker; nada sai do aparelho.
 * Cada pedido recebe exatamente uma resposta, de sucesso ou com um código de erro estável.
 */
import {
  BlobSource,
  BufferTarget,
  Conversion,
  EncodedPacketSink,
  Input,
  MP4,
  MovOutputFormat,
  Mp4OutputFormat,
  Output,
  QTFF,
  Quality,
  WEBM,
  WebMOutputFormat,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  type ConversionVideoOptions,
  type DiscardedTrack,
  type InputAudioTrack,
  type InputFormat,
  type InputVideoTrack,
  type VideoCodec,
} from 'mediabunny'
import { isCropWithin, type CropRect } from '../core/image/crop'
import type { Dimensions } from '../core/image/resize'
import { MIN_VIDEO_CROP_SIDE, encodableCrop, encodableSize } from '../core/video/crop'
import { VIDEO_FORMATS, type VideoFormat } from '../core/video/formats'
import type { VideoErrorCode } from '../core/video/messages'
import type {
  CropJob,
  CropOutput,
  InspectJob,
  InspectOutput,
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

const QUALITY = new Quality('high')

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
}

/** Gera o vídeo no mesmo formato do original, sem metadados (localização, data, aparelho). */
async function convert(opened: OpenedVideo, options: ConvertOptions, onProgress: ProgressReporter): Promise<Blob> {
  const { input, format, video, audio } = opened
  const output = new Output({ format: outputFormatFor(format), target: new BufferTarget() })
  let conversion: Conversion
  try {
    conversion = await Conversion.init({
      input,
      output,
      trim: options.trim,
      video: (track) => (track.id === video.id ? options.video : { discard: true }),
      audio: (track) => (audio && track.id === audio.id ? {} : { discard: true }),
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
  return new Blob([buffer], { type: VIDEO_FORMATS[format].mimeType })
}

/**
 * Opções para recodificar o vídeo em alta qualidade. Medidas ímpares perdem 1 px (H.264 exige pares);
 * `area` é o recorte pedido, já com medidas pares.
 */
async function transcodeOptions(opened: OpenedVideo, area?: CropRect): Promise<ConversionVideoOptions> {
  const { video, format } = opened
  const full = await displaySize(video)
  const even = encodableSize(full)
  const crop = area ?? (even.width === full.width && even.height === full.height ? undefined : { x: 0, y: 0, ...even })
  const size = crop ?? full
  if (!(await video.canDecode())) throw new JobError('decode-unsupported')
  const codec = await getFirstEncodableVideoCodec(TRANSCODE_CODECS[format], { width: size.width, height: size.height, quality: QUALITY })
  if (!codec) throw new JobError('encode-unsupported')
  return {
    forceTranscode: true,
    codec,
    quality: QUALITY,
    ...(crop && { crop: { left: crop.x, top: crop.y, width: crop.width, height: crop.height } }),
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

async function inspect(job: InspectJob): Promise<InspectOutput> {
  const opened = await openVideo(job.file)
  try {
    const { input, format, video, audio, extraTracks } = opened
    const duration = await input.computeDuration(selectedTracks(opened))
    if (!(duration > 0)) throw new JobError('read-failed')
    const { width, height } = await displaySize(video)
    const even = encodableSize({ width, height })
    const canTranscodeVideo =
      (await video.canDecode()) && (await getFirstEncodableVideoCodec(TRANSCODE_CODECS[format], { ...even, quality: QUALITY })) !== null
    // Só o corte exato de WEBM recodifica o áudio (o formato não aceita começar antes do zero).
    const canTranscodeAudio =
      !audio ||
      ((await audio.canDecode()) && (await getFirstEncodableAudioCodec(['opus', 'vorbis'], { numberOfChannels: 2, sampleRate: 48_000 })) !== null)
    return {
      kind: 'inspect',
      info: {
        format,
        duration,
        width,
        height,
        codec: (await video.getCodec()) ?? '',
        hasAudio: audio !== null,
        canTranscodeVideo,
        canTranscodeAudio,
        extraTracks,
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
    const video = await reading(transcodeOptions(opened, area))
    const blob = await convert(opened, { video }, onProgress)
    return { kind: 'crop', blob, width: area.width, height: area.height }
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
    case 'crop':
      return crop(job, onProgress)
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
