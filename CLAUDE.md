# Media Tools (repositório `conversor-midia`)

Plataforma web **gratuita** para converter, comprimir e editar imagens e vídeos **direto no navegador**. Sem conta, sem login, sem backend: o visitante escolhe um arquivo, escolhe o que fazer e baixa o resultado. Interface em **português do Brasil**.

Este arquivo é a fonte das regras do projeto. Os **métodos** de trabalho (checklists, procedimentos) estão nas Skills de `.claude/skills/` e **não são repetidos aqui**.

## Estado atual
Scaffold, Design System, navegação e páginas institucionais prontos (Início, Imagens, Vídeos, Sobre, página não encontrada). Todas as ferramentas de imagem da primeira versão funcionam, sobre a base comum `features/image-tools/shared/`: **Converter** (`/imagens/converter`), **Comprimir** (`/imagens/comprimir`), **Redimensionar** (`/imagens/redimensionar`), **Girar e espelhar** (`/imagens/girar`) e **Recortar** (`/imagens/recortar`, uma imagem por vez). Vídeo, sobre a base comum `features/video-tools/shared/` (um vídeo por vez, com o Mediabunny num Worker próprio): **Cortar trecho** (`/videos/cortar`) e **Recortar vídeo** (`/videos/recortar`). As demais de vídeo aparecem como "Em breve" no catálogo (`src/app/tool-catalog.ts`). Baixar vídeos por link (YouTube, Instagram) **não** será feito até o usuário decidir. Ainda sem teste em aparelho real: roteiro em `docs/roteiro-teste-aparelhos.md`. Confirme o que existe no disco antes de assumir.

## Funcionalidades
- **Imagens (primeira versão)**: converter JPG/JPEG, PNG e WEBP para JPG, PNG, WEBP, BMP, TIFF, ICO e PDF; comprimir; redimensionar; recortar, girar e espelhar; processar vários arquivos; baixar os resultados.
- **Vídeos**: prontos: cortar trecho (início e fim, modos Exato e Rápido) e recortar o quadro, com entrada MP4, MOV e WEBM de até 1 GB e saída no mesmo formato. Etapa futura: converter formatos; comprimir; redimensionar resolução; extrair áudio; criar GIF animado a partir de um trecho (o GIF fica com os vídeos, não com as imagens).
- Fora de escopo agora: autenticação, banco de dados, backend, SVG como entrada, HEIC, qualquer formato fora da lista acima (entrada só JPG, PNG e WEBP; vídeo só MP4, MOV e WEBM). Só entram mediante pedido explícito. AVIF, HEIC e JPEG XL como saída exigem codificador em WebAssembly (dependência pesada; HEIC também tem questão de patentes): decidir quando pedidos.

## Tecnologias
React 19 · TypeScript 7 (estrito) · Vite 8 · Tailwind CSS 4 · React Router 8 (aplicação de página única) · lucide-react · fontes Inter e JetBrains Mono hospedadas no site (`@fontsource-variable`) · Canvas API (`OffscreenCanvas` e `createImageBitmap` onde houver suporte) · codificadores próprios de BMP, TIFF, ICO e PDF em TypeScript (`core/image/encode`, sem dependência) · Web Workers · fflate (ZIP do download em lote, carregado sob demanda dentro do Worker) · react-image-crop (área de recorte na tela, só nas páginas de recortar) · Mediabunny (vídeo via WebCodecs, dentro do Worker de vídeo, só nas páginas de vídeo) · Vitest 5 (Node + modo navegador com Playwright) · Playwright · oxlint · GitHub · Vercel (hospedagem estática). FFmpeg.wasm não é usado (ver Vídeo).

Navegadores suportados (piso herdado do Tailwind 4): Safari/iOS 16.4+, Chrome/Edge 111+, Firefox 128+.

