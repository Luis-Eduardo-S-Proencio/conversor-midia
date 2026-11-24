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
          description="Corte, recorte, comprima, converta e diminua a resolução de vídeos MP4, MOV ou WEBM, salve só o som ou crie um GIF, direto no navegador."
        />
        <NavList items={VIDEO_TOOLS} columns={2} />
        <Alert variant="info" live={false} title="Vídeos de até 1 GB">
          Vídeos usam mais memória que fotos: cada ferramenta aceita vídeos de até 1 GB e mostra o progresso, com opção de
          cancelar.
        </Alert>
      </Container>
    </>
  )
}
