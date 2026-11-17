import { IMAGE_TOOLS } from '../app/tool-catalog'
import { Container } from '../components/layout/Container'
import { PageHeader } from '../components/layout/PageHeader'
import { NavList } from '../components/ui/NavList'

export function ImagesPage() {
  return (
    <>
      <title>Imagens · Media Tools</title>
      <Container className="grid gap-8 py-10 md:py-14">
        <PageHeader
          title="Ferramentas de imagem"
          description="Converta, comprima e edite fotos em JPG, PNG e WEBP. Tudo acontece no seu navegador."
        />
        <NavList items={IMAGE_TOOLS} columns={2} />
        <p className="text-sm text-fg-subtle">As ferramentas estão em construção e serão liberadas uma a uma.</p>
      </Container>
    </>
  )
}