## Comandos
`package.json` é a fonte; não invente scripts. Ambiente: Node 24+, npm, Windows.
- `npm run dev`: servidor de desenvolvimento (vitrine de componentes em `/design-system`).
- `npm run build` / `npm run preview`: build de produção e prévia local.
- `npm run typecheck` · `npm run lint` (oxlint, avisos reprovam).
- `npm test`: Vitest, projetos `unit` (Node, `*.test.ts`) e `browser` (Chromium real, `*.test.tsx`).
- `npm run test:e2e`: Playwright no build de produção (Chromium em 360, 768 e 1280 px; as ferramentas de imagem e de vídeo também no Firefox e no WebKit) e na vitrine. O `preview` aplica os cabeçalhos do `vercel.json`, então a CSP é testada localmente.
- `npm run icons`: regenera favicon e ícones do PWA a partir da geometria do logotipo.
- `npm run fixtures`: regenera as imagens e os vídeos de teste em `tests/fixtures/` (os vídeos são codificados pelo Mediabunny no Chromium do Playwright).
- Primeira vez: `npx playwright install chromium firefox webkit`.

## Estrutura
```
src/
  app/                 # roteador e catálogo de ferramentas
  pages/               # páginas (Início, Imagens, Vídeos, Sobre, erros); pages/dev só em desenvolvimento
  components/
    ui/                # primitivos visuais (Button, Field, SegmentedControl...)
    layout/            # AppShell, navegação, rodapé, Container, PageHeader, ActionBar
    tool/              # padrão das ferramentas (Dropzone, FilePreview, DownloadActions, CropArea e CropOptions de imagem e vídeo...), sem processamento
    brand/             # logotipo e sua geometria
  core/                # TypeScript puro, sem DOM nem React: formatação, nome-base de arquivo, campos de recorte (crop-fields), só algarismos (digits)
    image/             # formatos, assinatura de bytes, cabeçalho, inspeção com limites, nomes de saída, mensagens, medidas de redimensionamento, orientação (giros e espelhos), área de recorte
      encode/          # codificadores próprios (BMP, TIFF, ICO, PDF), lendo os pixels em faixas
    video/             # formatos, assinatura de bytes, limite, mensagens, tempos ("1:05,30"), trecho e modos de corte, regras do recorte (lados pares, mínimo), nomes de saída
  styles/              # tokens.css (valores), base.css, index.css
  test/                # configuração dos testes de navegador, construtores de bytes de imagem e de vídeo e leitor de vídeos (video-reader)
  features/
    image-tools/
      shared/          # base das ferramentas de imagem: estado do lote, fila, tela (ImageToolPage), modo de uma imagem por vez
      convert/         # Converter imagem: opções e regra de formato
      compress/        # Comprimir imagem: níveis e regra de compressão (compress-file.ts)
      resize/          # Redimensionar imagem: porcentagem ou pixels, validação dos campos e regra por arquivo (resize-file.ts)
      rotate/          # Girar e espelhar: giros de 90° e espelhos, a mesma orientação para o lote (rotate-file.ts)
      crop/            # Recortar imagem: prévia sob a área de recorte (components/tool), regra por arquivo (crop-file.ts)
    video-tools/
      shared/          # base das ferramentas de vídeo: um vídeo por vez (useVideoTool), tela (VideoToolPage), ações com progresso
      trim/            # Cortar trecho: player com marcar início e fim, campos de tempo, modos Exato e Rápido
      crop/            # Recortar vídeo: vídeo sob a área de recorte, reproduzir e escolher o momento
  workers/             # Workers de imagens e de vídeo (Mediabunny), protocolos tipados e clientes com fila e cancelamento (o de vídeo com progresso)
scripts/               # geração de ícones e de fixtures
tests/e2e/             # Playwright; image-tool.ts e video-tool.ts reúnem os auxiliares (tsconfig.e2e.json reaproveita src/core)
tests/fixtures/images/ # imagens de teste pequenas, geradas por script
tests/fixtures/videos/ # vídeos de teste pequenos (cores por segundo, quadrantes, girado, com e sem som, inválidos), gerados por script
docs/                  # design-system.md (identidade e componentes), roteiro-teste-aparelhos.md
vercel.json            # rotas da SPA e cabeçalhos de segurança (CSP etc.)
```
Testes unitários ficam ao lado do código. Mudar esta estrutura é decisão arquitetural (ver abaixo).

