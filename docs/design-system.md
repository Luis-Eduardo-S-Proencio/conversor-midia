# Design System do Media Tools

Guia de uso da identidade visual e dos componentes. **Os valores (cores, tamanhos, raios, sombras, durações) ficam só em [`src/styles/tokens.css`](../src/styles/tokens.css)**; este documento explica quando e como usá-los. Para ver tudo funcionando, abra **`/_design`**: a vitrine fica publicada, fora da navegação e sem indexação.

> **Redesenho v2** (pedido em 26/11/2026): layout refeito do zero para ficar organizado, intuitivo e com cara de app profissional, sem "cara de IA". Menu (☰) no canto superior esquerdo com Instalar app e Sobre; abas Início, Imagens e Vídeos; listas agrupadas no lugar de grades de ícones coloridos; uma fonte só; preto de verdade e cinzas neutros. Substitui o visual "estúdio de bolso" (fases 1 a 4 de 25/11/2026): os componentes de processamento, progresso e resultado continuam, com o visual novo.

## Princípios

- **Parece parte do aparelho.** Calmo, neutro e preciso, como os apps do sistema (Arquivos, Fotos, Ajustes): a interface recua e a mídia do usuário é a estrela. A personalidade vem do alinhamento, do espaçamento e do peso do texto, não de enfeite.
- **Um acento só.** O degradê da marca fica só no símbolo do logo. Botão principal, seleção, foco, progresso e links usam **um** acento (`accent`, o rosa da marca). Proibido: texto em degradê, cores por categoria, ícone colorido com selo, brilho ou sombra colorida em botão, blobs, partículas, emoji como ícone, borda tracejada ou cantoneiras como área de upload, animação em loop ou acima de 500 ms.
- **Preto de verdade e cinzas neutros em camadas**, planos, com bordas hairline de 1 px. Sem degradê, sem grão e sem sombra nas superfícies da página (sombra só no que flutua).
- **Listas agrupadas**, como nos apps do sistema: ícone num ladrilho neutro, nome, uma linha do que faz e a seta. Nada de grade de cartões idênticos.
- **Sem cara de modelo pronto.** Sem rótulo em caixa-alta acima dos títulos, sem "·" separando frases, sem seta (→) em botão ou link, sem número (01, 02) onde não há sequência.
- **Números sempre tabulares** (tempo, tamanho, resolução, %): não "dançam" quando mudam.
- **Um caminho óbvio por tela.** Um botão principal por vista; opções extras aparecem só quando fazem sentido.
- **Estado nunca só por cor.** Sucesso, aviso e erro sempre têm ícone e texto.
- **Conteúdo real.** Textos curtos e diretos, tratando por "você"; erros dizem o que houve e como resolver. Sem frase de marketing. Formatos e limites ficam na área de abrir; a frase de cada ferramenta diz só o que ela faz.

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
| `bg` | `--bg` | fundo da página: preto de verdade (`#000000`) |
| `surface-1`, `surface-2`, `surface-3` | iguais | camadas (`#161618`, `#1F1F22`, `#29292D`): listas, cartões, painéis e menu (1); grupos dentro de painel, botão secundário e controles (2); ladrilho de ícone e itens elevados (3) |
| `surface-hover` | igual | hover sobre `surface-3`; trilha do slider e do progresso |
| `stage` | — | fundo da mídia nas ferramentas e nos editores (preto) |
| `border`, `border-strong` | iguais | hairlines decorativas (branco 8% e 14%) |
| `stroke` | — | contorno de campos e controles que precisa de 3:1 (WCAG 1.4.11): opaco, `#76767F` |
| `fg`, `fg-muted`, `fg-subtle` | `--text-1/2/3` | texto principal, secundário e legenda |
| `accent` | igual | o acento: texto, ícones, seleção, foco, links e preenchimento de slider e progresso |
| `accent-solid` (+ `-hover`, `-active`) | `--accent-solid` | fundo do botão principal, com texto branco (`on-accent`) |
| `accent-soft` | igual | fundo de item selecionado (acento a 10%) |
| `brand-start`, `brand-end` | — | degradê da marca: **só o símbolo do logo** (`bg-brand`) |
| `success`, `warning`, `danger` (+ `-subtle`) | iguais | texto/ícone de estado e fundo da mensagem |
| `scrim` | — | fundo escurecido atrás de painéis e diálogos |
| `checker-a`, `checker-b` | — | fundo quadriculado da pré-visualização (transparência) |

