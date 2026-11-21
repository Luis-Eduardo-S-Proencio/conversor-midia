import { Pause, Play } from 'lucide-react'
import { useRef, useState } from 'react'
import { CropArea } from '../../../components/tool/CropArea'
import { IconButton } from '../../../components/ui/Button'
import { Slider } from '../../../components/ui/Slider'
import type { CropRect } from '../../../core/image/crop'
import type { Dimensions } from '../../../core/image/resize'
import { formatTime } from '../../../core/video/time'

interface VideoCropPreviewProps {
  /** URL temporária do vídeo (quem a cria a libera). */
  src: string
  name: string
  size: Dimensions
  duration: number
  crop: CropRect
  ratio?: number
  onChange: (crop: CropRect) => void
  disabled?: boolean
}

/**
 * Área de recorte sobre o vídeo. Os controles do navegador ficariam sob a área (inalcançáveis), então
 * reproduzir, pausar e escolher o momento ficam abaixo dela, para conferir o enquadramento ao longo do vídeo.
 */
export function VideoCropPreview({ src, name, size, duration, crop, ratio, onChange, disabled = false }: VideoCropPreviewProps) {
  const video = useRef<HTMLVideoElement>(null)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [unplayable, setUnplayable] = useState(false)

  function togglePlayback() {
    const element = video.current
    if (!element) return
    if (!element.paused) {
      element.pause()
      return
    }
    element.play().catch(() => {
      setPlaying(false) // o navegador recusou tocar: o botão volta a "Reproduzir"
    })
  }

  function seek(value: number) {
    if (video.current) video.current.currentTime = value
    setTime(value)
  }

  return (
    <div className="grid gap-3">
      <CropArea size={size} crop={crop} ratio={ratio} onChange={onChange} disabled={disabled}>
        <video
          ref={video}
          src={src}
          muted
          playsInline
          preload="auto"
          aria-label={`Vídeo ${name}`}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setUnplayable(true)}
          className="bg-checker"
        />
      </CropArea>
      {unplayable ? (
        <p className="text-sm text-fg-muted">
          Este navegador não consegue mostrar este vídeo, mas você ainda pode recortá-lo digitando as medidas.
        </p>
      ) : (
        <div className="flex items-end gap-3">
          <IconButton icon={playing ? Pause : Play} label={playing ? 'Pausar' : 'Reproduzir'} variant="secondary" onClick={togglePlayback} />
          <Slider
            label="Momento do vídeo"
            value={Math.min(time, duration)}
            min={0}
            max={duration}
            step={0.01}
            onChange={seek}
            formatValue={formatTime}
            className="min-w-0 flex-1"
          />
        </div>
      )}
    </div>
  )
}
