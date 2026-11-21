/**
 * Tempos do vídeo em texto, no padrão brasileiro: "1:05,30" (minutos:segundos,centésimos).
 * Funções puras: sem DOM e sem React.
 */

const pad = (value: number) => String(value).padStart(2, '0')

/** Divide em horas, minutos, segundos e centésimos, arredondando para o centésimo mais próximo. */
function split(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError(`Tempo inválido: ${seconds}`)
  const centiseconds = Math.round(seconds * 100)
  return {
    hours: Math.floor(centiseconds / 360_000),
    minutes: Math.floor(centiseconds / 6000) % 60,
    secs: Math.floor(centiseconds / 100) % 60,
    hundredths: centiseconds % 100,
  }
}

/** Tempo para os campos e para a interface: "0:04,60", "12:30,05", "1:02:03,45". */
export function formatTime(seconds: number): string {
  const { hours, minutes, secs, hundredths } = split(seconds)
  const clock = hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`
  return `${clock},${pad(hundredths)}`
}

/** Duração na linha técnica do arquivo, em segundos inteiros, como nos players: "0:04", "1:02:03". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError(`Duração inválida: ${seconds}`)
  const whole = Math.floor(seconds)
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor(whole / 60) % 60
  const secs = whole % 60
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`
}

// Segundos soltos ("75", "75,5") ou relógio com minutos e, opcionalmente, horas ("1:05", "1:02:03,45").
// Fração com vírgula ou ponto, até milésimos.
const SECONDS_ONLY = /^(\d+)(?:[,.](\d{1,3}))?$/
const CLOCK = /^(?:(\d+):)?(\d+):(\d{1,2})(?:[,.](\d{1,3}))?$/

const fraction = (digits: string | undefined) => (digits ? Number(`0.${digits}`) : 0)

/** Lê um tempo digitado. `null` quando o texto não é um tempo válido. */
export function parseTime(text: string): number | null {
  const value = text.trim()
  const plain = SECONDS_ONLY.exec(value)
  if (plain) return Number(plain[1]) + fraction(plain[2])

  const clock = CLOCK.exec(value)
  if (!clock) return null
  const [, hoursText, minutesText = '0', secondsText = '0', fractionText] = clock
  const hours = hoursText === undefined ? 0 : Number(hoursText)
  const minutes = Number(minutesText)
  const secs = Number(secondsText)
  // Com relógio, segundos passam de 59 só por engano; minutos também, quando há horas.
  if (secs > 59 || (hoursText !== undefined && minutes > 59)) return null
  return hours * 3600 + minutes * 60 + secs + fraction(fractionText)
}