Regras:
- **Acento: rosa** (`#FF6699` em texto e ícones, sólido `#D62466` no botão principal, com texto branco). Não há variante de acento nem cor por categoria.
- `accent-soft` usa 10%: com mais, o texto rosa sobre ele, em cima da `surface-3`, ficaria abaixo de 4,5:1.
- `border` e `border-strong` não delimitam campos; para controles, use `stroke`.
- `fg-subtle` passa 4,5:1 em todas as superfícies, inclusive `surface-hover`.
- O contraste de todos os pares em uso é verificado por [`tokens.test.ts`](../src/styles/tokens.test.ts), inclusive o fundo translúcido do acento: texto ≥ 4,5:1 e elementos de interface ≥ 3:1 (WCAG 2.2 AA). Um par novo de cores entra nesse teste.

## Tipografia

- **Uma família só: Inter** (`font-sans`), hospedada no próprio site, **só o subconjunto latino** (o português cabe nele inteiro), em [`src/styles/fonts.css`](../src/styles/fonts.css), com `font-display: swap` e preload no build (`vite.config.ts`), 48 KB. A hierarquia vem do tamanho e do peso; `cv05` e `cv11` deixam "l" e "a" mais legíveis. Títulos com `text-wrap: balance`.
- Escala por papel: `text-display` (28 a 38 px, 700, −0,025em: só o título do Início) · `text-title` (26 a 32 px, 700: título de página) · `text-section` (18 px, 600) · `text-body` (16 px) · `text-label` (16 px, 550: nome em linha de lista) · `text-secondary` (14 px) · `text-caption` (13 px, 500). **Mínimo absoluto: 12 px** (`text-xs`).
- A escala de apoio (`text-xs` … `text-5xl`) fica para casos pontuais dentro das ferramentas.
- Números: `tabular-nums` sempre. No padrão brasileiro, por [`src/core/format.ts`](../src/core/format.ts) (`Intl.NumberFormat('pt-BR')`): `8,6 MB`, `3024 × 4032`, `−78%`.
- Parágrafos com `text-wrap: pretty` e no máximo `max-w-text` (68ch).
- Campos de texto com 16 px (abaixo disso o Safari do iPhone dá zoom).

## Ícones

Lucide, sempre pelo componente `Icon` ([`src/components/ui/Icon.tsx`](../src/components/ui/Icon.tsx)): tamanhos `sm` 16, `md` 20 (padrão) e `lg` 24, com traço de 1,75 px em qualquer tamanho. Ícones são decorativos: o nome acessível fica no botão ou no texto ao lado. Botão só com ícone usa `IconButton`, que exige `label`. Sem emojis na interface.

## Espaço, forma e movimento

- **Espaçamento:** base 4 (a escala do Tailwind: `p-4` = 16 px = `--s-4`). Margem lateral `--gutter`: 16 px (celular), 24 px (a partir de 768) e 40 px (a partir de 1024), no `Container`. Espaço entre seções `--section-gap`: 32 / 48 px. Conteúdo travado em 1088 px (`--container-page`), centralizado; ferramentas usam a largura do editor (`max-w-editor`).
- **Raios por hierarquia:** `rounded-sm` 8 (itens internos) · ladrilho de ícone 10 · `rounded-md` 12 (botões, campos) · `rounded-lg` 16 (listas e cartões) · `rounded-xl` 20 (painéis de baixo, diálogos, área de abrir) · `rounded-full` (chips, pílulas, navegação do cabeçalho).
- **Bordas:** sempre 1 px, hairline.
- **Sombras:** só no que flutua: `shadow-1` (sombra curta de botão), `shadow-2` (menu, dicas, avisos), `shadow-sheet` (painel de baixo). Superfícies da página são planas.
- **Movimento:** `--dur-1` 120 ms (toque), `--dur-2` 200 ms (troca de estado), `--dur-3` 320 ms (painéis), `--dur-4` 480 ms (máximo). Curvas `ease-out`, `ease-in` e `ease-emph` (painéis e menu entrando). Anime só `transform`/`translate`/`scale` e `opacity`; nada acima de 500 ms; nada em loop, exceto carregamento (`animate-spin`, `animate-shimmer`, `animate-indeterminate`). `pressable` faz o elemento afundar (`scale .97`) ao toque. Com `prefers-reduced-motion`, as animações são desligadas em `base.css`.
- **Efeitos** (utilitários em `base.css`): `surface-card` (superfície plana com borda hairline), `drop-target` (área de abrir arquivo: superfície com borda; com `data-dragover`, contorno no acento e fundo levemente rosado), `scroller-x` (carrossel sem barra, com encaixe e fade nas bordas), `glass-header` (cabeçalho e abas translúcidos ao rolar), `skeleton` (bloco carregando), `bg-checker` (transparência).
- **Breakpoints:** 360–767 celular · 768–1023 tablet (`md`) · 1024–1439 computador (`lg`) · 1440+ (`wide`) com o conteúdo travado. Medidas fixas em `:root`: `--header-h` 56 (64 a partir de 768), `--bottomnav-h` 64, `--panel-w` 340.
- **Camadas (z-index):** cabeçalho, barra inferior e de ação 20 · dica 40 · avisos e link de pular 50. Menu, painéis e diálogos usam a camada superior do navegador (`<dialog>` modal).
- **Alvos de toque:** pelo menos 44 × 44 px com toque, com 8 px entre eles.

