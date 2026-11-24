# Design System do Media Tools

Guia de uso da identidade visual e dos componentes. **Os valores (cores, tamanhos, raios) ficam só em [`src/styles/tokens.css`](../src/styles/tokens.css)**; este documento explica quando e como usá-los. Para ver tudo funcionando, rode `npm run dev` e abra `/design-system` (vitrine interna, ausente do build de produção).

## Princípios

- **Estúdio escuro, cor com propósito.** Fundo quase preto e neutro, para a foto e o vídeo serem o destaque. O degradê violeta → rosa da marca aparece só na logo, no botão principal, no controle deslizante, no progresso e em títulos grandes; cada tipo de ferramenta tem uma cor própria no ícone. Nada de brilhos, glassmorphism ou sombras pesadas.
- **Um caminho óbvio por tela.** Um botão principal por vista; opções extras aparecem só quando fazem sentido.
- **Hierarquia antes de cor.** Tamanho, peso e espaço organizam a tela; cor é o último recurso.
- **Estado nunca só por cor.** Sucesso, aviso e erro sempre têm ícone e texto.
- **Conteúdo real.** Textos curtos e diretos; erros dizem o que houve e como resolver.

## Marca

**Nome:** Media Tools. **Símbolo "Obturador"** (identidade aprovada em 24/11/2026): as três lâminas de uma câmera fotográfica (a foto) num ladrilho com o degradê da marca; o vão do meio forma o "play" (o vídeo).

- Componentes: `Logo` (símbolo + nome) e `LogoMark` (só o símbolo), em [`src/components/brand/Logo.tsx`](../src/components/brand/Logo.tsx). A geometria fica em `logo-geometry.ts`: as lâminas já saem afastadas umas das outras, sem máscara, então o desenho é igual no site, no SVG e no PNG.
- Na assinatura, "Media" vai em peso 700 e "Tools" em 500, na cor secundária.
- O símbolo é sempre o ladrilho inteiro (degradê e lâminas brancas), com cantos de 26% do lado, como um ícone de app. Tamanho mínimo: 16 px.
- Não distorça, não gire, não troque as cores do degradê e não acrescente efeitos. No alto contraste do Windows, as lâminas usam a cor de texto do sistema.
- Favicon e ícones do PWA são **gerados** a partir da mesma geometria: `npm run icons` grava em `public/` (o ícone mascarável e o da Apple usam o degradê cheio, com o obturador dentro da zona segura). Um teste garante que as cores dos ícones são as dos tokens.

## Cores

| Token | Uso |
|---|---|
| `bg` | fundo da página |
| `surface` | painéis, cartões, barras |
| `surface-raised` | hover, menus, botão secundário, opção não marcada |
| `surface-overlay` | hover sobre `surface-raised` |
| `stage` | fundo atrás da foto e do vídeo nos editores |
| `border` | divisórias e contornos decorativos |
| `border-strong` | borda de campos e controles (3:1) |
| `fg` | texto principal |
| `fg-muted` | texto secundário |
| `fg-subtle` | legendas, dicas, placeholders |
| `brand-start`, `brand-end` | **degradê da marca** (violeta → rosa): logo, ícone de abrir arquivo, progresso, controle deslizante e títulos grandes (`bg-brand`, `text-brand`) |
| `accent` | **violeta**: item selecionado, indicador da navegação ativa |
| `accent-emphasis` / `-hover` / `-active` (cada um com `-end`) | degradê do botão principal e seus estados |
| `on-accent` | texto sobre o botão principal |
| `accent-soft` | violeta claro: anel de foco, links, valores em destaque |
| `accent-subtle` | fundo de item selecionado e de mensagem informativa |
| `tool-edit`, `tool-crop`, `tool-rotate`, `tool-gif`, `tool-convert`, `tool-audio`, `tool-compress`, `tool-size` | ícone de cada tipo de ferramenta, a mesma cor na imagem e no vídeo |
| `success`, `warning`, `danger` (+ `-subtle`) | texto/ícone de estado e fundo da mensagem |
| `checker-a`, `checker-b` | fundo quadriculado da pré-visualização |

