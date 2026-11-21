# Design System do Media Tools

Guia de uso da identidade visual e dos componentes. **Os valores (cores, tamanhos, raios) ficam só em [`src/styles/tokens.css`](../src/styles/tokens.css)**; este documento explica quando e como usá-los. Para ver tudo funcionando, rode `npm run dev` e abra `/design-system` (vitrine interna, ausente do build de produção).

## Princípios

- **Profissional e discreto.** Interface escura, azul só onde há ação, seleção ou foco. Nada de gradientes, brilhos, glassmorphism ou sombras pesadas.
- **Um caminho óbvio por tela.** Um botão principal por vista; opções extras aparecem só quando fazem sentido.
- **Hierarquia antes de cor.** Tamanho, peso e espaço organizam a tela; cor é o último recurso.
- **Estado nunca só por cor.** Sucesso, aviso e erro sempre têm ícone e texto.
- **Conteúdo real.** Textos curtos e diretos; erros dizem o que houve e como resolver.

## Marca

**Nome:** Media Tools. **Símbolo "Recorte":** um quadro de mídia com o canto cortado a 45°, com a peça cortada se afastando na diagonal (mídia, arquivo e transformação).

- Componentes: `Logo` (símbolo + nome) e `LogoMark` (só o símbolo), em [`src/components/brand/Logo.tsx`](../src/components/brand/Logo.tsx). A geometria fica em `logo-geometry.ts`.
- Na assinatura, "Media" vai em peso 600 e "Tools" em 500, na cor secundária.
- Tamanho mínimo do símbolo: 16 px. Abaixo de 24 px, use o ladrilho escuro (favicon) em fundos claros.
- Não distorça, não gire, não troque as cores e não acrescente efeitos. Em uma cor só, use o símbolo inteiro em `fg` (fundo escuro) ou `bg` (fundo claro).
- Favicon e ícones do PWA são **gerados** a partir da mesma geometria: `npm run icons` grava em `public/`. Um teste garante que as cores dos ícones são as dos tokens.

## Cores

| Token | Uso |
|---|---|
| `bg` | fundo da página |
| `surface` | painéis, cartões, barra inferior |
| `surface-raised` | hover, menus, botão secundário |
| `border` | divisórias e contornos decorativos |
| `border-strong` | borda de campos e controles (3:1) |
| `fg` | texto principal |
| `fg-muted` | texto secundário |
| `fg-subtle` | legendas, dicas, placeholders |
| `accent` | **azul principal**: item selecionado, indicador da navegação ativa, logotipo |
| `accent-emphasis` / `-hover` / `-active` | fundo do botão principal e seus estados |
| `on-accent` | texto sobre o botão principal |
| `accent-soft` | **azul suave**: anel de foco, links, barra de progresso, informação |
| `accent-subtle` | fundo de item selecionado e de mensagem informativa |
| `success`, `warning`, `danger` (+ `-subtle`) | texto/ícone de estado e fundo da mensagem |
| `checker-a`, `checker-b` | fundo quadriculado da pré-visualização |

Regras:
- **Azul só para:** ação principal (um botão por tela), seleção, navegação ativa, foco, links e progresso. Nunca em fundos de seção, textos longos, ícones decorativos ou gradientes.
- O botão principal usa `accent-emphasis`, um tom levemente mais escuro que o azul da marca: com texto branco, `accent` dá 4,49:1 e reprova o AA.
- `border` não delimita campos (1,36:1 sobre `surface`); para controles, use `border-strong`.
- O contraste de todos os pares em uso é verificado por [`tokens.test.ts`](../src/styles/tokens.test.ts): texto ≥ 4,5:1 e elementos de interface ≥ 3:1 (WCAG 2.2 AA). Um par novo de cores entra nesse teste.

## Tipografia

- **Inter** para toda a interface; **JetBrains Mono** só para dados técnicos (extensões, dimensões, tamanhos, porcentagens). Fontes hospedadas no próprio site (`@fontsource-variable`), sem Google Fonts.
- Pesos: `font-normal` (400), `font-medium` (500), `font-semibold` (600). Outros pesos não existem.
- Escala: `text-xs` 12/16 · `text-sm` 14/20 · `text-base` 16/24 · `text-lg` 18/28 · `text-xl` 20/28 · `text-2xl` 24/32 · `text-3xl` 30/36 · `text-4xl` 36/40. **No máximo quatro tamanhos por tela.**
- Títulos: `font-semibold tracking-tight text-balance`. Página: `text-2xl md:text-3xl`; seção: `text-xl`; início: `text-3xl md:text-4xl`.
- Campos de texto com 16 px (abaixo disso o Safari do iPhone dá zoom).
- Números no padrão brasileiro, sempre por [`src/core/format.ts`](../src/core/format.ts): `8,6 MB`, `3024 × 4032`, `−78%`.