## Arquitetura
- Camadas: UI (React) → hooks/estado → cliente do Worker → Worker → núcleo puro (`core/`, sem DOM nem React). Dependências só apontam para baixo.
- Lógica de processamento em funções puras e testáveis; componentes só apresentam e orquestram.
- **Todo processamento de pixels (decodificar, redimensionar, codificar) roda em Web Worker**, com detecção de recurso e fallback; a thread principal só cuida da interface. É decisão arquitetural fixa, não otimização opcional.
- Operação de processamento = função com entrada tipada → `Promise<Blob>`, com `AbortSignal` e progresso. Protocolo do Worker tipado; todo pedido recebe resposta de sucesso ou erro.
- Lote com concorrência limitada; erro de um arquivo não derruba os demais.
- Componentes pequenos, uma responsabilidade; extrair duplicação real (regra de negócio repetida), não semelhança visual.
- Ferramenta nova = módulo novo, sem alterar as existentes. Sem abstração antes de haver 2–3 casos reais.
- **Mudança arquitetural grande** (estrutura de pastas, nova camada, mudança de protocolo, nova dependência estrutural): explicar motivo, alternativas e impacto e **esperar aprovação** antes. Skill: `architecture-review`.

## Padrões de código
- TypeScript estrito (`strict`); sem `any` sem justificativa em comentário; tipos explícitos nas fronteiras (Worker, `core/`).
- Funções curtas, nomes descritivos, early return, sem código morto nem comentário que repete o código; comente o **porquê** de decisões não óbvias.
- Idioma: conversar e documentar em **português do Brasil**; identificadores de código em **inglês**; textos da interface seguem o idioma definido para o produto.
- Estilos com Tailwind utilitário; cores, fontes e espaçamentos via **tokens do tema**, nunca valores soltos espalhados.
- Erros: nunca engolir (`catch` vazio); mensagens ao usuário em linguagem simples, detalhes técnicos só no console de desenvolvimento.
- Recursos liberados sempre: `URL.revokeObjectURL`, `ImageBitmap.close()`, `Worker.terminate()`, limpeza em `useEffect`.
- Lint: oxlint (padrão do template do Vite), com avisos reprovando; sem avisos ignorados.

## Processamento local de arquivos
- **Padrão: o arquivo nunca sai do dispositivo.** Nenhum `fetch`, XHR, `sendBeacon` ou WebSocket com conteúdo de arquivo. Enviar a servidor exige necessidade comprovada **e autorização explícita do usuário**.
- Arquivo do visitante é **dado não confiável**. Valide por assinatura de bytes e por decodificação real, não por extensão ou `file.type`.
- Limites antes de decodificar: bytes, número de arquivos e dimensões (memória decodificada ≈ largura × altura × 4).
- Recodificar via canvas remove metadados (EXIF/GPS); PNG/WEBP com transparência → JPEG exige cor de fundo definida; confirme na saída que o formato pedido foi realmente gerado (alguns navegadores trocam para PNG em silêncio).
- Medidas para decidir (tamanho final, recorte): as de `item.image` depois da prévia, que são as da imagem decodificada e já orientada, como o Worker a verá. O cabeçalho de PNG e WEBP não informa a orientação.
- Girar e espelhar: as 8 orientações vêm de `core/image/orientation.ts`, que dá as medidas, a matriz do canvas (só 0, 1 e −1: sem reamostrar) e o CSS da prévia. A prévia e o arquivo usam a mesma conta, conferida em teste.
- Recortar: a área é guardada em pixels inteiros da imagem orientada (`core/image/crop.ts`); a tela a desenha em porcentagem sobre a prévia reduzida. O Worker copia exatamente a área e recusa área fora da imagem.
- Reduzir imagem no Worker: sempre por `drawResized` (em `image.worker.ts`), inclusive prévias e ICO. Num passo só, o Firefox, que não tem `imageSmoothingQuality`, cria listras falsas (moiré). Uma sonda decide: onde um passo só sai bom (Chromium), um passo; senão, etapas de metade. Testes E2E de moiré no Chromium e no Firefox.
- Vídeo: a primeira barreira é `core/video/inspect.ts` (tamanho e assinatura de bytes); a abertura real (faixas, duração, codecs, o que o navegador decodifica e codifica) é no Worker. Medidas do vídeo = pixels quadrados com a rotação aplicada, o mesmo espaço em que o Mediabunny recorta. O resultado sai sem metadados (`tags: {}`: localização, data, aparelho), conferido em teste; faixa descartada pelo Mediabunny vira erro, nunca vídeo mudo em silêncio.
- Não persistir arquivos do usuário (localStorage, IndexedDB, cache) sem decisão explícita.
- Skills: `security-auditor` (segurança), `performance-optimization` (memória).