## Componentes

| Componente | Arquivo | Quando usar |
|---|---|---|
| `Button` | `components/ui/Button.tsx` | ações; `size` `sm` 36 · `md` 44 · `lg` 52 px, raio 12; `variant`: `primary` (acento sólido, uma por tela), `secondary` (`surface-3` com borda), `ghost`, `danger`. Desligado: opacidade .4, sem sombra e cursor de proibido. `loading`: spinner no lugar do ícone (sem ícone, por cima do texto), sem mudar a largura; mantém o foco e ignora cliques |
| `IconButton` | `components/ui/Button.tsx` | botão só com ícone (40–44 px); `label` obrigatório (nome acessível) e dica visual com mouse; `shortcut` mostra o atalho na dica; `tooltipAlign` (`start`, `end`) segura a dica dentro da tela nos cantos |
| `Card` | `components/ui/Card.tsx` | superfície base plana (raio 16, padding 16/20, borda hairline); `interactive` sobe 2 px e clareia a borda com mouse; `as` muda o elemento |
| `Chip` | `components/ui/Chip.tsx` | pílula de 36 px; `selected` (alternância, `aria-pressed`) fica com `accent-soft` e texto no acento; `CHIP_CLASSES` para links |
| `MetaChips` | `components/ui/MetaChips.tsx` | dados do arquivo (formato, resolução, duração, tamanho) em pílulas com algarismos tabulares; `animate` entra em cascata |
| `ProgressRing` | `components/ui/ProgressRing.tsx` | progresso em anel (exportação), com a porcentagem no centro; sem `value`, gira |
| `Skeleton` | `components/ui/Skeleton.tsx` | lugar reservado com brilho enquanto carrega (miniaturas, timeline) |
| `EmptyState` | `components/ui/EmptyState.tsx` | área vazia: ícone, o que fazer e a ação |
| `BottomSheet` | `components/ui/BottomSheet.tsx` | painel que sobe de baixo (`surface-1`, raio 20, alça, até 85% da altura): fecha arrastando para baixo, no ✕, com Esc, tocando fora ou com o voltar do navegador/Android; `onApply` mostra o ✓ |
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
| `Accordion` | `components/ui/Accordion.tsx` | perguntas que abrem e fecham (botão com `aria-expanded`, resposta em região inerte quando fechada); altura suave pelo truque de `grid-template-rows` |
| `ToolIcon` | `components/ui/ToolIcon.tsx` | ícone de ferramenta num ladrilho neutro (`surface-3`; `raised` sobe um tom dentro de painel); decorativo |
| `Dropzone` | `components/tool/Dropzone.tsx` | estado vazio da ferramenta: área de abrir (`drop-target`, a largura toda), ícone num círculo, botão real e arrastar como atalho; formatos e limites embaixo, sem "·" |
| `ToolShortcuts` | `components/tool/ToolShortcuts.tsx` | atalhos da ferramenta embaixo da área de abrir (destinos do Comprimir vídeo, formatos do Converter imagem e do Extrair áudio), já escolhidos antes do arquivo |
| `LeaveGuard`, `useWakeLock`, `useRemainingTime` | `components/tool/` | durante o processamento: confirmação ao sair ("Parar o processamento?"; ao fechar a aba, o aviso do navegador), tela acesa (Wake Lock) e o tempo que falta pelo ritmo do progresso (`core/eta.ts`) |
| `CompareSlider` | `components/tool/CompareSlider.tsx` | "Antes e depois": original e resultado sobrepostos com uma divisória que se arrasta (teclado incluído), quando a moldura não muda |
| `ReuseResultButton` | `features/open/` | "Usar em outra ferramenta": o resultado (foto JPG, PNG ou WEBP; vídeo MP4, MOV ou WEBM) abre o painel "O que fazer com este arquivo?" |
| `usePageFileDrop`, `PageDropOverlay` | `components/tool/` | soltar arquivo em qualquer ponto da página; enquanto arrasta, uma área com contorno no acento cobre a tela com "Solte para abrir" |
| `usePasteFiles`, `readClipboardFiles` | `components/tool/usePasteFiles.ts` | colar (Ctrl+V ou ⌘V) abre a imagem copiada; o botão "Colar" lê a área de transferência pelo navegador |
| `FileActionSheet`, `OpenedSummary`, `useOpenMedia` | `features/open/` | "O que fazer com este arquivo?": reconhece o tipo pelo conteúdo, mostra miniatura e dados (`MetaChips`) e as ferramentas que abrem o arquivo (`ToolList`, com "Recomendado"); a escolhida o recebe (`file-handoff.ts`) e toma o lugar do painel no histórico |
| `ToolList` | `components/tool/ToolList.tsx` | ferramentas numa lista agrupada (linhas de 64 px: ícone, nome, uma linha do que faz e a seta; divisor recuado); `currentPath` marca a aberta ("Aberta", `aria-current`); `replace` e `onNavigate` para painéis; `raised` dentro de painel. Usada no Início, em Imagens e Vídeos, em "O que fazer com este arquivo?" e em "Outras ferramentas" |
| `ToolMenuButton` | `components/tool/ToolMenuButton.tsx` | "Outras ferramentas", à direita da barra da ferramenta: painel com as ferramentas do mesmo tipo; ir para outra leva os arquivos abertos e toma o lugar do painel no histórico |
| `FilePickerButton` | `components/tool/FilePickerButton.tsx` | botão que abre o seletor do sistema (ex.: "Adicionar" com a lista já aberta) |
| `FilePreview` | `components/tool/FilePreview.tsx` | prévia grande; `backdrop` mostra o fundo que o resultado terá (JPG); `orientation` mostra o giro escolhido, sem reprocessar; quem cria a Object URL a revoga |
| `FileListItem` | `components/tool/FileListItem.tsx` | um arquivo na lista: miniatura decorativa (girada com `orientation`), linha técnica, estado, erro ou aviso e ações; com `onShow`, a miniatura vira o botão "Mostrar nome" (`aria-pressed`) que leva a imagem para a prévia grande |
| `FileInfo` | `components/tool/FileInfo.tsx` | nome + linha técnica do arquivo |
| `ResultSummary` | `components/tool/ResultSummary.tsx` | "2,6 MB → 1,1 MB · −58%", com a barra que encolhe do original até o novo; os nomes (Antes, Depois, Redução) ficam para o leitor de tela |
| `CompareView`, `ResultImage`, `ResultVideo`, `ResultAudio`, `ResultGif` | `components/tool/` | depois de processar: "Mostrar: Como ficou / Original", um de cada vez; o resultado de imagem, de vídeo, de som (player de som com o nome do arquivo) ou GIF animado (com o botão "Pausar animação"; com "reduzir movimento" no sistema, já começa parado), com aviso para baixar quando o navegador não mostra ou não toca o formato (TIFF, PDF) |
| `CropArea`, `CropOptions` | `components/tool/` | área de recorte sobre imagem ou vídeo (a mídia vai como filho) e os campos, proporções e tamanho final; `finalSize` quando o resultado difere da área (vídeo: lados pares) |
| `DownloadActions` | `components/tool/DownloadActions.tsx` | baixar um arquivo ou o pacote (`bundle`, ex.: ZIP) e "Compartilhar" o próprio arquivo onde o navegador permite (inclusive no computador); lê os arquivos só no clique (`getFiles`) |
| `AppShell` | `components/layout/AppShell.tsx` | estrutura comum (já montada pelo roteador), conforme `handle.layout` da rota (`route-handle.ts`): `root` (Início, Imagens, Vídeos: cabeçalho com o menu e, no celular, abas), `page` (Sobre, licenças, não encontrada: só a barra com voltar), `tool` (ferramentas: só a barra com voltar) e `editor` (tela cheia, sem nenhuma barra do site) |
| `AppHeader` | `components/layout/AppHeader.tsx` | cabeçalho das telas raiz: menu (☰) no canto esquerdo, a marca e, a partir de 768 px, Início, Imagens e Vídeos à direita (pílula na atual); ganha fundo translúcido e borda só depois de rolar |
| `MenuDrawer`, `InstallSteps` | `components/layout/` | o menu (☰): gaveta que entra pela esquerda com "Instalar app" (some com o app instalado); no rodapé, links de texto para "Sobre o Media Tools", "Termos de uso" e "Política de privacidade". Sem o pedido de instalação do navegador, mostra dentro da própria gaveta o passo a passo do aparelho (iPhone, Android ou computador) |
| `TopAppBar` | `components/layout/TopAppBar.tsx` | barra superior das telas internas (56/64 px, fixa): voltar, título (o h1 da tela) e ações à direita (`actions`, ex.: "Outras ferramentas"); `backTo` é o pai lógico |
| `BottomNav` | `components/layout/BottomNav.tsx` | abas do celular (Início, Imagens, Vídeos), 64 px + área da barra de gestos, translúcidas; a ativa com o ícone preenchido no acento e o nome em branco |
| `TransitionLink`, `TransitionNavLink`, `useBack` | `components/layout/` | links com animação de troca de página (direção em `app/nav-direction.ts`) e o voltar com pai lógico |
| `Container`, `PageHeader`, `ActionBar` | `components/layout/` | largura e margens, título da página, ação principal da ferramenta |

