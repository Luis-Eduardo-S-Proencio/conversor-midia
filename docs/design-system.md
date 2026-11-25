# Design System do Media Tools

Guia de uso da identidade visual e dos componentes. **Os valores (cores, tamanhos, raios, sombras, durações) ficam só em [`src/styles/tokens.css`](../src/styles/tokens.css)**; este documento explica quando e como usá-los. Para ver tudo funcionando, abra **`/_design`**: a vitrine fica publicada, fora da navegação e sem indexação, e mostra também a comparação dos dois acentos (rosa e violeta).

> Redesenho "estúdio de bolso" (pedido em 25/11/2026), feito por fases: **1. fundação** (tokens, fontes, componentes base, `/_design`: pronta) · 2. navegação e layout · 3. telas · 4. ferramentas · 5. editores · 6. recursos P1 · 7. polimento. As seções "Padrões de tela" descrevem as telas como estão hoje e mudam nas fases 2 a 5.

## Princípios

- **Estúdio de bolso.** Sóbrio, tátil e preciso, como um app profissional de edição: a interface recua e a mídia do usuário é a estrela.
- **Um acento só.** O degradê da marca fica no logo (no máximo também no botão de exportar). Seleção, foco, botão principal, progresso e links usam **um** acento (`accent`). Proibido: texto em degradê, brilho ou sombra colorida em botão, glassmorphism em tudo, blobs, partículas, emoji como ícone, borda tracejada como área de upload, animação em loop ou acima de 500 ms.
- **Superfícies de grafite em camadas**, bordas hairline de 1 px e um realce sutil no topo de cada cartão (luz vindo de cima). Grão sutilíssimo só no fundo da página, nunca sobre a mídia.
- **Números sempre tabulares** (tempo, tamanho, resolução, %): não "dançam" quando mudam.
- **Um caminho óbvio por tela.** Um botão principal por vista; opções extras aparecem só quando fazem sentido.
- **Estado nunca só por cor.** Sucesso, aviso e erro sempre têm ícone e texto.
- **Conteúdo real.** Textos curtos e diretos, tratando por "você"; erros dizem o que houve e como resolver. Sem frase de marketing.

## Marca

**Nome:** Media Tools. **Símbolo "Obturador"** (identidade aprovada em 24/11/2026): as três lâminas de uma câmera fotográfica (a foto) num ladrilho com o degradê da marca; o vão do meio forma o "play" (o vídeo).

- Componentes: `Logo` (símbolo + nome) e `LogoMark` (só o símbolo), em [`src/components/brand/Logo.tsx`](../src/components/brand/Logo.tsx). A geometria fica em `logo-geometry.ts`: as lâminas já saem afastadas umas das outras, sem máscara, então o desenho é igual no site, no SVG e no PNG.
- Na assinatura, "Media" vai em peso 700 e "Tools" em 500, na cor secundária.
- O símbolo é sempre o ladrilho inteiro (degradê e lâminas brancas), com cantos de 26% do lado, como um ícone de app. Tamanho mínimo: 16 px.
- Não distorça, não gire, não troque as cores do degradê e não acrescente efeitos. No alto contraste do Windows, as lâminas usam a cor de texto do sistema.
- Favicon e ícones do PWA são **gerados** a partir da mesma geometria: `npm run icons` grava em `public/` (o ícone mascarável e o da Apple usam o degradê cheio, com o obturador dentro da zona segura). Um teste garante que as cores dos ícones são as dos tokens.

## Cores

Nomes do Tailwind e nomes curtos do guia de redesenho (as variáveis curtas, como `--surface-1` e `--text-2`, existem em `:root` para CSS escrito à mão).