Regras:
- **Violeta e degradê só para:** ação principal (um botão por tela), seleção, navegação ativa, foco, links, progresso e a marca. Nunca em fundos de seção ou textos longos.
- O botão principal vai de `accent-emphasis` (violeta) a `accent-emphasis-end` (rosa): tons escuros o bastante para o texto branco passar no AA nas duas pontas. Hover e pressionado escurecem as duas pontas.
- Cor de ferramenta só no ícone, sobre um fundo do mesmo tom bem fraco; nunca em texto.
- `border` não delimita campos; para controles, use `border-strong`.
- O contraste de todos os pares em uso é verificado por [`tokens.test.ts`](../src/styles/tokens.test.ts): texto ≥ 4,5:1 e elementos de interface ≥ 3:1 (WCAG 2.2 AA). Um par novo de cores entra nesse teste.

## Tipografia

- **Inter** para toda a interface, inclusive números, que usam `tabular-nums` (dimensões, tamanhos, tempos, porcentagens) para não "dançar". Fonte hospedada no próprio site (`@fontsource-variable/inter`), sem Google Fonts.
- Pesos: `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700) e `font-extrabold` (800, só no título do início).
- Escala: `text-xs` 12/16 · `text-sm` 14/20 · `text-base` 16/24 · `text-lg` 18/28 · `text-xl` 20/28 · `text-2xl` 24/32 · `text-3xl` 30/36 · `text-4xl` 36/40 · `text-5xl` 48. **No máximo quatro tamanhos por tela.**
- Títulos: `font-bold tracking-tight text-balance`. Página: `text-2xl md:text-3xl`; seção: `text-xl`; início: `font-extrabold`, com o fim da frase em `text-brand`.
- Campos de texto com 16 px (abaixo disso o Safari do iPhone dá zoom).
- Números no padrão brasileiro, sempre por [`src/core/format.ts`](../src/core/format.ts): `8,6 MB`, `3024 × 4032`, `−78%`.

## Ícones

Lucide, sempre pelo componente `Icon` ([`src/components/ui/Icon.tsx`](../src/components/ui/Icon.tsx)): tamanhos `sm` 16, `md` 20 (padrão) e `lg` 24, com traço de 1,75 px em qualquer tamanho. Ícones são decorativos: o nome acessível fica no botão ou no texto ao lado. Botão só com ícone usa `IconButton`, que exige `label`. Sem emojis na interface.

## Espaço, forma e movimento

- **Espaçamento:** múltiplos de 4 px (escala do Tailwind). Margens laterais 16/24/32 px (`Container`). Largura máxima do conteúdo: `max-w-page` (72rem).
- **Raios:** generosos, como nos apps de celular: `rounded-sm` 8 (itens internos), `rounded-md` 12 (botões, campos, opções), `rounded-lg` 16 (painéis, upload, mensagens), `rounded-xl` 20 (folhas e diálogos), `rounded-2xl` 28, `rounded-full` (selos).
- **Bordas:** sempre 1 px (o upload usa 2 px tracejado).
- **Sombras:** `shadow-overlay` (camadas flutuantes), `shadow-media` (foto e vídeo no palco do editor) e `shadow-accent` (botão principal, bem suave). A elevação normal vem do tom da superfície e da borda.
- **Movimento:** transições de cor em 150 ms (padrão); botões encolhem um pouco ao toque (`active:scale`); `animate-enter` (220 ms) para um bloco que aparece; `--duration-base` 180 ms para entrada e expansão; `--duration-slow` 240 ms para painéis. Anime só `opacity` e `transform`. Com `prefers-reduced-motion`, as animações são desligadas em `base.css`.
- **Breakpoints:** padrão do Tailwind. `< md` (768): cabeçalho com a marca, abas embaixo e uma coluna; `md`: barra lateral estreita (ícone com rótulo curto); `lg` (1024): barra lateral larga (nome ao lado do ícone e o aviso de privacidade) e ferramentas em duas colunas. Nas telas de editor (`handle: { editor: true }`) a barra lateral fica sempre estreita e, no celular, as abas dão lugar à barra da ferramenta.
- **Camadas (z-index):** cabeçalho 10 · barra inferior e de ação 20 · menu 30 · folha 40 · avisos e link de pular 50.
- **Alvos de toque:** 44 px com toque (`pointer-coarse:`), 40 px com mouse. A barra inferior usa 56 px.

## Componentes

| Componente | Arquivo | Quando usar |
|---|---|---|
| `Button`, `IconButton` | `components/ui/Button.tsx` | ações; `variant`: `primary` (uma por tela), `secondary`, `ghost`, `danger`; `loading` mantém foco e ignora cliques |
| `buttonClasses` | `components/ui/button-classes.ts` | link com aparência de botão |
| `Badge` | `components/ui/Badge.tsx` | rótulos curtos de estado ("Em breve", "Pronto") |
| `Field`, `Input` | `components/ui/Field.tsx`, `Input.tsx` | campo com rótulo, dica e erro ligados por ARIA; `unit` para "px" |
| `SegmentedControl` | `components/ui/SegmentedControl.tsx` | escolha única entre poucas opções; setas, Home e End. Com mais de 5 opções (ex.: os 7 formatos de saída), `columns={4}` quebra em linhas e cabe em 320 px |
| `Slider` | `components/ui/Slider.tsx` | valor contínuo com leitura formatada (qualidade) |
| `ProgressBar` | `components/ui/ProgressBar.tsx` | progresso determinado (`value`) ou indeterminado |
| `Alert` | `components/ui/Alert.tsx` | mensagens; `error` usa `role="alert"`, os demais `status`; `live={false}` para textos fixos |
| `NavList`, `NavCard` | `components/ui/` | listas de destinos e categorias; item com `tone` ganha o ícone colorido da ferramenta; item sem `to` aparece como "Em breve" |
| `ToolIcon` | `components/ui/ToolIcon.tsx` | ícone de ferramenta num ladrilho do tom do tipo (`tone`: `edit`, `crop`, `rotate`, `gif`, `convert`, `audio`, `compress`, `size`); decorativo |
| `Dropzone` | `components/tool/Dropzone.tsx` | estado vazio da ferramenta: botão real + arrastar e soltar como atalho; `size="lg"` para a entrada principal do início |
| `FilePickerButton` | `components/tool/FilePickerButton.tsx` | botão que abre o seletor do sistema (ex.: "Adicionar" com a lista já aberta) |
| `usePageFileDrop` | `components/tool/usePageFileDrop.ts` | aceita arquivos soltos em qualquer ponto da página e impede o navegador de abri-los |
| `FilePreview` | `components/tool/FilePreview.tsx` | prévia grande; `backdrop` mostra o fundo que o resultado terá (JPG); `orientation` mostra o giro escolhido, sem reprocessar; quem cria a Object URL a revoga |
| `FileListItem` | `components/tool/FileListItem.tsx` | um arquivo na lista: miniatura decorativa (girada com `orientation`), linha técnica, estado, erro ou aviso e ações |
| `FileInfo` | `components/tool/FileInfo.tsx` | nome + linha técnica do arquivo |
| `ResultSummary` | `components/tool/ResultSummary.tsx` | antes, depois e variação de tamanho |
| `CompareView`, `ResultImage`, `ResultVideo`, `ResultAudio`, `ResultGif` | `components/tool/` | depois de processar: "Mostrar: Como ficou / Original", um de cada vez; o resultado de imagem, de vídeo, de som (player de som com o nome do arquivo) ou GIF animado (com o botão "Pausar animação"; com "reduzir movimento" no sistema, já começa parado), com aviso para baixar quando o navegador não mostra ou não toca o formato (TIFF, PDF) |
| `CropArea`, `CropOptions` | `components/tool/` | área de recorte sobre imagem ou vídeo (a mídia vai como filho) e os campos, proporções e tamanho final; `finalSize` quando o resultado difere da área (vídeo: lados pares) |
| `DownloadActions` | `components/tool/DownloadActions.tsx` | baixar um arquivo ou o pacote (`bundle`, ex.: ZIP) e, em toque, "Salvar na galeria"; lê os arquivos só no clique (`getFiles`) |
| `AppShell`, `SideNav`, `MobileHeader`, `BottomNav`, `Footer` | `components/layout/` | estrutura comum (já montada pelo roteador): barra lateral a partir de 768 px (é o cabeçalho do site); no celular, cabeçalho com a marca e abas embaixo |
| `Container`, `PageHeader`, `ActionBar` | `components/layout/` | largura e margens, título da página, ação principal da ferramenta |

Componentes de `ui/` e `tool/` não processam arquivos: recebem dados por props. O processamento fica no núcleo e nos Workers (ver `CLAUDE.md`).

## Padrões de tela

**Navegação.** Barra lateral a partir de 768 px (estreita até 1024 px e nos editores; larga nas demais telas). No celular, cabeçalho com a marca e abas embaixo com Início, Imagens, Vídeos e Sobre. O link ativo recebe `aria-current="page"`. Ao trocar de página, o foco vai para o conteúdo, e o link "Pular para o conteúdo" aparece no primeiro Tab.

**Início.** À esquerda (no celular, em cima) o título com o fim em `text-brand` e a frase de privacidade com "Como funciona"; à direita, "Abrir foto ou vídeo" (`QuickOpen`, em `pages/`): reconhece o arquivo pelos primeiros bytes (`core/media-kind.ts`), pergunta "O que fazer com praia.jpg?" (o foco vai para a pergunta) e mostra as ferramentas daquele tipo. A ferramenta escolhida abre com o arquivo (`features/shared/file-handoff.ts`, só na memória da aba); com um arquivo aberto, os links de "Todas as ferramentas" do mesmo tipo também o levam. Embaixo, "Todas as ferramentas" em três grupos (Editar, Converter, Deixar menor): no celular, grade de ícones com o nome curto; a partir de 768 px, linhas com nome e descrição.

**Página.** `Container` + `PageHeader` (h1 único) + conteúdo. Defina o título da aba com `<title>Nome · Media Tools</title>` dentro da página.

**Ferramenta.** Toda ferramenta segue cinco etapas: seleção → pré-visualização → opções → processamento → resultado. Cada fluxo cobre os estados vazio, pronto, processando, sucesso, erro e rejeitado ([Skill `frontend-design`](../.claude/skills/frontend-design/SKILL.md)). Mostre só as opções da ferramenta; opções dependentes aparecem quando necessárias (ex.: cor de fundo ao converter para JPG).
- **Base comum das ferramentas de imagem:** `features/image-tools/shared/`. `ImageToolPage` monta a tela inteira (seleção, lista, painel, ações, anúncios e foco) e `useImageBatch` cuida de validar, gerar prévias, processar em fila e entregar. Ferramenta nova = textos (`BatchLabels`), painel de opções e uma função que processa um arquivo (`BatchProcess`). Exemplos: `convert/`, `compress/`, `resize/`, `rotate/` e `crop/`.
- **Uma imagem por vez** (ex.: Recortar, em que cada foto tem um enquadramento próprio): `useImageBatch(labels, { singleImage: true })` e `ImageToolPage` com `singleImage`. A imagem nova substitui a atual, o botão da lista vira "Trocar imagem" e, se chegarem várias, só a primeira abre, com aviso. `renderPreview` troca a prévia comum pela da ferramenta (ex.: a área de recorte).
- **Área de recorte** (`components/tool/CropArea.tsx`, com `react-image-crop`, comum a imagem e vídeo): recebe a mídia como filho (`<img>` ou `<video>`). A seleção escurece o resto e tem borda fixa, sem animação. Os cantos têm 14 px com mouse e 20 px com toque, com área de toque de 24 e 44 px. Cores pelos tokens, em `components/tool/crop-area.css`, inclusive no alto contraste. Teclado: Tab chega à área e aos cantos, e as setas movem e ajustam (Shift, 10 px). Os campos de margem e tamanho (`CropOptions`, com `subject` "image" ou "video" para os textos) são a alternativa a arrastar (WCAG 2.5.7).
- **Base comum das ferramentas de vídeo:** `features/video-tools/shared/`. Um vídeo por vez: `useVideoTool` valida pelo conteúdo, abre no Worker de vídeo, processa com progresso real e cancelamento e entrega o resultado; `VideoToolPage` monta a tela (seleção, prévia, painel, ações, anúncios e foco) no mesmo desenho das de imagem. Durante o processamento, a barra de progresso com porcentagem fica junto do botão "Cancelar" (painel e `ActionBar`). Comuns também: `SourcePlayer` (o vídeo escolhido, com os controles do navegador), `TrimPreview` (player com "Marcar início aqui", "Marcar fim aqui", "Ver como fica" e a linha do tempo do trecho, no Cortar trecho e no Criar GIF), `TimeFields` e `Note` (observação curta com ícone, no painel de opções). Ferramenta que entrega só o som (`output: 'audio'` nos textos, como o Extrair áudio) mostra "Áudio extraído", "Ouvir como ficou" (ícone de fones), "Baixar áudio" e o player de som em "Como ficou"; no lugar do antes e depois de tamanho (o som não se compara ao vídeo de onde saiu), os detalhes trazem o tamanho, o formato e se o som foi copiado ou refeito. Opção que não faz sentido para o vídeo aberto fica desligada no `SegmentedControl`, com o motivo em texto logo abaixo (ex.: no Mudar resolução, as resoluções iguais ou maiores que a do vídeo, porque aumentar não melhora a qualidade; no Converter vídeo, os formatos que o navegador não consegue gerar). O que acontece com cada faixa aparece como pares de termo e valor ("Vídeo: Copiado, sem perder qualidade", "Som: Refeito em AAC, a 128 kbit/s"), antes de processar e no resultado. Ferramenta que entrega GIF (`output: 'gif'`) mostra "GIF criado" e "Baixar GIF", sem o antes e depois de tamanho. Exemplos: `edit/`, `crop/`, `compress/`, `audio/`, `resize/`, `convert/` e `gif/`.
- **Editor de vídeo** (Editar vídeo): o player mostra o vídeo como está ficando e não tem os controles do navegador (eles deixariam ir às partes excluídas); abaixo, uma linha de botões (Tocar só com ícone; "Dividir" e "Excluir" com texto; Desfazer, Refazer e zoom só com ícone, à direita) e a barra do vídeo: miniaturas de 56 px de altura, pedaços encostados separados por um fio da cor do fundo, uma linha clara fixa no meio (o ponto atual) e a régua de tempo embaixo. O pedaço selecionado ganha moldura violeta em cima e embaixo e alças violeta de 24 px nas pontas (área de toque maior, invisível). Embaixo da barra, o tempo atual e o total e uma frase curta de como usar. No painel: "Vídeo final", "Pedaços", como será salvo e o "Ajuste fino" recolhido (campos de tempo do pedaço selecionado com "Aplicar").
- **Player de vídeo com marcar início e fim** (Criar GIF): o `<video controls>` do navegador (teclado incluído), uma linha do tempo só visual (em violeta o que vira GIF, com o ponto atual) e, abaixo, "Marcar início aqui", "Marcar fim aqui" e "Ver como fica", com a frase "Agora em 0:03,20 · os botões marcam o trecho do GIF". Os campos de tempo ("1:05,30") são a alternativa ao player. Sob a área de recorte, os controles do navegador ficariam inalcançáveis: "Reproduzir/Pausar" e o slider "Momento do vídeo" ficam abaixo dela. Se o navegador não conseguir mostrar o vídeo, a página diz isso e os campos continuam valendo.
- **Campos com erro** (ex.: Largura e Altura do Redimensionar): a mensagem fica abaixo dos campos, ligada a eles por `aria-describedby`, com `aria-invalid` só nos que têm problema. Valor errado aparece já ao digitar e é anunciado (`role="alert"`). Campo obrigatório vazio só vira erro quando a pessoa tenta processar, e então o foco vai até ele. O botão principal não fica desativado por erro de campo: ao clicar, a pessoa descobre o que falta.
- Arquivo único mostra prévia grande; vários, lista de `FileListItem`. Observação por arquivo (ex.: "mantida a original") aparece no tom informativo, sem cor de erro. Opções e resultado ficam num painel à direita a partir de 1024 px; a ação principal aparece no painel (desktop) e na `ActionBar` (celular). Ao terminar, o foco vai para o resultado; ao esvaziar a lista, para "Selecionar imagens". Uma região `role="status"` anuncia só início e fim (não cada arquivo), incluindo quantos foram recusados.
- **Ver como ficou:** depois de processar, a prévia do arquivo único dá lugar a "Mostrar: Como ficou / Original" (`CompareView`), começando no resultado, que é o próprio arquivo gerado (não uma simulação). O painel do resultado tem "Ver como ficou", que leva até a comparação (no celular ela fica acima) e volta para o resultado. Num lote, cada imagem pronta tem o botão de olho "Ver como ficou", que abre a comparação acima da lista, com "Fechar a comparação". Mudar as opções descarta o resultado e a comparação some.
- Rota da ferramenta declara `handle: { hideBottomNav: true }`: no celular, a barra inferior dá lugar à `ActionBar` com a ação principal.
- Cabeçalho com caminho de volta: no PWA instalado não existe o botão voltar do navegador.
- A partir de 1024 px: prévia à esquerda, painel de opções à direita.

**Texto.** Português do Brasil, frases curtas, voz ativa. Botões dizem o que acontece ("Converter", "Baixar imagem"). Diga "seus arquivos não saem do seu dispositivo" só onde for verdade.

## Alterar ou acrescentar um token

1. Edite `src/styles/tokens.css` (nunca valores soltos nos componentes).
2. Se o token for cor usada em par com outra, acrescente o par em `tokens.test.ts`.
3. Rode `npm test` e confira a vitrine em `/design-system`.
4. Se mudar cor da marca, atualize `BRAND_COLORS` em `logo-geometry.ts` e rode `npm run icons`.