Componentes de `ui/` e `tool/` não processam arquivos: recebem dados por props. O processamento fica no núcleo e nos Workers (ver `CLAUDE.md`).

## Padrões de tela

**Navegação.** Igual no navegador e no app instalado. **Telas raiz** (Início, Imagens, Vídeos): cabeçalho com o menu (☰) no canto superior esquerdo e a marca; no celular, três abas embaixo (Início, Imagens, Vídeos); a partir de 768 px, os mesmos três links no cabeçalho, à direita, e nada embaixo. Sem barra lateral, sem trilho e sem rodapé de site. **Telas internas** (ferramentas, Sobre, licenças): só a `TopAppBar` com voltar (modo foco, sem abas). O link ativo recebe `aria-current="page"`. **Voltar:** quem chegou navegando volta no histórico (com a rolagem restaurada); quem abriu um link direto vai para o pai lógico (`/sobre` → `/`, `/imagens/*` → `/imagens`, `/videos/*` → `/videos`). Menu, painéis e diálogos abertos empilham um passo no histórico: o voltar do navegador ou do Android os fecha antes de sair da tela; os links do menu e dos painéis tomam o lugar desse passo. Tela nova abre no topo. **Troca de página:** View Transitions (entrar desliza da direita, voltar da esquerda, aba só esmaece; cabeçalho e abas ficam parados), desligadas com "reduzir movimento". Ao trocar de página, o foco vai para o conteúdo, e o link "Pular para o conteúdo" aparece no primeiro Tab.

