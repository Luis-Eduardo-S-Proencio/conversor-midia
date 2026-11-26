import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { setNavDirection } from '../../app/nav-direction'

/**
 * Voltar da barra superior. Quem chegou navegando dentro do app volta no histórico (para onde
 * estava, com a rolagem restaurada). Quem abriu um link direto vai para o "pai" lógico da tela
 * (`fallback`), sem empilhar: no app instalado não existe o voltar do navegador.
 * A primeira tela aberta é a única com a chave "default" no roteador.
 */
export function useBack(fallback: string): () => void {
  const navigate = useNavigate()
  const { key } = useLocation()
  return useCallback(() => {
    setNavDirection('back')
    if (key !== 'default') void navigate(-1)
    else void navigate(fallback, { replace: true, viewTransition: true })
  }, [navigate, fallback, key])
}
