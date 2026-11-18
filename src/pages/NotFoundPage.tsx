import { Link } from 'react-router'
import { Container } from '../components/layout/Container'
import { PageHeader } from '../components/layout/PageHeader'
import { buttonClasses } from '../components/ui/button-classes'

export function NotFoundPage() {
  return (
    <>
      <title>Página não encontrada · Media Tools</title>
      <Container className="grid justify-items-start gap-6 py-16">
        <PageHeader
          title="Página não encontrada"
          description="O endereço não existe ou mudou. Confira o link ou volte para o início."
        />
        <Link to="/" className={buttonClasses()}>
          Ir para o início
        </Link>
      </Container>
    </>
  )
}