| Token (Tailwind) | Guia | Uso |
|---|---|---|
| `bg` | `--bg` | fundo da página (com o grão, em `html`) |
| `surface-1`, `surface-2`, `surface-3` | iguais | camadas: cartões e barras (1), painéis e menus (2), botão secundário e itens elevados (3) |
| `surface-hover` | igual | hover sobre `surface-3`; trilha do slider e do progresso |
| `stage` | — | fundo dos editores (preto) |
| `border`, `border-strong` | iguais | hairlines decorativas (branco 7% e 12%) |
| `stroke` | — | contorno de campos e controles que precisa de 3:1 (WCAG 1.4.11): opaco, `#6B6B78` |
| `fg`, `fg-muted`, `fg-subtle` | `--text-1/2/3` | texto principal, secundário e legenda |
| `accent` | igual | o acento: texto, ícones, seleção, foco, links e preenchimento de slider e progresso |
| `accent-solid` (+ `-hover`, `-active`) | `--accent-solid` | fundo do botão principal, com texto branco (`on-accent`) |
| `accent-soft` | igual | fundo de item selecionado (acento a 12%) |
| `brand-start`, `brand-end` | — | degradê da marca: **só o logo** (`bg-brand`) |
| `success`, `warning`, `danger` (+ `-subtle`) | iguais | texto/ícone de estado e fundo da mensagem |
| `cat-edit`, `cat-convert`, `cat-compress`, `cat-audio` | `--cat-editar`, `--cat-converter`, `--cat-comprimir`, `--cat-audio` | as **quatro** categorias de ferramenta, só no ícone |
| `scrim` | — | fundo escurecido atrás de painéis e diálogos |
| `checker-a`, `checker-b` | — | fundo quadriculado da pré-visualização (transparência) |

Regras:
- **Acento padrão: rosa** (`#FF4F8B`, sólido `#D62466`), o rosa da ponta do logo. A variante **violeta** (`#9D8CFF`, sólido `#6D4AFF`) fica em `[data-accent="violet"]`, para comparar na vitrine; a escolhida vira o padrão.
- `accent-soft` usa 12% (o guia sugeria 14%): com 14%, o texto rosa sobre ele, em cima da `surface-3`, ficava em 4,4:1, abaixo do mínimo de 4,5:1.
- Categorias: **editar** (Editar vídeo, Recortar imagem e vídeo, Girar e espelhar, Criar GIF), **converter** (Converter imagem e vídeo), **comprimir** (Comprimir imagem e vídeo, Redimensionar, Mudar resolução) e **áudio** (Extrair áudio). Cor de categoria só no ícone, sobre o ladrilho do mesmo tom a 12%; nunca em texto. Imagem e vídeo da mesma ação usam o mesmo ícone, com o **selo** de imagem ou vídeo no canto (`ToolIcon media`).
- `border` e `border-strong` não delimitam campos; para controles, use `stroke`.
- `fg-subtle` não vai sobre `surface-hover` (4,44:1); nas demais superfícies passa.
- O contraste de todos os pares em uso é verificado por [`tokens.test.ts`](../src/styles/tokens.test.ts), inclusive a variante violeta e o fundo translúcido do acento: texto ≥ 4,5:1 e elementos de interface ≥ 3:1 (WCAG 2.2 AA). Um par novo de cores entra nesse teste.

## Tipografia

- **Títulos em Bricolage Grotesque** (`font-display`; `h1` e `h2` já a usam por padrão, com `text-wrap: balance`), **texto em Inter** (`font-sans`). Fontes hospedadas no próprio site, **só o subconjunto latino** (o português cabe nele inteiro), em [`src/styles/fonts.css`](../src/styles/fonts.css), com `font-display: swap` e preload dos dois arquivos no build (`vite.config.ts`). Inter 48 KB e Bricolage 41 KB.
- Escala por papel (use nas telas novas): `text-display` (30 a 44 px, Bricolage 700, −0,02em) · `text-title` (24 a 32 px, 650) · `text-section` (18 a 20 px, 600) · `text-body` (15 a 16 px) · `text-secondary` (14 px) · `text-caption` (13 px, 500). Os tamanhos fluidos usam `clamp()`. **Mínimo absoluto: 12 px** (`text-xs`).
- A escala antiga (`text-xs` … `text-5xl`) continua para as telas que ainda não mudaram.
- Números: `tabular-nums` sempre. No padrão brasileiro, por [`src/core/format.ts`](../src/core/format.ts) (`Intl.NumberFormat('pt-BR')`): `8,6 MB`, `3024 × 4032`, `−78%`.
- Parágrafos com `text-wrap: pretty` e no máximo `max-w-text` (68ch).
- Campos de texto com 16 px (abaixo disso o Safari do iPhone dá zoom).