**Instalar o app.** Fica no menu (☰), como "Instalar app", enquanto o app não está instalado. No Chromium (Chrome, Edge, Samsung Internet), o aviso de que o app pode ser instalado (`beforeinstallprompt`) é guardado sem a faixa automática do navegador, e o item abre o pedido de instalação dele. Sem esse pedido (iPhone e iPad, Firefox, ou o Chrome antes de liberar), o item mostra dentro do menu o passo a passo do aparelho (`InstallSteps`: Safari → Compartilhar → Adicionar à Tela de Início; Android → menu do navegador → Instalar app; computador → ícone de instalar na barra de endereço ou Adicionar ao Dock no Safari do Mac).

**Início.** Título "Edite fotos e vídeos", a frase "Tudo é feito no seu aparelho. Nada é enviado." e **Abrir foto ou vídeo** (no celular, a largura toda); no computador também **Colar** (Ctrl+V) e, à direita, a área de soltar. Soltar um arquivo em qualquer ponto mostra "Solte para abrir"; colar uma imagem também abre. Escolhido o arquivo, sobe **"O que fazer com este arquivo?"** (`FileActionSheet`): miniatura, formato, medidas, duração e tamanho, e as ferramentas que o abrem (no vídeo, Editar vídeo primeiro, como recomendado; com várias imagens, só as de lote). Fechar cancela. Embaixo, todas as ferramentas em duas listas agrupadas, **Vídeo** (7) e **Imagem** (5), lado a lado no computador. Sem atalhos rápidos (pedido de 26/11/2026); os endereços com a ferramenta já ajustada (`?destino=whatsapp`, `?formato=pdf`, `?formato=mp3`, `?proporcao=9:16`) continuam valendo.

