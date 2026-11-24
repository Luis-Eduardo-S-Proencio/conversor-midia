import type { CropRect } from '../core/image/crop'
import type { AudioFormat } from '../core/video/audio'
import type { TrackAction, VideoMode } from '../core/video/convert'
import type { VideoFormat } from '../core/video/formats'
import type { GifFrameRate } from '../core/video/gif'
import type { VideoErrorCode } from '../core/video/messages'
import type { TrimMode, TrimRange } from '../core/video/trim'

/* Tarefas que o Worker de vídeo executa. O vídeo resultante sai no mesmo formato do original, menos ao converter. */

/** Abre o vídeo: formato, duração, medidas e o que este navegador consegue fazer com ele. */
export interface InspectJob {
  kind: 'inspect'
  file: Blob
  /** Confere também se o codificador respeita a taxa pedida (só o comprimir precisa; leva uma fração de segundo). */
  checkSizeControl?: boolean
}

/** Mantém só o trecho entre `start` e `end`, em segundos. */
export interface TrimJob {
  kind: 'trim'
  file: Blob
  start: number
  end: number
  mode: TrimMode
}

/**
 * Mantém os trechos pedidos (em segundos, em ordem e sem sobreposição) e os junta, um logo depois do
 * outro: é assim que partes do meio são removidas. O vídeo e o som são recodificados.
 */
export interface JoinJob {
  kind: 'join'
  file: Blob
  ranges: TrimRange[]
}

/** Mantém só a área pedida, em pixels do quadro como ele aparece (rotação já aplicada). */
export interface CropJob {
  kind: 'crop'
  file: Blob
  crop: CropRect
}

/**
 * Refaz o vídeo nas medidas (pares, como ele aparece, nunca maiores que as dele) e na taxa de bits pedidas;
 * o som é copiado. Serve ao Comprimir e ao Mudar resolução.
 */
export interface CompressJob {
  kind: 'compress'
  file: Blob
  width: number
  height: number
  /** Taxa do vídeo, em bits por segundo. */
  bitrate: number
}

/**
 * Salva só o som, no formato pedido. Quando o formato comporta o som original (AAC em M4A, Opus em WEBM),
 * ele é copiado sem refazer; senão, é refeito (M4A em AAC, MP3).
 */
export interface ExtractAudioJob {
  kind: 'extract-audio'
  file: Blob
  format: AudioFormat
}

/**
 * Troca o formato do arquivo (MP4, MOV ou WEBM, diferente do original). O que o formato novo comporta é
 * copiado sem refazer; o resto é refeito (H.264 e AAC no MP4 e no MOV, VP9 e Opus no WEBM), pelas regras de
 * `core/video/convert.ts`.
 */
export interface ConvertJob {
  kind: 'convert'
  file: Blob
  format: VideoFormat
  /** Só muda algo para HEVC indo para MP4 ou MOV: "fast" copia o HEVC; "compatible" o refaz em H.264. */
  mode: VideoMode
  /** Taxa do vídeo, em bits por segundo, usada se ele for refeito. */
  bitrate: number
  /** Taxa do som, em bits por segundo, usada se ele for refeito. */
  audioBitrate: number
}

/**
 * GIF animado de um trecho (em segundos, de no máximo `MAX_GIF_SECONDS`), nas medidas pedidas (nunca maiores
 * que as do vídeo, como ele aparece) e com `fps` quadros por segundo. Sem som: o GIF não tem.
 */
export interface GifJob {
  kind: 'gif'
  file: Blob
  start: number
  end: number
  width: number
  height: number
  fps: GifFrameRate
}

export type VideoJob = InspectJob | TrimJob | JoinJob | CropJob | CompressJob | ExtractAudioJob | ConvertJob | GifJob

/** Tarefas que geram um arquivo (todas menos abrir). */
export type ProcessingJob = Exclude<VideoJob, InspectJob>

/* Resultados, um por tipo de tarefa. */

