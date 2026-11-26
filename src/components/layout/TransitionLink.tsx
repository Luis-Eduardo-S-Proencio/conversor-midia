import type { MouseEvent } from 'react'
import { Link, NavLink, type LinkProps, type NavLinkProps } from 'react-router'
import { setNavDirection, type NavDirection } from '../../app/nav-direction'

interface DirectionProps {
  /** Animação da troca de página: entrar mais fundo (padrão), trocar de aba ou voltar. */
  direction?: NavDirection
}

/** Link com a animação de troca de página (View Transitions, quando o navegador tem). */
export function TransitionLink({ direction = 'forward', onClick, ...rest }: LinkProps & DirectionProps) {
  return (
    <Link
      {...rest}
      viewTransition
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        setNavDirection(direction)
        onClick?.(event)
      }}
    />
  )
}

/** NavLink (marca a página atual com aria-current) com a animação de troca de página. */
export function TransitionNavLink({ direction = 'tab', onClick, ...rest }: NavLinkProps & DirectionProps) {
  return (
    <NavLink
      {...rest}
      viewTransition
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        setNavDirection(direction)
        onClick?.(event)
      }}
    />
  )
}