## Ícones

Lucide, sempre pelo componente `Icon` ([`src/components/ui/Icon.tsx`](../src/components/ui/Icon.tsx)): tamanhos `sm` 16, `md` 20 (padrão) e `lg` 24, com traço de 1,75 px em qualquer tamanho. Ícones são decorativos: o nome acessível fica no botão ou no texto ao lado. Botão só com ícone usa `IconButton`, que exige `label`. Sem emojis na interface.

## Espaço, forma e movimento

- **Espaçamento:** base 4 (a escala do Tailwind: `p-4` = 16 px = `--s-4`). Margem lateral `--gutter`: 16 px (celular), 24 px (a partir de 768) e 40 px (a partir de 1024), no `Container`. Espaço entre seções `--section-gap`: 32 / 48 px. Conteúdo travado em 1200 px (`--container-page`), centralizado.
- **Raios:** `rounded-sm` 8 (itens internos) · `rounded-md` 12 (botões, campos) · `rounded-lg` 16 (cartões) · `rounded-xl` 24 (painéis de baixo, diálogos, upload) · `rounded-full` (chips, pílulas).
- **Bordas:** sempre 1 px, hairline.
- **Sombras:** `shadow-1` (cartões, botões: realce no topo e sombra curta), `shadow-2` (o que flutua: menus, dicas, avisos), `shadow-sheet` (painel de baixo).
- **Movimento:** `--dur-1` 120 ms (toque), `--dur-2` 200 ms (troca de estado), `--dur-3` 320 ms (painéis), `--dur-4` 480 ms (máximo). Curvas `ease-out`, `ease-in`, `ease-emph` (painéis subindo) e `ease-spring` (com parcimônia). Anime só `transform`/`translate`/`scale` e `opacity`; nada acima de 500 ms; nada em loop, exceto carregamento (`animate-spin`, `animate-shimmer`, `animate-indeterminate`). `pressable` faz o elemento afundar (`scale .97`) ao toque. Com `prefers-reduced-motion`, as animações são desligadas em `base.css`.
- **Efeitos** (utilitários em `base.css`): `surface-card` (cartão em camadas), `viewfinder` (área de abrir arquivo com cantos de visor de câmera; com `data-dragover`, as cantoneiras se fecham no acento), `scroller-x` (carrossel sem barra, com encaixe e fade nas bordas), `glass-header` (cabeçalho com desfoque ao rolar), `skeleton` (bloco carregando), `bg-checker` (transparência).
- **Breakpoints:** 360–767 celular · 768–1023 tablet (`md`) · 1024–1439 computador (`lg`) · 1440+ (`wide`) com o conteúdo travado. Medidas fixas em `:root`: `--header-h` 56, `--bottomnav-h` 64, `--rail-w` 72, `--sidebar-w` 248, `--panel-w` 320.
- **Camadas (z-index):** cabeçalho 10 · barra inferior e de ação 20 · menu 30 · dica 40 · avisos e link de pular 50. Painéis e diálogos usam a camada superior do navegador (`<dialog>` modal).
- **Alvos de toque:** pelo menos 44 × 44 px com toque, com 8 px entre eles.

## Componentes

