import { TransitionLink } from '../../components/layout/TransitionLink'
import { ContactLink, LEGAL_LINK, LEGAL_UPDATED, LegalDocument, LegalList, Strong, type LegalSection } from './LegalDocument'

const SECTIONS: readonly LegalSection[] = [
  {
    id: 'resumo',
    title: 'Resumo',
    content: (
      <LegalList>
        <li>
          Seus arquivos são processados <Strong>no seu aparelho</Strong> e nunca são enviados para nós.
        </li>
        <li>Não pedimos cadastro, nome, e-mail ou telefone.</li>
        <li>Não usamos cookies, anúncios, rastreadores nem ferramentas de análise de visitas.</li>
        <li>A empresa que hospeda o site registra dados técnicos de acesso, como qualquer site na internet.</li>
      </LegalList>
    ),
  },
  {
    id: 'arquivos',
    title: 'Seus arquivos',
    content: (
      <>
        <p>
          As imagens e os vídeos que você abre são lidos e processados pelo próprio navegador, no seu aparelho.
          Eles <Strong>não são enviados</Strong> a nenhum servidor, não passam por nós e não são vistos por
          ninguém.
        </p>
        <p>
          Os arquivos ficam só na memória da página enquanto você usa a ferramenta e somem quando você fecha a
          página, troca de arquivo ou sai da ferramenta. Não são guardados no aparelho nem na internet.
        </p>
        <p>
          Os resultados saem sem os metadados do original, como data, modelo do aparelho e localização (GPS), o que
          evita que essas informações sigam junto quando você compartilha o arquivo.
        </p>
      </>
    ),
  },
  {
    id: 'nao-coletamos',
    title: 'O que não coletamos',
    content: (
      <>
        <p>O Media Tools não coleta nem guarda:</p>
        <LegalList>
          <li>o conteúdo, o nome ou as informações dos seus arquivos;</li>
          <li>dados de cadastro, como nome, e-mail, telefone ou documento;</li>
          <li>dados de pagamento, porque o serviço é gratuito;</li>
          <li>sua localização, contatos, câmera ou microfone;</li>
          <li>histórico do que você faz nas ferramentas.</li>
        </LegalList>
      </>
    ),
  },
  {
    id: 'hospedagem',
    title: 'Dados técnicos da hospedagem',
    content: (
      <>
        <p>
          O site é hospedado pela Vercel Inc., nos Estados Unidos. Como em qualquer site, ao abrir uma página o seu
          navegador pede os arquivos do site aos servidores dela, que registram dados técnicos da conexão:
        </p>
        <LegalList>
          <li>endereço IP, data e hora do acesso;</li>
          <li>página pedida e tipo de navegador e de sistema;</li>
          <li>região aproximada, deduzida do endereço IP.</li>
        </LegalList>
        <p>
          Esses registros servem para entregar o site, proteger contra ataques e corrigir falhas, com base no
          legítimo interesse (art. 7º, IX, da LGPD) e no Marco Civil da Internet. Eles são guardados por tempo
          limitado, conforme a{' '}
          <a href="https://vercel.com/legal/privacy-policy" rel="noopener noreferrer" className={LEGAL_LINK}>
            política de privacidade da Vercel
          </a>
          , e não são usados para identificar você, montar perfil ou fazer publicidade. Como a Vercel fica fora do
          Brasil, esses dados podem ser tratados no exterior, com as garantias previstas na LGPD (art. 33).
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies e armazenamento',
    content: (
      <p>
        O Media Tools <Strong>não usa cookies</Strong> nem guarda informações no armazenamento do navegador. As
        fontes, os ícones e todo o código vêm do próprio site, sem serviços de terceiros que possam rastrear a
        sua visita. Se você instalar o app, o sistema guarda apenas o atalho e os arquivos do site, como faz com
        qualquer app.
      </p>
    ),
  },
  {
    id: 'compartilhamento',
    title: 'Compartilhamento de dados',
    content: (
      <>
        <p>Não vendemos, alugamos nem compartilhamos dados pessoais, até porque não os coletamos.</p>
        <p>
          O botão Compartilhar usa a janela de compartilhar do seu próprio aparelho: o arquivo vai direto para o
          app que você escolher, sem passar por nós. A partir daí, vale a política de privacidade desse app.
        </p>
        <p>
          Os registros técnicos da hospedagem só seriam entregues a uma autoridade mediante ordem judicial ou
          exigência legal.
        </p>
      </>
    ),
  },
  {
    id: 'seguranca',
    title: 'Segurança',
    content: (
      <p>
        O site só abre por conexão segura (HTTPS) e usa regras de segurança do navegador que impedem que a página
        carregue código de outros endereços ou envie dados para fora. Como os seus arquivos não saem do aparelho,
        eles não ficam expostos a vazamentos em servidores. Nenhum sistema é totalmente invulnerável; mantenha o
        navegador e o aparelho atualizados.
      </p>
    ),
  },
  {
    id: 'direitos',
    title: 'Seus direitos pela LGPD',
    content: (
      <>
        <p>A Lei Geral de Proteção de Dados (Lei 13.709/2018, art. 18) garante a você o direito de:</p>
        <LegalList>
          <li>confirmar se tratamos dados seus e ter acesso a eles;</li>
          <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários;</li>
          <li>saber com quem os dados foram compartilhados;</li>
          <li>se opor a um tratamento e revogar um consentimento;</li>
          <li>reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</li>
        </LegalList>
        <p>
          Para exercer qualquer um deles, escreva para o contato abaixo. Como não guardamos dados que identifiquem
          você, na maior parte dos casos não haverá dado nenhum a mostrar ou apagar, mas responderemos em até 15
          dias.
        </p>
      </>
    ),
  },
  {
    id: 'criancas',
    title: 'Crianças e adolescentes',
    content: (
      <p>
        O Media Tools não coleta dados de ninguém, inclusive de crianças e adolescentes. Ainda assim, o uso por
        menores de idade deve ter o acompanhamento dos pais ou responsáveis.
      </p>
    ),
  },
  {
    id: 'mudancas',
    title: 'Mudanças nesta política',
    content: (
      <p>
        Se o Media Tools passar a tratar dados de outra forma, esta política será atualizada antes, com a nova
        data no topo da página. Mudanças importantes, como passar a coletar algum dado, serão avisadas no próprio
        site. Veja também os{' '}
        <TransitionLink to="/termos" className={LEGAL_LINK}>
          Termos de uso
        </TransitionLink>
        .
      </p>
    ),
  },
  {
    id: 'contato',
    title: 'Responsável e contato',
    content: (
      <>
        <p>
          O responsável pelo Media Tools e controlador dos dados descritos aqui, nos termos da LGPD, é{' '}
          <Strong>Luis Eduardo Silverio Proencio</Strong>, que também atua como encarregado pelo tratamento de
          dados (art. 41).
        </p>
        <p>
          Para falar sobre privacidade, proteção de dados ou para exercer os seus direitos, escreva para{' '}
          <ContactLink /> ou ligue para{' '}
          <a href="tel:+5542999691116" className={LEGAL_LINK}>
            (42) 99969-1116
          </a>
          .
        </p>
      </>
    ),
  },
]

/** Política de privacidade do Media Tools (/privacidade), ligada pelo rodapé do menu (☰). */
export function PrivacyPage() {
  return (
    <LegalDocument
      title="Política de privacidade"
      updated={LEGAL_UPDATED}
      summary={
        <p>
          Como o Media Tools trata as suas informações. Em resumo: seus arquivos nunca saem do seu aparelho, não
          pedimos cadastro e não usamos cookies nem rastreadores.
        </p>
      }
      sections={SECTIONS}
    />
  )
}