## Segurança
- Proibido sem exceção justificada: `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write`.
- Nome de arquivo, mensagens e metadados são texto não confiável: nunca como HTML.
- Sem segredos no cliente (tudo no bundle é público; inclui `VITE_*`). Não registrar informação sensível em logs.
- Hospedagem com cabeçalhos de segurança (CSP restritiva, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) em `vercel.json`, conferidos por `tests/e2e/security.spec.ts`. COOP/COEP só se o FFmpeg multi-thread for adotado. `media-src 'self' blob:` (aprovado em 19/11/2026) permite ao player mostrar o vídeo escolhido pela URL temporária; nada de fora do site.
- A CSP não permite `data:`: o build não embute `.woff2` (`assetsInlineLimit` em `vite.config.ts`). Recurso novo (fonte, Worker, imagem) precisa caber na CSP ou ela deve ser ajustada conscientemente.
- Nenhuma afirmação de "aplicação segura": relate escopo e limites da verificação.

## Desempenho
- Medir antes de otimizar; não fazer otimização prematura (a regra do Worker acima não é otimização prematura).
- Bundle inicial enxuto; bibliotecas pesadas via `import()` sob demanda.
- Considerar celulares e computadores modestos: concorrência baixa, limites de tamanho, mensagens claras quando faltar memória.
- Liberar memória por arquivo processado; não manter Blobs/bitmaps grandes em estado reativo do React.

## Estratégia de testes
- **Vitest**: lógica pura (assinaturas de bytes, dimensões, nomes de saída, filas, mapeamento de erros, codificadores) no projeto `unit`; componentes e qualquer coisa que dependa de Canvas no projeto `browser` (Chromium real). jsdom não é usado: **não** validar conversão com mock.
- Formatos escritos pelo app são conferidos por leitores independentes (`src/test/format-readers.ts`) e, onde o navegador lê o formato (BMP, ICO), também pela decodificação dele.
- **Playwright**: fluxo real (selecionar → processar → baixar → conferir o arquivo). Verificar formato real (assinatura), dimensões e pixels da saída, não só "baixou".
- Casos obrigatórios: conversões entre formatos, arquivo inválido/corrompido/vazio, arquivo grande, erro no processamento, múltiplos arquivos.
- O WebKit do Playwright no Windows não tem `OffscreenCanvas` nem decodificador de vídeo (`VideoDecoder`): lá os testes de conversão e de recodificar vídeo se pulam sozinhos e só a mensagem de navegador incompatível (e o corte rápido, que só copia) é conferida. O Safari real tem os recursos e precisa de teste em macOS ou iOS. Em 21/11/2026 uma política de Controle de Aplicativo do Windows passou a bloquear o executável do WebKit do Playwright neste computador: o projeto `webkit` não abre até a política permitir.
- Vídeo: os vídeos de teste são lidos por um leitor independente do Worker (`src/test/video-reader.ts` no navegador; Mediabunny só para ler, sem decodificar, no E2E), e as cores dos quadros são conferidas pelo canal dominante (codificar altera os valores, e cada navegador converte cores do seu jeito).
- **Funcionalidade só está concluída com testes adequados passando** (unit + E2E relevantes), typecheck e lint limpos. Interface funcionando não basta. Relatar o que não foi testado. Skill: `test-driven-development`.

