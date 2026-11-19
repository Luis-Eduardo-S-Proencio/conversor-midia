import { VIDEO_TOOLS } from '../app/tool-catalog'
import { Container } from '../components/layout/Container'
import { PageHeader } from '../components/layout/PageHeader'
import { Alert } from '../components/ui/Alert'
import { NavList } from '../components/ui/NavList'

export function VideosPage() {
  return (
    <>
      <title>Vídeos · Media Tools</title>
      <Container className="grid gap-8 py-10 md:py-14">
        <PageHeader
          title="Ferramentas de vídeo"
          description="Converter, comprimir, cortar trechos, extrair áudio e criar GIF, também direto no navegador."
        />
        <Alert variant="info" live={false} title="Em breve">
          As ferramentas de vídeo chegam depois das de imagem. Vídeos exigem mais memória, por isso cada ferramenta vai
          informar os limites antes de começar.
        </Alert>
        <NavList items={VIDEO_TOOLS} columns={2} />
      </Container>
    </>
  )
}
