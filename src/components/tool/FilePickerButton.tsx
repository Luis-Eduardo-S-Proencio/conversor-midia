import { useRef, type ComponentProps, type ReactNode } from 'react'
import { Button } from '../ui/Button'

type ButtonProps = Omit<ComponentProps<typeof Button>, 'onClick' | 'onChange' | 'children' | 'type'>

interface FilePickerButtonProps extends ButtonProps {
  /** Filtro do seletor do sistema. Não substitui a validação do conteúdo. */
  accept: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  children: ReactNode
}

/** Botão real que abre o seletor do sistema (galeria ou arquivos no celular). */
export function FilePickerButton({ accept, multiple = true, onFiles, disabled, children, ...buttonProps }: FilePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <Button {...buttonProps} disabled={disabled} onClick={() => inputRef.current?.click()}>
        {children}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        hidden
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? [])
          if (files.length > 0) onFiles(files)
          // Permite escolher o mesmo arquivo de novo.
          event.currentTarget.value = ''
        }}
      />
    </>
  )
}