## Responsividade e acessibilidade
- Mobile-first; verificar 360 px, 768 px e 1280 px+; sem scroll horizontal; alvos de toque de 44 px; upload funciona sem arrastar e soltar.
- Meta de acessibilidade: **WCAG 2.2 AA**: teclado, foco visível, contraste, HTML semântico, `role="status"`/`"alert"` para progresso e erros, `prefers-reduced-motion`.
- **Identidade visual definida** (Media Tools: escura, azul discreto, Inter e JetBrains Mono, ícones Lucide, logotipo "Recorte"). Regras em `docs/design-system.md`; valores só em `src/styles/tokens.css`, que removem a paleta padrão do Tailwind. Contraste dos tokens verificado em `tokens.test.ts`. Skills: `frontend-design`, `accessibility-review`.

## Política de dependências
Antes de instalar qualquer pacote, justificar ao usuário: o problema, por que a API nativa não basta, tamanho (KB comprimidos), manutenção, licença, scripts de instalação e se é dependência de produção ou de desenvolvimento. Preferir a plataforma (Canvas, Blob, URL, `CompressionStream`). Versões e lockfile versionados; `npm audit` na adoção. Instalar com `npm install --before=<data de 2 semanas atrás>` para evitar versões recém-publicadas. Sem CDN de terceiros sem necessidade. Em 19/11/2026 o `npm audit` não aponta vulnerabilidades (o alerta de ReDoS no `picomatch`, GHSA-fc5q-39xc-vjpf, aceito em 17/11 por ser só de desenvolvimento, não aparece mais). ZIP do download em lote: `fflate` (MIT, sem dependências). Área de recorte: `react-image-crop` (ISC, sem dependências nem scripts de instalação, 4,9 KB + 1,1 KB de CSS comprimidos, carregada só em `/imagens/recortar`), adotada em 19/11/2026 com aprovação: gestos de mouse, toque e teclado prontos; textos traduzidos e aparência pelos tokens (`components/tool/crop-area.css`), hoje também no recorte de vídeo. Vídeo: `mediabunny` 1.65.2 (MPL-2.0, sem dependências nem scripts de instalação, mantido ativamente), adotado em 19/11/2026 com aprovação: lê e escreve MP4, MOV e WEBM e recodifica pelo WebCodecs do navegador. Fica só no Worker de vídeo (489 KB, 120 KB comprimidos), carregado só nas páginas de vídeo. `npm audit` sem vulnerabilidades em 21/11/2026. FFmpeg.wasm foi descartado (GPL, cerca de 31 MB, parado desde 04/2025); fica como alternativa futura só para formatos exóticos.