## Ícones

Lucide, sempre pelo componente `Icon` ([`src/components/ui/Icon.tsx`](../src/components/ui/Icon.tsx)): tamanhos `sm` 16, `md` 20 (padrão) e `lg` 24, com traço de 1,75 px em qualquer tamanho. Ícones são decorativos: o nome acessível fica no botão ou no texto ao lado. Botão só com ícone usa `IconButton`, que exige `label`. Sem emojis na interface.

## Espaço, forma e movimento

- **Espaçamento:** múltiplos de 4 px (escala do Tailwind). Margens laterais 16/24/32 px (`Container`). Largura máxima do conteúdo: `max-w-page` (72rem).
- **Raios:** `rounded-sm` 6 (itens internos), `rounded-md` 8 (botões, campos), `rounded-lg` 12 (painéis, upload), `rounded-xl` 16 (folhas e diálogos), `rounded-full` (selos).
- **Bordas:** sempre 1 px (o upload usa 2 px tracejado).
- **Sombras:** só `shadow-overlay`, para camadas flutuantes. A elevação normal vem de superfície e borda.
- **Movimento:** transições de cor em 120 ms (padrão); `--duration-base` 180 ms para entrada e expansão; `--duration-slow` 240 ms para painéis. Anime só `opacity` e `transform`. Com `prefers-reduced-motion`, as animações são desligadas em `base.css`.
- **Breakpoints:** padrão do Tailwind. `< md` (768): barra inferior e uma coluna; `md`: menu superior; `lg` (1024): ferramentas em duas colunas.
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
| `NavList`, `NavCard` | `components/ui/` | listas de destinos e categorias; item sem `to` aparece como "Em breve" |
| `Dropzone` | `components/tool/Dropzone.tsx` | estado vazio da ferramenta: botão real + arrastar e soltar como atalho |
| `FilePickerButton` | `components/tool/FilePickerButton.tsx` | botão que abre o seletor do sistema (ex.: "Adicionar" com a lista já aberta) |
| `usePageFileDrop` | `components/tool/usePageFileDrop.ts` | aceita arquivos soltos em qualquer ponto da página e impede o navegador de abri-los |
| `FilePreview` | `components/tool/FilePreview.tsx` | prévia grande; `backdrop` mostra o fundo que o resultado terá (JPG); `orientation` mostra o giro escolhido, sem reprocessar; quem cria a Object URL a revoga |
| `FileListItem` | `components/tool/FileListItem.tsx` | um arquivo na lista: miniatura decorativa (girada com `orientation`), linha técnica, estado, erro ou aviso e ações |
| `FileInfo` | `components/tool/FileInfo.tsx` | nome + linha técnica do arquivo |
| `ResultSummary` | `components/tool/ResultSummary.tsx` | antes, depois e variação de tamanho |
| `CompareView`, `ResultImage`, `ResultVideo`, `ResultAudio` | `components/tool/` | depois de processar: "Mostrar: Como ficou / Original", um de cada vez; o resultado de imagem, de vídeo ou de som (player de som com o nome do arquivo), com aviso para baixar quando o navegador não mostra ou não toca o formato (TIFF, PDF) |
| `CropArea`, `CropOptions` | `components/tool/` | área de recorte sobre imagem ou vídeo (a mídia vai como filho) e os campos, proporções e tamanho final; `finalSize` quando o resultado difere da área (vídeo: lados pares) |
| `DownloadActions` | `components/tool/DownloadActions.tsx` | baixar um arquivo ou o pacote (`bundle`, ex.: ZIP) e, em toque, "Salvar na galeria"; lê os arquivos só no clique (`getFiles`) |
| `AppShell`, `TopNav`, `BottomNav`, `Footer` | `components/layout/` | estrutura comum (já montada pelo roteador) |
| `Container`, `PageHeader`, `ActionBar` | `components/layout/` | largura e margens, título da página, ação principal da ferramenta |

Componentes de `ui/` e `tool/` não processam arquivos: recebem dados por props. O processamento fica no núcleo e nos Workers (ver `CLAUDE.md`).

## Padrões de tela

**Navegação.** Menu superior a partir de 768 px. No celular, barra inferior com Início, Imagens, Vídeos e Sobre. O link ativo recebe `aria-current="page"`. Ao trocar de página, o foco vai para o conteúdo, e o link "Pular para o conteúdo" aparece no primeiro Tab.