**Página.** Telas raiz: `Container` + `PageHeader` (h1 único) + conteúdo. Telas internas: `TopAppBar` (o título dela é o h1) + `Container` + conteúdo. Defina o título da aba com `<title>Nome · Media Tools</title>` dentro da página.

**Imagens e Vídeos.** Título ("Imagens" ou "Vídeos", como a aba), os formatos e limites numa frase e o botão **Abrir imagens** / **Abrir vídeo** (leva a "O que fazer com este arquivo?"); embaixo, "Ferramentas de imagem" ou "Ferramentas de vídeo" numa lista agrupada. Coluna de até 768 px, alinhada à esquerda.

**Sobre.** Aberto pelo menu (☰), não é aba. `TopAppBar` com voltar. No alto, o ícone do app, o nome, a **versão** (do `package.json`, injetada pelo build), uma frase e **Compartilhar** (folha do sistema; sem ela, copia o link). Depois, numa coluna de até 672 px: **Privacidade** (`#privacidade`), **Formatos** e **Limites** (linhas de nome e valor, vindos de `core/`) e **Perguntas frequentes** (`Accordion`). **Sem créditos e licenças** (pedido de 26/11/2026): o aviso que as licenças pedem (Mediabunny, MPL-2.0; LAME, LGPL, com os links do código-fonte) fica em **Licenças de código aberto** (`/sobre/licencas`, `LicensesPage`), ligada pelos Termos de uso (seção Software de terceiros).

**Documentos legais** (`/termos`, `/privacidade`; `pages/legal/LegalDocument`). `TopAppBar` com voltar (o h1); depois, numa coluna de até 768 px: selo "Documento legal" (pílula com ícone, sem caixa-alta), o título repetido em `text-display` só para quem vê (`aria-hidden`), "Última atualização" com ícone de relógio, resumo em `text-body`, divisória com um traço curto do acento, cartão "Neste documento" com o índice numerado (duas colunas a partir de 768 px, linhas de 44 px, âncoras para as seções) e as seções numeradas: título `text-section` com hairline embaixo, texto `text-secondary` com entrelinha folgada, listas com marcador discreto e destaques em `font-semibold text-fg`. Espaço de 56 px entre seções.

**Editor de imagens.** No alto, a `TopAppBar` (voltar para Imagens, título e "Outras ferramentas") e a frase da ferramenta; embaixo, o palco escuro (`bg-stage`) com a prévia grande e a lista de arquivos, e o painel de opções à direita (fixo ao rolar, a partir de 1024 px). Trocar de ferramenta leva as imagens abertas (os originais, nunca os resultados); o Recortar fica com a primeira. Com várias imagens, a primeira aparece grande e a miniatura de cada uma escolhe outra.

**Editor de vídeo.** O mesmo desenho, com "Vídeos" para voltar e as sete ferramentas de vídeo em "Outras ferramentas". Trocar de ferramenta leva o vídeo aberto (o original); a nova ferramenta o abre de novo no Worker dela. No palco, o player da ferramenta (no Editar vídeo, o player e a barra com miniaturas); no painel, as opções e "Salvar vídeo" ou a ação da ferramenta.

**Ferramenta.** Vazio: a frase da ferramenta, a área de abrir na largura toda e, embaixo, os atalhos da própria ferramenta (destinos do Comprimir vídeo, formatos do Converter imagem e do Extrair áudio). Com o arquivo: no vídeo, os dados em pílulas (formato, medidas, duração, tamanho). Processando: barra com a porcentagem e o tempo que falta, Cancelar, tela acesa e confirmação ao sair. Resultado: a economia animada, "Como ficou", "Original" e, quando a moldura não muda, "Antes e depois" com divisória; Baixar, Compartilhar, Usar em outra ferramenta e recomeçar. Trocar de ferramenta: "Outras ferramentas", à direita da barra, em qualquer largura. Ainda por fazer: grade de miniaturas com estado por item no lote e a estimativa de tamanho ao vivo nas ferramentas de imagem e nas demais de vídeo.

