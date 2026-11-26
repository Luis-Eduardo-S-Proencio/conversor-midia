import { Link } from 'react-router'
import { Container } from '../components/layout/Container'
import { TopAppBar } from '../components/layout/TopAppBar'
import { buttonClasses } from '../components/ui/button-classes'

export function NotFoundPage() {
  return (
    <>
      <title>Página não encontrada · Media Tools</title>
      <TopAppBar title="Página não encontrada" backTo="/" />
      <Container className="grid justify-items-start gap-6 pt-6 pb-16">
        <p className="max-w-text text-body text-fg-muted">O endereço não existe ou mudou. Confira o link ou volte para o início.</p>
        <Link to="/" className={buttonClasses()}>
          Ir para o início
        </Link>
      </Container>
    </>
  )
}