**Página.** `Container` + `PageHeader` (h1 único) + conteúdo. Defina o título da aba com `<title>Nome · Media Tools</title>` dentro da página.

**Ferramenta.** Toda ferramenta segue cinco etapas: seleção → pré-visualização → opções → processamento → resultado. Cada fluxo cobre os estados vazio, pronto, processando, sucesso, erro e rejeitado ([Skill `frontend-design`](../.claude/skills/frontend-design/SKILL.md)). Mostre só as opções da ferramenta; opções dependentes aparecem quando necessárias (ex.: cor de fundo ao converter para JPG).
- **Base comum das ferramentas de imagem:** `features/image-tools/shared/`. `ImageToolPage` monta a tela inteira (seleção, lista, painel, ações, anúncios e foco) e `useImageBatch` cuida de validar, gerar prévias, processar em fila e entregar. Ferramenta nova = textos (`BatchLabels`), painel de opções e uma função que processa um arquivo (`BatchProcess`). Exemplos: `convert/`, `compress/`, `resize/`, `rotate/` e `crop/`.
- **Uma imagem por vez** (ex.: Recortar, em que cada foto tem um enquadramento próprio): `useImageBatch(labels, { singleImage: true })` e `ImageToolPage` com `singleImage`. A imagem nova substitui a atual, o botão da lista vira "Trocar imagem" e, se chegarem várias, só a primeira abre, com aviso. `renderPreview` troca a prévia comum pela da ferramenta (ex.: a área de recorte).
- **Área de recorte** (`components/tool/CropArea.tsx`, com `react-image-crop`, comum a imagem e vídeo): recebe a mídia como filho (`<img>` ou `<video>`). A seleção escurece o resto e tem borda fixa, sem animação. Os cantos têm 14 px com mouse e 20 px com toque, com área de toque de 24 e 44 px. Cores pelos tokens, em `components/tool/crop-area.css`, inclusive no alto contraste. Teclado: Tab chega à área e aos cantos, e as setas movem e ajustam (Shift, 10 px). Os campos de margem e tamanho (`CropOptions`, com `subject` "image" ou "video" para os textos) são a alternativa a arrastar (WCAG 2.5.7).
- **Base comum das ferramentas de vídeo:** `features/video-tools/shared/`. Um vídeo por vez: `useVideoTool` valida pelo conteúdo, abre no Worker de vídeo, processa com progresso real e cancelamento e entrega o resultado; `VideoToolPage` monta a tela (seleção, prévia, painel, ações, anúncios e foco) no mesmo desenho das de imagem. Durante o processamento, a barra de progresso com porcentagem fica junto do botão "Cancelar" (painel e `ActionBar`). Comuns também: `SourcePlayer` (o vídeo escolhido, com os controles do navegador) e `Note` (observação curta com ícone, no painel de opções). Ferramenta que entrega só o som (`output: 'audio'` nos textos, como o Extrair áudio) mostra "Áudio extraído", "Ouvir como ficou" (ícone de fones), "Baixar áudio" e o player de som em "Como ficou"; no lugar do antes e depois de tamanho (o som não se compara ao vídeo de onde saiu), os detalhes trazem o tamanho, o formato e se o som foi copiado ou refeito. Opção que não faz sentido para o vídeo aberto fica desligada no `SegmentedControl`, com o motivo em texto logo abaixo (ex.: no Mudar resolução, as resoluções iguais ou maiores que a do vídeo, porque aumentar não melhora a qualidade). Exemplos: `trim/`, `crop/`, `compress/`, `audio/` e `resize/`.
- **Player de vídeo:** no Cortar trecho, o `<video controls>` do navegador (teclado incluído), uma linha do tempo só visual (em azul o que fica, com o ponto atual) e, abaixo, "Marcar início aqui", "Marcar fim aqui" e "Ver como fica" (toca só o que fica, pulando as partes removidas), com a frase "Agora em 0:03,20 · os botões marcam o trecho / a parte 2". As opções seguem a ordem da decisão: "O que fazer" (Manter trecho ou Remover partes), os tempos, "Vídeo final" e, ao manter um trecho, "Como cortar" (Exato ou Rápido, cada um com uma frase curta). Ao remover partes, cada parte é um grupo com rótulo próprio para leitor de tela ("Início da parte 2"); a parte em edição fica destacada e é a que o player marca. Os campos de tempo ("1:05,30") são a alternativa ao player. Sob a área de recorte, os controles do navegador ficariam inalcançáveis: "Reproduzir/Pausar" e o slider "Momento do vídeo" ficam abaixo dela. Se o navegador não conseguir mostrar o vídeo, a página diz isso e os campos continuam valendo.
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