**Etapas da ferramenta.** Toda ferramenta segue cinco etapas: seleção → pré-visualização → opções → processamento → resultado. Cada fluxo cobre os estados vazio, pronto, processando, sucesso, erro e rejeitado ([Skill `frontend-design`](../.claude/skills/frontend-design/SKILL.md)). Mostre só as opções da ferramenta; opções dependentes aparecem quando necessárias (ex.: cor de fundo ao converter para JPG).
- **Base comum das ferramentas de imagem:** `features/image-tools/shared/`. `ImageToolPage` monta a tela inteira (seleção, lista, painel, ações, anúncios e foco) e `useImageBatch` cuida de validar, gerar prévias, processar em fila e entregar. Ferramenta nova = textos (`BatchLabels`), painel de opções e uma função que processa um arquivo (`BatchProcess`). Exemplos: `convert/`, `compress/`, `resize/`, `rotate/` e `crop/`.
- **Uma imagem por vez** (ex.: Recortar, em que cada foto tem um enquadramento próprio): `useImageBatch(labels, { singleImage: true })` e `ImageToolPage` com `singleImage`. A imagem nova substitui a atual, o botão da lista vira "Trocar imagem" e, se chegarem várias, só a primeira abre, com aviso. `renderPreview` troca a prévia comum pela da ferramenta (ex.: a área de recorte).
- **Proporções do recorte** (`core/crop-fields.ts`): Livre, 1:1, 4:5, 9:16, 16:9 e 3:2, sempre na orientação escrita (9:16 é em pé mesmo num vídeo deitado: dá para tirar um Story), em duas linhas de três. Um atalho pode pedir a proporção (`?proporcao=9:16`).
- **Área de recorte** (`components/tool/CropArea.tsx`, com `react-image-crop`, comum a imagem e vídeo): recebe a mídia como filho (`<img>` ou `<video>`). A seleção escurece o resto e tem borda fixa, sem animação. Os cantos têm 14 px com mouse e 20 px com toque, com área de toque de 24 e 44 px. Cores pelos tokens, em `components/tool/crop-area.css`, inclusive no alto contraste. Teclado: Tab chega à área e aos cantos, e as setas movem e ajustam (Shift, 10 px). Os campos de margem e tamanho (`CropOptions`, com `subject` "image" ou "video" para os textos) são a alternativa a arrastar (WCAG 2.5.7).
- **Base comum das ferramentas de vídeo:** `features/video-tools/shared/`. Um vídeo por vez: `useVideoTool` valida pelo conteúdo, abre no Worker de vídeo, processa com progresso real e cancelamento e entrega o resultado; `VideoToolPage` monta a tela (seleção, prévia, painel, ações, anúncios e foco) no mesmo desenho das de imagem. Durante o processamento, a barra de progresso com porcentagem fica junto do botão "Cancelar" (painel e `ActionBar`). Comuns também: `SourcePlayer` (o vídeo escolhido, com os controles do navegador), `TrimPreview` (player com "Marcar início aqui", "Marcar fim aqui", "Ver como fica" e a linha do tempo do trecho, no Cortar trecho e no Criar GIF), `TimeFields` e `Note` (observação curta com ícone, no painel de opções). Ferramenta que entrega só o som (`output: 'audio'` nos textos, como o Extrair áudio) mostra "Áudio extraído", "Ouvir como ficou" (ícone de fones), "Baixar áudio" e o player de som em "Como ficou"; no lugar do antes e depois de tamanho (o som não se compara ao vídeo de onde saiu), os detalhes trazem o tamanho, o formato e se o som foi copiado ou refeito. Opção que não faz sentido para o vídeo aberto fica desligada no `SegmentedControl`, com o motivo em texto logo abaixo (ex.: no Mudar resolução, as resoluções iguais ou maiores que a do vídeo, porque aumentar não melhora a qualidade; no Converter vídeo, os formatos que o navegador não consegue gerar). O que acontece com cada faixa aparece como pares de termo e valor ("Vídeo: Copiado, sem perder qualidade", "Som: Refeito em AAC, a 128 kbit/s"), antes de processar e no resultado. Ferramenta que entrega GIF (`output: 'gif'`) mostra "GIF criado" e "Baixar GIF", sem o antes e depois de tamanho. Exemplos: `edit/`, `crop/`, `compress/`, `audio/`, `resize/`, `convert/` e `gif/`.
- **Editor de vídeo** (Editar vídeo): o player mostra o vídeo como está ficando e não tem os controles do navegador (eles deixariam ir às partes excluídas); abaixo, uma linha de botões (Tocar só com ícone; "Dividir" e "Excluir" com texto; Desfazer, Refazer e zoom só com ícone, à direita) e a barra do vídeo: miniaturas de 56 px de altura, pedaços encostados separados por um fio da cor do fundo, uma linha clara fixa no meio (o ponto atual) e a régua de tempo embaixo. Tocar num pedaço o marca inteiro: a parte marcada ganha moldura violeta em cima e embaixo, um véu violeta e alças violeta de 24 px nas pontas (área de toque maior, invisível), que encolhem a marca até cobrir só o que deve sair; "Excluir" tira a parte marcada. Embaixo da barra, o tempo atual e o total e uma frase curta de como tirar uma parte. No painel: "Vídeo final", "Pedaços", "Parte marcada" (começo, fim e duração), como será salvo e o "Ajuste fino" recolhido (campos de tempo da parte marcada com "Aplicar").
- **Player de vídeo com marcar início e fim** (Criar GIF): o `<video controls>` do navegador (teclado incluído), uma linha do tempo só visual (em violeta o que vira GIF, com o ponto atual) e, abaixo, "Marcar início aqui", "Marcar fim aqui" e "Ver como fica", com a frase "Agora em 0:03,20 · os botões marcam o trecho do GIF". Os campos de tempo ("1:05,30") são a alternativa ao player. Sob a área de recorte, os controles do navegador ficariam inalcançáveis: "Reproduzir/Pausar" e o slider "Momento do vídeo" ficam abaixo dela. Se o navegador não conseguir mostrar o vídeo, a página diz isso e os campos continuam valendo.
- **Campos com erro** (ex.: Largura e Altura do Redimensionar): a mensagem fica abaixo dos campos, ligada a eles por `aria-describedby`, com `aria-invalid` só nos que têm problema. Valor errado aparece já ao digitar e é anunciado (`role="alert"`). Campo obrigatório vazio só vira erro quando a pessoa tenta processar, e então o foco vai até ele. O botão principal não fica desativado por erro de campo: ao clicar, a pessoa descobre o que falta.
- Arquivo único mostra prévia grande; vários, lista de `FileListItem`. Observação por arquivo (ex.: "mantida a original") aparece no tom informativo, sem cor de erro. Opções e resultado ficam num painel à direita a partir de 1024 px; a ação principal aparece no painel (desktop) e na `ActionBar` (celular). Ao terminar, o foco vai para o resultado; ao esvaziar a lista, para "Selecionar imagens". Uma região `role="status"` anuncia só início e fim (não cada arquivo), incluindo quantos foram recusados.
- **Ver como ficou:** depois de processar, a prévia do arquivo único dá lugar a "Mostrar: Como ficou / Original" (`CompareView`), começando no resultado, que é o próprio arquivo gerado (não uma simulação). O painel do resultado tem "Ver como ficou", que leva até a comparação (no celular ela fica acima) e volta para o resultado. Num lote, cada imagem pronta tem o botão de olho "Ver como ficou", que abre a comparação acima da lista, com "Fechar a comparação". Mudar as opções descarta o resultado e a comparação some.
- Rota da ferramenta declara `handle: { layout: 'tool' }`: no celular, a barra inferior dá lugar à `ActionBar` com a ação principal.
- `TopAppBar` com voltar: no PWA instalado não existe o botão voltar do navegador.
- A partir de 1024 px: prévia à esquerda, painel de opções à direita.

**Texto.** Português do Brasil, frases curtas, voz ativa. Botões dizem o que acontece ("Converter", "Baixar imagem"). Diga "seus arquivos não saem do seu dispositivo" só onde for verdade.

## Alterar ou acrescentar um token

1. Edite `src/styles/tokens.css` (nunca valores soltos nos componentes).
2. Se o token for cor usada em par com outra, acrescente o par em `tokens.test.ts`.
3. Rode `npm test` e confira a vitrine em `/_design`.
4. Se mudar cor da marca, atualize `BRAND_COLORS` em `logo-geometry.ts` e rode `npm run icons`.