| Componente | Arquivo | Quando usar |
|---|---|---|
| `Button` | `components/ui/Button.tsx` | ações; `size` `sm` 36 · `md` 44 · `lg` 52 px, raio 12; `variant`: `primary` (acento sólido, uma por tela), `secondary` (`surface-3` com borda), `ghost`, `danger`. Desligado: opacidade .4, sem sombra e cursor de proibido. `loading`: spinner no lugar do ícone (sem ícone, por cima do texto), sem mudar a largura; mantém o foco e ignora cliques |
| `IconButton` | `components/ui/Button.tsx` | botão só com ícone (40–44 px); `label` obrigatório (nome acessível) e dica visual com mouse; `shortcut` mostra o atalho na dica |
| `Card` | `components/ui/Card.tsx` | superfície base (raio 16, padding 16/20, `shadow-1`); `interactive` sobe 2 px e clareia a borda com mouse; `as` muda o elemento |
| `Chip` | `components/ui/Chip.tsx` | pílula de 36 px; `selected` (alternância, `aria-pressed`) fica com `accent-soft` e texto no acento; `CHIP_CLASSES` para links |
| `MetaChips` | `components/ui/MetaChips.tsx` | dados do arquivo (formato, resolução, duração, tamanho) em pílulas com algarismos tabulares; `animate` entra em cascata |
| `ProgressRing` | `components/ui/ProgressRing.tsx` | progresso em anel (exportação), com a porcentagem no centro; sem `value`, gira |
| `Skeleton` | `components/ui/Skeleton.tsx` | lugar reservado com brilho enquanto carrega (miniaturas, timeline) |
| `EmptyState` | `components/ui/EmptyState.tsx` | área vazia: ícone, o que fazer e a ação |
| `BottomSheet` | `components/ui/BottomSheet.tsx` | painel que sobe de baixo (raio 24, alça, até 85% da altura): fecha arrastando para baixo, no ✕, com Esc, tocando fora ou com o voltar do navegador/Android; `onApply` mostra o ✓ |
| `ConfirmDialog` | `components/ui/ConfirmDialog.tsx` | confirmação (ex.: "Descartar edição?"), com o foco na opção segura; `destructive` |
| `ToastProvider`, `useToast` | `components/ui/Toast.tsx`, `toast-context.ts` | aviso curto que sobe de baixo e some em 3 s (ou fica até usar a `action`); o `AppShell` já monta o provedor e o põe acima da barra inferior |
| `useModalDialog`, `useBackDismiss` | `components/ui/` | mecânica dos painéis: `<dialog>` modal (foco preso), saída animada, foco de volta a quem abriu e um passo no histórico, para o voltar fechar o painel antes de sair da tela |
| `buttonClasses` | `components/ui/button-classes.ts` | link com aparência de botão |
| `Badge` | `components/ui/Badge.tsx` | rótulos curtos de estado ("Em breve", "Pronto") |
| `Field`, `Input` | `components/ui/Field.tsx`, `Input.tsx` | campo com rótulo, dica e erro ligados por ARIA; `unit` para "px" |
| `SegmentedControl` | `components/ui/SegmentedControl.tsx` | escolha única entre poucas opções; um indicador desliza até a opção marcada; setas, Home e End. Com mais de 5 opções (ex.: os 7 formatos de saída), `columns={4}` quebra em linhas e cabe em 320 px |
| `Slider` | `components/ui/Slider.tsx` | valor contínuo: trilha de 4 px preenchida no acento, alça branca de 20 px, balão com o valor enquanto arrasta; `resetTo`: toque duplo volta ao padrão |
| `ProgressBar` | `components/ui/ProgressBar.tsx` | progresso em barra, determinado (`value`) ou indeterminado |
| `Alert` | `components/ui/Alert.tsx` | mensagens; `error` usa `role="alert"`, os demais `status`; `live={false}` para textos fixos |
| `NavList` | `components/ui/NavList.tsx` | listas de destinos (Imagens, Vídeos); item com `tone` ganha o ícone colorido da ferramenta; item sem `to` aparece como "Em breve" |
| `ToolIcon` | `components/ui/ToolIcon.tsx` | ícone de ferramenta num ladrilho da cor da categoria (`tone`: `edit`, `convert`, `compress`, `audio`); `media` põe o selo de imagem ou vídeo no canto; decorativo |
| `Dropzone` | `components/tool/Dropzone.tsx` | estado vazio da ferramenta: botão real + arrastar e soltar como atalho; `size="lg"` para a entrada principal do início |
| `FilePickerButton` | `components/tool/FilePickerButton.tsx` | botão que abre o seletor do sistema (ex.: "Adicionar" com a lista já aberta) |
| `usePageFileDrop` | `components/tool/usePageFileDrop.ts` | aceita arquivos soltos em qualquer ponto da página e impede o navegador de abri-los |
| `FilePreview` | `components/tool/FilePreview.tsx` | prévia grande; `backdrop` mostra o fundo que o resultado terá (JPG); `orientation` mostra o giro escolhido, sem reprocessar; quem cria a Object URL a revoga |
| `FileListItem` | `components/tool/FileListItem.tsx` | um arquivo na lista: miniatura decorativa (girada com `orientation`), linha técnica, estado, erro ou aviso e ações; com `onShow`, a miniatura vira o botão "Mostrar nome" (`aria-pressed`) que leva a imagem para a prévia grande |
| `ToolWorkspace`, `ToolStage`, `ToolPanel`, `ToolUnsupported` | `components/tool/ToolWorkspace.tsx` | esqueleto comum dos editores de imagem e de vídeo: título com o caminho de volta, troca de ferramenta, palco escuro (`empty` para a área de abrir), painel ao lado e a barra de ações do celular |
| `ToolSwitcher` | `components/tool/ToolSwitcher.tsx` | troca de ferramenta dentro do editor: coluna à esquerda a partir de 1024 px, fileira que rola (já centralizada na atual) abaixo disso; a atual leva `aria-current` e não recarrega; `onSwitch` roda antes de sair (para levar o arquivo aberto) |
| `FileInfo` | `components/tool/FileInfo.tsx` | nome + linha técnica do arquivo |
| `ResultSummary` | `components/tool/ResultSummary.tsx` | antes, depois e variação de tamanho |
| `CompareView`, `ResultImage`, `ResultVideo`, `ResultAudio`, `ResultGif` | `components/tool/` | depois de processar: "Mostrar: Como ficou / Original", um de cada vez; o resultado de imagem, de vídeo, de som (player de som com o nome do arquivo) ou GIF animado (com o botão "Pausar animação"; com "reduzir movimento" no sistema, já começa parado), com aviso para baixar quando o navegador não mostra ou não toca o formato (TIFF, PDF) |
| `CropArea`, `CropOptions` | `components/tool/` | área de recorte sobre imagem ou vídeo (a mídia vai como filho) e os campos, proporções e tamanho final; `finalSize` quando o resultado difere da área (vídeo: lados pares) |
| `DownloadActions` | `components/tool/DownloadActions.tsx` | baixar um arquivo ou o pacote (`bundle`, ex.: ZIP) e, em toque, "Salvar na galeria"; lê os arquivos só no clique (`getFiles`) |
| `AppShell`, `SideNav`, `MobileHeader`, `BottomNav`, `Footer` | `components/layout/` | estrutura comum (já montada pelo roteador): barra lateral a partir de 768 px (é o cabeçalho do site); no celular, cabeçalho com a marca e o menu "Mais opções", e abas embaixo |
| `AppMenu`, `InstallDialog` | `components/layout/` | menu "Mais opções" do cabeçalho do celular (botão que mostra e esconde a lista: Esc, tocar fora, sair com o Tab ou trocar de página fecham), com "Instalar o app" e "Sobre o Media Tools"; o diálogo nativo (`showModal`) explica como instalar pelo navegador. O pedido de instalação do Chromium fica em `install-app.ts` |
| `Container`, `PageHeader`, `ActionBar` | `components/layout/` | largura e margens, título da página, ação principal da ferramenta |

