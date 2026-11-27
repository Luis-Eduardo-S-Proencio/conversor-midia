import { TransitionLink } from '../../components/layout/TransitionLink'
import { ContactLink, LEGAL_LINK, TERMS_UPDATED, LegalDocument, LegalList, Strong, type LegalSection } from './LegalDocument'

const SECTIONS: readonly LegalSection[] = [
  {
    id: 'aceitacao',
    title: 'Aceitação dos termos',
    content: (
      <>
        <p>
          Estes Termos de uso regem o acesso e o uso do Media Tools, disponível neste site e na versão instalada
          como app. Ao usar o Media Tools, você declara que leu, entendeu e concorda com estes termos e com a{' '}
          <TransitionLink to="/privacidade" className={LEGAL_LINK}>
            Política de privacidade
          </TransitionLink>
          , que faz parte deles.
        </p>
        <p>Se não concordar com alguma condição, não use o serviço.</p>
      </>
    ),
  },
  {
    id: 'o-servico',
    title: 'O que é o Media Tools',
    content: (
      <>
        <p>
          O Media Tools é uma ferramenta gratuita para converter, comprimir e editar imagens e vídeos. Não exige
          cadastro, conta ou pagamento.
        </p>
        <p>
          Todo o processamento é feito <Strong>no seu próprio aparelho</Strong>, pelo navegador. O Media Tools não
          tem servidores que recebam, guardem ou vejam os seus arquivos.
        </p>
      </>
    ),
  },
  {
    id: 'seus-arquivos',
    title: 'Seus arquivos',
    content: (
      <>
        <p>
          Os arquivos que você abre <Strong>não são enviados pela internet</Strong>. Eles ficam na memória do
          navegador enquanto a página está aberta e são descartados quando você fecha a página, troca de arquivo ou
          sai da ferramenta.
        </p>
        <p>
          Como nada é guardado por nós, não há como recuperar um arquivo depois que a página é fechada. Guarde
          sempre uma cópia do original e baixe o resultado antes de sair.
        </p>
      </>
    ),
  },
  {
    id: 'uso-permitido',
    title: 'Uso permitido e proibido',
    content: (
      <>
        <p>Você pode usar o Media Tools para fins pessoais ou profissionais, desde que de forma lícita. É proibido usá-lo para:</p>
        <LegalList>
          <li>processar conteúdo ilegal, como material de abuso sexual infantil, ou que viole direitos de terceiros;</li>
          <li>violar direitos autorais, marcas, imagem ou privacidade de outras pessoas;</li>
          <li>criar conteúdo para fraude, difamação, assédio ou para enganar alguém;</li>
          <li>tentar invadir, sobrecarregar, copiar em massa ou atrapalhar o funcionamento do site;</li>
          <li>apresentar o Media Tools ou partes dele como se fossem seus, ou revendê-lo.</li>
        </LegalList>
        <p>
          Como o processamento acontece no seu aparelho, nós não vemos nem controlamos o que você faz com a
          ferramenta. Por isso, <Strong>você é o único responsável</Strong> pelo conteúdo que processa e pelo uso
          que faz dos resultados.
        </p>
      </>
    ),
  },
  {
    id: 'direitos-conteudo',
    title: 'Direitos sobre o seu conteúdo',
    content: (
      <>
        <p>
          Os arquivos e os resultados continuam <Strong>sendo seus</Strong>. O Media Tools não adquire nenhum
          direito sobre eles e não coloca marca d'água.
        </p>
        <p>
          Ao usar a ferramenta, você declara ter o direito de usar e modificar o conteúdo que processa, seja por
          ser o autor, seja por ter autorização de quem é.
        </p>
      </>
    ),
  },
  {
    id: 'resultados',
    title: 'Resultados, qualidade e metadados',
    content: (
      <>
        <p>
          Converter e comprimir pode reduzir a qualidade, e o resultado depende do arquivo, das opções escolhidas e
          dos recursos do seu navegador e do aparelho. Confira sempre o resultado antes de usá-lo; o Media Tools
          mostra como ficou antes de você baixar.
        </p>
        <LegalList>
          <li>
            Os resultados saem <Strong>sem os metadados</Strong> do original (data, aparelho e localização), para
            proteger a sua privacidade. Se você precisa deles, guarde o original.
          </li>
          <li>Alguns formatos e recursos podem não estar disponíveis em todos os navegadores; quando for o caso, a tela avisa.</li>
          <li>Arquivos muito grandes podem esgotar a memória do aparelho; os limites de tamanho aparecem em cada ferramenta.</li>
        </LegalList>
      </>
    ),
  },
  {
    id: 'disponibilidade',
    title: 'Gratuidade e disponibilidade',
    content: (
      <>
        <p>
          O Media Tools é oferecido de graça, <Strong>no estado em que se encontra</Strong>. Fazemos o possível
          para que funcione bem, mas não garantimos que esteja sempre disponível, sem erros ou que atenda a uma
          necessidade específica.
        </p>
        <p>
          Podemos mudar, suspender ou encerrar ferramentas, ou o serviço inteiro, a qualquer momento e sem aviso
          prévio. Como o serviço é gratuito e não guarda nada seu, isso não gera direito a indenização.
        </p>
      </>
    ),
  },
  {
    id: 'responsabilidade',
    title: 'Limitação de responsabilidade',
    content: (
      <>
        <p>Na máxima extensão permitida pela lei brasileira, o Media Tools e o seu responsável não respondem por:</p>
        <LegalList>
          <li>perda de arquivos, de dados ou de trabalho, inclusive por falta de cópia do original;</li>
          <li>danos causados pelo uso dos resultados, pela perda de qualidade ou por um resultado diferente do esperado;</li>
          <li>falhas do seu aparelho, do navegador, da conexão ou de serviços de terceiros;</li>
          <li>uso indevido da ferramenta, inclusive o que viole estes termos ou direitos de outras pessoas;</li>
          <li>lucros cessantes ou danos indiretos de qualquer natureza.</li>
        </LegalList>
        <p>
          Nada nestes termos afasta direitos que a lei garante e que não podem ser renunciados, inclusive os do
          Código de Defesa do Consumidor, quando aplicável.
        </p>
      </>
    ),
  },
  {
    id: 'terceiros',
    title: 'Software de terceiros',
    content: (
      <p>
        O Media Tools usa bibliotecas de código aberto, cada uma sob a sua própria licença. Os avisos e os textos
        dessas licenças estão em{' '}
        <TransitionLink to="/sobre/licencas" className={LEGAL_LINK}>
          Licenças de código aberto
        </TransitionLink>
        .
      </p>
    ),
  },
  {
    id: 'propriedade',
    title: 'Propriedade intelectual',
    content: (
      <p>
        O nome Media Tools, o logotipo, o visual e o código do site pertencem ao seu responsável e são protegidos
        pela lei de direitos autorais e de propriedade industrial, ressalvadas as bibliotecas de terceiros, que
        seguem as próprias licenças. Usar a ferramenta não dá a você nenhum direito sobre essas marcas e
        criações.
      </p>
    ),
  },
  {
    id: 'mudancas',
    title: 'Mudanças nestes termos',
    content: (
      <p>
        Estes termos podem ser atualizados para acompanhar mudanças no serviço ou na lei. A data da última
        atualização fica no topo desta página. Se você continuar usando o Media Tools depois de uma mudança,
        estará de acordo com a nova versão.
      </p>
    ),
  },
  {
    id: 'lei',
    title: 'Lei aplicável e foro',
    content: (
      <p>
        Estes termos seguem as leis da República Federativa do Brasil, em especial o Marco Civil da Internet (Lei
        12.965/2014), a Lei Geral de Proteção de Dados (Lei 13.709/2018) e, quando aplicável, o Código de Defesa
        do Consumidor (Lei 8.078/1990). Qualquer conflito será resolvido no foro do domicílio do usuário, como
        garante a lei ao consumidor. Se uma cláusula for considerada inválida, as demais continuam valendo.
      </p>
    ),
  },
  {
    id: 'contato',
    title: 'Contato',
    content: (
      <p>
        Dúvidas, sugestões ou avisos sobre estes termos, inclusive sobre conteúdo que viole direitos: escreva para{' '}
        <ContactLink />.
      </p>
    ),
  },
]

/** Termos de uso do Media Tools (/termos), ligados pelo rodapé do menu (☰). */
export function TermsPage() {
  return (
    <LegalDocument
      title="Termos de uso"
      updated={TERMS_UPDATED}
      summary={
        <p>
          As regras para usar o Media Tools. Em resumo: é gratuito, seus arquivos são processados no seu aparelho
          e nunca enviados para nós, e você é responsável pelo que faz com eles.
        </p>
      }
      sections={SECTIONS}
    />
  )
}
