import { useRouteError } from 'react-router'
import { Logo } from '../components/brand/Logo'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { buttonClasses } from '../components/ui/button-classes'

/** Erro inesperado de renderização. Fica fora do shell, que pode ser a causa do erro. */
export function ErrorPage() {
  const error = useRouteError()
  // Detalhes técnicos só no console de desenvolvimento.
  if (import.meta.env.DEV) console.error(error)

  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center justify-items-start gap-6 px-4 py-16">
      <title>Algo deu errado · Media Tools</title>
      <Logo />
      <PageHeader
        title="Algo deu errado"
        description="A página encontrou um erro inesperado. Recarregue para tentar de novo. Nenhum arquivo seu foi enviado."
      />
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => window.location.reload()}>
          Recarregar a página
        </Button>
        {/* Link comum: o estado do roteador pode ser justamente o que falhou. */}
        <a href="/" className={buttonClasses()}>
          Ir para o início
        </a>
      </div>
    </main>
  )
}