Componentes de `ui/` e `tool/` não processam arquivos: recebem dados por props. O processamento fica no núcleo e nos Workers (ver `CLAUDE.md`).

## Padrões de tela

**Navegação.** Barra lateral a partir de 768 px (estreita até 1024 px e nos editores; larga nas demais telas), com Início, Imagens e Vídeos. No celular, abas embaixo com os mesmos três e, no canto do cabeçalho, o menu "Mais opções" (três pontos) com "Instalar o app" e "Sobre o Media Tools", também nas ferramentas. O Sobre não está no menu principal: fica no rodapé e, no celular, no "Mais opções". O link ativo recebe `aria-current="page"`. Ao trocar de página, o foco vai para o conteúdo, e o link "Pular para o conteúdo" aparece no primeiro Tab.

**Instalar o app.** No Chromium (Chrome, Edge, Samsung Internet), o aviso de que o app pode ser instalado (`beforeinstallprompt`) é guardado sem a faixa automática do navegador, e "Instalar o app" abre o pedido de instalação dele. Sem esse aviso (Safari, Firefox, ou recusado o pedido), o item abre `InstallDialog`, com o caminho pelo menu do navegador no iPhone e iPad, no Android e no computador. Aberto pelo ícone da tela inicial, o item some.

**Início.** À esquerda (no celular, em cima) o título com o fim em `text-brand` e uma frase do que dá para fazer; à direita, "Abrir foto ou vídeo" (`QuickOpen`, em `pages/`): reconhece o arquivo pelos primeiros bytes (`core/media-kind.ts`), pergunta "O que fazer com praia.jpg?" (o foco vai para a pergunta) e mostra as ferramentas daquele tipo. A ferramenta escolhida abre com o arquivo (`features/shared/file-handoff.ts`, só na memória da aba); com um arquivo aberto, os links de "Todas as ferramentas" do mesmo tipo também o levam. Embaixo, "Todas as ferramentas" em três grupos (Editar, Converter, Deixar menor): no celular, grade de ícones com o nome curto; a partir de 768 px, linhas com nome e descrição.

