import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { SIZE_DESTINATIONS, parseSizeDestination, type SizeDestination, type SizeDestinationId } from '../../../app/destinations'
import type { Dimensions } from '../../../core/image/resize'
import {
  DEFAULT_COMPRESSION,
  KEPT_ORIGINAL_VIDEO_NOTE,
  compressedSize,
  compressedVideoBitrate,
  estimateCompressedBytes,
  keepsOriginal,
  planForTarget,
  type CompressionLevel,
  type SizeEstimate,
} from '../../../core/video/compress'
import { VIDEO_FORMATS } from '../../../core/video/formats'
import { videoOutputName } from '../../../core/video/output-name'
import { useVideoTool, type Delivery } from '../shared/useVideoTool'
import { COMPRESS_LABELS, COMPRESS_SUFFIX } from './settings'

export interface CompressionPlan {
  size: Dimensions
  /** Taxa do vídeo, em bits por segundo. */
  bitrate: number
  estimate: SizeEstimate
  /** Enviar por um destino com limite (WhatsApp, e-mail, Discord): o tamanho é calculado para caber. */
  destination?: SizeDestination
  /** Cabe no limite do destino com imagem assistível? Sempre verdadeiro sem destino. */
  fits: boolean
}

/**
 * Comprimir vídeo: um vídeo por vez, em três níveis ou para caber no limite de um destino
 * ("Comprimir até X MB"), com o tamanho estimado antes de começar. Um atalho pode trazer o destino
 * no endereço (?destino=whatsapp).
 */
export function useCompressTool() {
  const tool = useVideoTool(COMPRESS_LABELS, { checkSizeControl: true })
  const { info, file } = tool.state
  const { invalidateResult, run } = tool
  const [searchParams] = useSearchParams()
  const [level, setLevel] = useState<CompressionLevel>(DEFAULT_COMPRESSION)
  const [destination, setDestination] = useState<SizeDestinationId | undefined>(() => parseSizeDestination(searchParams.get('destino')))

  const plan = useMemo<CompressionPlan | undefined>(() => {
    if (!info || !file) return undefined
    const source = { duration: info.duration, originalBytes: file.size, audioBitrate: info.audioBitrate }
    if (destination) {
      const target = SIZE_DESTINATIONS[destination]
      const { size, bitrate, fits } = planForTarget(
        { ...source, size: { width: info.width, height: info.height }, codec: info.codec },
        target,
        info.format,
      )
      return { size, bitrate, estimate: estimateCompressedBytes(source, bitrate), destination: target, fits }
    }
    const size = compressedSize(info, level)
    const bitrate = compressedVideoBitrate(size, level, info.format)
    return { size, bitrate, estimate: estimateCompressedBytes(source, bitrate), fits: true }
  }, [info, file, level, destination])

  const changeLevel = useCallback(
    (next: CompressionLevel) => {
      setLevel(next)
      setDestination(undefined)
      invalidateResult()
    },
    [invalidateResult],
  )

  /** Escolher um destino (ou tirar, com `undefined`): o tamanho passa a ser calculado para caber nele. */
  const changeDestination = useCallback(
    (next: SizeDestinationId | undefined) => {
      setDestination(next)
      invalidateResult()
    },
    [invalidateResult],
  )

  const apply = useCallback(() => {
    if (!plan || !plan.fits || !info?.canTranscodeVideo || !info.controlsSize) return
    const { size, bitrate } = plan
    const { format } = info
    /** Nunca entrega algo maior: se a versão comprimida não ganhar espaço, o original volta intacto, com o motivo. */
    const deliver = (output: { blob: Blob }, original: File): Delivery =>
      keepsOriginal(output.blob.size, original.size)
        ? {
            blob: new Blob([original], { type: VIDEO_FORMATS[format].mimeType }),
            name: videoOutputName(original.name, format, ''),
            note: KEPT_ORIGINAL_VIDEO_NOTE,
          }
        : { blob: output.blob, name: videoOutputName(original.name, format, COMPRESS_SUFFIX) }
    void run((chosen) => ({ kind: 'compress', file: chosen, width: size.width, height: size.height, bitrate }), deliver)
  }, [plan, info, run])

  return { tool, level, destination, plan, changeLevel, changeDestination, apply }
}