## Vídeo
- Feature isolada (`features/video-tools`), Worker próprio (`workers/video.worker.ts`, com o Mediabunny), carregado sob demanda só nas páginas de vídeo.
- Limites: arquivo e resultado ficam na memória (`BufferTarget`): 1 GB por vídeo, avisado antes de escolher; progresso real e cancelamento (encerra o Worker) sempre. Falta de memória vira mensagem própria.
- Preferir não recodificar. Cortar trecho: **Exato** copia o vídeo quando o início cai num quadro-chave (ou no começo) e recodifica quando não cai (não há "corte inteligente" que recodifique só o começo); **Rápido** sempre copia, a partir do quadro-chave anterior, que fica escondido antes do zero (MP4 e MOV). WEBM não guarda quadros antes do zero: lá só existe o Exato, e o som pode ser recodificado em Opus.
- Recodificar: MP4 e MOV saem só em H.264 (toca em todo lugar), WEBM em VP9 (ou VP8, AV1), em qualidade alta. H.264 exige lados pares: a área de recorte perde 1 px onde for ímpar (`core/video/crop.ts`), e a tela mostra o tamanho final real. Área mínima de 16 px.
- O que o navegador consegue (decodificar o vídeo, codificar o resultado) é conferido ao abrir; sem isso, o corte exato e o recorte ficam indisponíveis com explicação (ex.: HEVC do iPhone em navegador sem o decodificador), e o corte rápido continua.
- Faixas: só a principal de vídeo e a de áudio (com codec conhecido); havendo outras, a tela avisa.
- Criar GIF (futuro): o Mediabunny não gera GIF; os quadros podem vir dele (decodificados) para o codificador próprio de GIF (paleta + LZW, com testes) que está no histórico do git, commit `400bb79`, de quando o GIF era saída do conversor de imagens.
- Mobile com limites menores e testes em aparelho real. Skills: `architecture-review`, `performance-optimization`, `security-auditor`.

## Skills do projeto (`.claude/skills/`)
Use cada uma **quando a responsabilidade for relevante**; não é preciso ativar todas a cada pedido.

| Skill | Use quando |
|---|---|
| `architecture-review` | planejar funcionalidade/ferramenta, mexer em estrutura ou no pipeline, adicionar dependência ou padrão, componente crescendo |
| `frontend-design` | criar ou alterar telas, componentes, estilos, fluxos de upload/download |
| `test-driven-development` | implementar ou alterar funcionalidade, corrigir bug, antes de declarar concluído |
| `systematic-debugging` | erro, falha de teste, comportamento inesperado, travamento, resultado incorreto |
| `code-reviewer` | ao fim de alterações importantes ou quando for pedida revisão (somente leitura) |
| `security-auditor` | upload/validação/download, nova dependência, cabeçalhos de hospedagem, antes de publicar |
| `performance-optimization` | arquivos grandes ou muitos arquivos, lentidão, memória, biblioteca pesada, vídeo |
| `accessibility-review` | ao concluir ou alterar qualquer interface interativa |

Comandos nativos que **complementam** (não duplicar em Skills): `/code-review` (varredura de bugs no diff), `/security-review` (segurança do diff pendente; exige remoto `origin`), `/simplify` (limpeza do código alterado), `/run` e `/verify` (rodar o app e observar o resultado real). O `/debug` nativo depura a sessão do Claude Code, não o código do app; para bugs do projeto use `systematic-debugging`. Fluxo típico de uma funcionalidade: `architecture-review` → `test-driven-development` + `frontend-design` → `accessibility-review` / `security-auditor` / `performance-optimization` conforme o caso → `code-reviewer`.

## Regras permanentes de desenvolvimento
1. Não implementar funcionalidades que não foram solicitadas.
2. Não alterar partes funcionais sem necessidade; preservar o trabalho existente.
3. Não instalar bibliotecas sem justificar (ver política de dependências).
4. Não fazer alterações arquiteturais grandes sem explicar os motivos e esperar aprovação.
5. Não considerar funcionalidade concluída sem testes adequados.
6. Não ignorar erros ou avisos importantes.
7. Não expor informações sensíveis.
8. Não enviar arquivos dos usuários a servidores sem necessidade e autorização explícita.
9. **Não fazer commits nem pushes automaticamente**; só quando o usuário pedir.
10. Explicar alterações importantes de forma clara.
11. Preferir soluções simples, seguras e fáceis de manter.
12. Em revisões, não alterar código sem autorização, exceto quando a tarefa pedir correções explicitamente.