**Página.** `Container` + `PageHeader` (h1 único) + conteúdo. Defina o título da aba com `<title>Nome · Media Tools</title>` dentro da página.

**Sobre.** Carregada sob demanda (os formatos e os limites vêm de `core/`, que não devem pesar no pacote inicial). No alto, o símbolo grande ao lado do título, como na tela "Sobre" de um app; depois, seções com título curto e o conteúdo em grupos de linhas separadas por um fio, como as listas do app: processamento local (linhas com ícone), formatos (etiquetas do que abre e do que salva), limites (termo e valor) e créditos e licenças (o aviso do LAME é obrigatório pela LGPL). As seções aceitam âncora (`#processamento-local`, ligada no rodapé), que leva o foco ao título.

**Editor de imagens.** Sem rodapé e com a barra lateral estreita. No alto, "Imagens" (voltar), o título e a frase da ferramenta; embaixo, a troca de ferramenta (`ToolSwitcher`), o palco escuro (`bg-stage`) com a prévia grande e a lista de arquivos, e o painel de opções à direita (fixo ao rolar, a partir de 1024 px). Trocar de ferramenta leva as imagens abertas (os originais, nunca os resultados); o Recortar fica com a primeira. Com várias imagens, a primeira aparece grande e a miniatura de cada uma escolhe outra.

**Editor de vídeo.** O mesmo desenho, com "Vídeos" para voltar e as sete ferramentas de vídeo na troca de ferramenta (Editar, Recortar, Comprimir, Áudio, Resolução, Converter, GIF). Trocar de ferramenta leva o vídeo aberto (o original); a nova ferramenta o abre de novo no Worker dela. No palco, o player da ferramenta (no Editar vídeo, o player e a barra com miniaturas); no painel, as opções e "Salvar vídeo" ou a ação da ferramenta.

