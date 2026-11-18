/** 1 pixel = 0,75 ponto (96 dpi): o PDF abre em 100% com o tamanho real da imagem. */
const POINTS_PER_PIXEL = 0.75
/** Maior lado de página aceito pelos leitores de PDF comuns: 200 polegadas. */
const MAX_PAGE_POINTS = 14_400

// Só ASCII e os 4 bytes de marcação binária: 1 caractere = 1 byte, então posições batem.
const bytesOf = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0))
const points = (value: number) => String(Math.round(value * 100) / 100)

interface PdfImage {
  width: number
  height: number
  /** Tamanho, em bytes, do JPEG que vai entre `head` e `tail`. */
  imageLength: number
}

/**
 * PDF de uma página com uma imagem JPEG, sem nenhum metadado. Devolve o que vai antes e depois
 * do JPEG: ele entra no arquivo sem ser copiado nem recodificado.
 */
export function pdfParts({ width, height, imageLength }: PdfImage): { head: Uint8Array<ArrayBuffer>; tail: Uint8Array<ArrayBuffer> } {
  const scale = Math.min(POINTS_PER_PIXEL, MAX_PAGE_POINTS / Math.max(width, height))
  const pageWidth = points(width * scale)
  const pageHeight = points(height * scale)
  const content = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q`

  const header = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n' // a segunda linha marca o arquivo como binário
  const pages = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      '/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
  ]
  const imageStart =
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB ` +
    `/BitsPerComponent 8 /Filter /DCTDecode /Length ${imageLength} >>\nstream\n`
  const imageEnd = '\nendstream\nendobj\n'
  const contentObject = `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`

  const offsets: number[] = []
  let position = header.length
  for (const object of pages) {
    offsets.push(position)
    position += object.length
  }
  offsets.push(position)
  position += imageStart.length + imageLength + imageEnd.length
  offsets.push(position)
  position += contentObject.length

  // Cada linha da tabela xref tem exatamente 20 bytes.
  const xref = ['xref\n0 6\n', '0000000000 65535 f \n', ...offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)]
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${position}\n%%EOF\n`
  return {
    head: bytesOf(header + pages.join('') + imageStart),
    tail: bytesOf(imageEnd + contentObject + xref.join('') + trailer),
  }
}
