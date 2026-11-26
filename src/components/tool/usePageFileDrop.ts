import { useEffect, useState } from 'react'

function carriesFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false
}

/**
 * Aceita arquivos soltos em qualquer ponto da página.
 * Sem isto, soltar fora da área de upload faz o navegador abrir a imagem e sair da página.
 * Quando a área de upload já tratou o evento (`defaultPrevented`), nada é feito aqui.
 * Devolve se há arquivos sendo arrastados sobre a página, para mostrar "Solte para abrir".
 */
export function usePageFileDrop(onFiles: (files: File[]) => void, enabled: boolean): boolean {
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    // dragenter/dragleave disparam a cada elemento cruzado: a contagem diz se ainda está sobre a página.
    let depth = 0

    function handleDragEnter(event: DragEvent) {
      if (!carriesFiles(event)) return
      depth += 1
      setDragging(true)
    }

    function handleDragLeave(event: DragEvent) {
      if (!carriesFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }

    function handleDragOver(event: DragEvent) {
      if (carriesFiles(event)) event.preventDefault()
    }

    function handleDrop(event: DragEvent) {
      depth = 0
      setDragging(false)
      if (!carriesFiles(event) || event.defaultPrevented) return
      event.preventDefault()
      const files = Array.from(event.dataTransfer?.files ?? [])
      if (enabled && files.length > 0) onFiles(files)
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [onFiles, enabled])

  return enabled && dragging
}