**Ferramenta.** Toda ferramenta segue cinco etapas: seleção → pré-visualização → opções → processamento → resultado. Cada fluxo cobre os estados vazio, pronto, processando, sucesso, erro e rejeitado ([Skill `frontend-design`](../.claude/skills/frontend-design/SKILL.md)). Mostre só as opções da ferramenta; opções dependentes aparecem quando necessárias (ex.: cor de fundo ao converter para JPG).
- **Base comum das ferramentas de imagem:** `features/image-tools/shared/`. `ImageToolPage` monta a tela inteira (seleção, lista, painel, ações, anúncios e foco) e `useImageBatch` cuida de validar, gerar prévias, processar em fila e entregar. Ferramenta nova = textos (`BatchLabels`), painel de opções e uma função que processa um arquivo (`BatchProcess`). Exemplos: `convert/`, `compress/`, `resize/`, `rotate/` e `crop/`.
- **Uma imagem por vez** (ex.: Recortar, em que cada foto tem um enquadramento próprio): `useImageBatch(labels, { singleImage: true })` e `ImageToolPage` com `singleImage`. A imagem nova substitui a atual, o botão da lista vira "Trocar imagem" e, se chegarem várias, só a primeira abre, com aviso. `renderPreview` troca a prévia comum pela da ferramenta (ex.: a área de recorte).
- **Área de recorte** (`components/tool/CropArea.tsx`, com `react-image-crop`, comum a imagem e vídeo): recebe a mídia como filho (`<img>` ou `<video>`). A seleção escurece o resto e tem borda fixa, sem animação. Os cantos têm 14 px com mouse e 20 px com toque, com área de toque de 24 e 44 px. Cores pelos tokens, em `components/tool/crop-area.css`, inclusive no alto contraste. Teclado: Tab chega à área e aos cantos, e as setas movem e ajustam (Shift, 10 px). Os campos de margem e tamanho (`CropOptions`, com `subject` "image" ou "video" para os textos) são a alternativa a arrastar (WCAG 2.5.7).
- **Base comum das ferramentas de vídeo:** `features/video-tools/shared/`. Um vídeo por vez: `useVideoTool` valida pelo conteúdo, abre no Worker de vídeo, processa com progresso real e cancelamento e entrega o resultado; `VideoToolPage` monta a tela (seleção, prévia, painel, ações, anúncios e foco) no mesmo desenho das de imagem. Durante o processamento, a barra de progresso com porcentagem fica junto do botão "Cancelar" (painel e `ActionBar`). Comuns também: `SourcePlayer` (o vídeo escolhido, com os controles do navegador), `TrimPreview` (player com "Marcar início aqui", "Marcar fim aqui", "Ver como fica" e a linha do tempo do trecho, no Cortar trecho e no Criar GIF), `TimeFields` e `Note` (observação curta com ícone, no painel de opções). Ferramenta que entrega só o som (`output: 'audio'` nos textos, como o Extrair áudio) mostra "Áudio extraído", "Ouvir como ficou" (ícone de fones), "Baixar áudio" e o player de som em "Como ficou"; no lugar do antes e depois de tamanho (o som não se compara ao vídeo de onde saiu), os detalhes trazem o tamanho, o formato e se o som foi copiado ou refeito. Opção que não faz sentido para o vídeo aberto fica desligada no `SegmentedControl`, com o motivo em texto logo abaixo (ex.: no Mudar resolução, as resoluções iguais ou maiores que a do vídeo, porque aumentar não melhora a qualidade; no Converter vídeo, os formatos que o navegador não consegue gerar). O que acontece com cada faixa aparece como pares de termo e valor ("Vídeo: Copiado, sem perder qualidade", "Som: Refeito em AAC, a 128 kbit/s"), antes de processar e no resultado. Ferramenta que entrega GIF (`output: 'gif'`) mostra "GIF criado" e "Baixar GIF", sem o antes e depois de tamanho. Exemplos: `edit/`, `crop/`, `compress/`, `audio/`, `resize/`, `convert/` e `gif/`.
- **Editor de vídeo** (Editar vídeo): o player mostra o vídeo como está ficando e não tem os controles do navegador (eles deixariam ir às partes excluídas); abaixo, uma linha de botões (Tocar só com ícone; "Dividir" e "Excluir" com texto; Desfazer, Refazer e zoom só com ícone, à direita) e a barra do vídeo: miniaturas de 56 px de altura, pedaços encostados separados por um fio da cor do fundo, uma linha clara fixa no meio (o ponto atual) e a régua de tempo embaixo. Tocar num pedaço o marca inteiro: a parte marcada ganha moldura violeta em cima e embaixo, um véu violeta e alças violeta de 24 px nas pontas (área de toque maior, invisível), que encolhem a marca até cobrir só o que deve sair; "Excluir" tira a parte marcada. Embaixo da barra, o tempo atual e o total e uma frase curta de como tirar uma parte. No painel: "Vídeo final", "Pedaços", "Parte marcada" (começo, fim e duração), como será salvo e o "Ajuste fino" recolhido (campos de tempo da parte marcada com "Aplicar").
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
3. Rode `npm test` e confira a vitrine em `/_design`.
4. Se mudar cor da marca, atualize `BRAND_COLORS` em `logo-geometry.ts` e rode `npm run icons`.
