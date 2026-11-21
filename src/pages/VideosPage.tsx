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
          description="Corte trechos e recorte o quadro de vídeos MP4, MOV ou WEBM, direto no navegador."
        />
        <NavList items={VIDEO_TOOLS} columns={2} />
        <Alert variant="info" live={false} title="Mais ferramentas em breve">
          Converter, comprimir, mudar a resolução, extrair áudio e criar GIF chegam depois. Vídeos usam mais memória: cada
          ferramenta aceita vídeos de até 1 GB e mostra o progresso, com opção de cancelar.
        </Alert>
      </Container>
    </>
  )
}