export interface VideoInfo {
  format: VideoFormat
  /** Em segundos. */
  duration: number
  /** Medidas do quadro como ele aparece: rotação e proporção de pixel já aplicadas. */
  width: number
  height: number
  /** Codec do vídeo como o Mediabunny o nomeia ("avc", "hevc", "vp9"...). */
  codec: string
  hasAudio: boolean
  /** Taxa média do som, em bits por segundo (`null` sem som): entra na estimativa do tamanho comprimido. */
  audioBitrate: number | null
  /** O navegador decodifica o vídeo e codifica o resultado: sem isso, só dá para copiar (corte rápido). */
  canTranscodeVideo: boolean
  /** O navegador decodifica o vídeo (ler os quadros basta para criar GIF). */
  canDecodeVideo: boolean
  /**
   * O navegador decodifica o som e o codifica no formato de som do arquivo (AAC no MP4 e no MOV, Opus
   * no WEBM); sempre verdadeiro sem som. Recodificam o som: remover partes e o corte exato de WEBM.
   */
  canTranscodeAudio: boolean
  /** Codec do som como o Mediabunny o nomeia ("aac", "opus", "pcm-s16"...); `null` sem som. */
  audioCodec: string | null
  /** O navegador decodifica o som (falso sem som): é preciso para refazê-lo em outro formato. */
  canDecodeAudio: boolean
  /** O navegador decodifica o som e gera AAC (extrair em M4A refeito). O Firefox não gera AAC. */
  canEncodeAac: boolean
  /** O navegador decodifica o som e roda o codificador próprio de MP3 (WebAssembly). */
  canEncodeMp3: boolean
  /** Tem rotação gravada (ex.: celular em pé). O WEBM não guarda rotação: converter para ele refaz o vídeo. */
  rotated: boolean
  /**
   * Para cada formato, se o navegador consegue refazer o vídeo e o som nos codecs dele (H.264 e AAC no MP4
   * e no MOV, VP9 e Opus no WEBM): é o que o Converter vídeo precisa quando não dá para copiar. Som: falso sem som.
   */
  reencodable: Record<VideoFormat, { video: boolean; audio: boolean }>
  /** Há mais de uma faixa de vídeo ou de áudio: o resultado fica só com as principais. */
  extraTracks: boolean
  /**
   * O codificador deste navegador gera arquivos menores quando a taxa pedida é menor (o do Firefox,
   * ao menos no Playwright, ignora a taxa no H.264). Só vem quando pedido em `checkSizeControl`.
   */
  controlsSize?: boolean
}

export interface InspectOutput {
  kind: 'inspect'
  info: VideoInfo
}

export interface TrimOutput {
  kind: 'trim'
  blob: Blob
  /** O vídeo foi copiado sem recodificar (corte rápido, ou início num quadro-chave). */
  copied: boolean
}

export interface JoinOutput {
  kind: 'join'
  blob: Blob
}

export interface CropOutput {
  kind: 'crop'
  blob: Blob
  width: number
  height: number
}

export interface CompressOutput {
  kind: 'compress'
  blob: Blob
}

export interface ExtractAudioOutput {
  kind: 'extract-audio'
  blob: Blob
  /** O som foi copiado como estava, sem refazer. */
  copied: boolean
}

export interface ConvertOutput {
  kind: 'convert'
  blob: Blob
  video: TrackAction
  /** `null` sem som. */
  audio: TrackAction | null
}

export interface GifOutput {
  kind: 'gif'
  blob: Blob
  /** Quadros gravados. */
  frames: number
}

export type VideoJobOutput = InspectOutput | TrimOutput | JoinOutput | CropOutput | CompressOutput | ExtractAudioOutput | ConvertOutput | GifOutput

export type VideoOutputFor<J extends VideoJob> = Extract<VideoJobOutput, { kind: J['kind'] }>

/* Mensagens trocadas com o Worker: todo pedido termina com uma resposta de sucesso ou de erro. */

export type VideoWorkerRequest = VideoJob & { id: number }

export type VideoWorkerResponse =
  /** De 0 a 1, enquanto processa. */
  | { id: number; type: 'progress'; value: number }
  | { id: number; type: 'done'; output: VideoJobOutput }
  | { id: number; type: 'error'; code: VideoErrorCode }
