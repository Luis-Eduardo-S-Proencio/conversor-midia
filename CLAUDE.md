# Media Tools (repositório `conversor-midia`)

Plataforma web **gratuita** para converter, comprimir e editar imagens e vídeos **direto no navegador**. Sem conta, sem login, sem backend: o visitante escolhe um arquivo, escolhe o que fazer e baixa o resultado. Interface em **português do Brasil**.

Este arquivo é a fonte das regras do projeto. Os **métodos** de trabalho (checklists, procedimentos) estão nas Skills de `.claude/skills/` e **não são repetidos aqui**.

## Estado atual
Scaffold, Design System, navegação e páginas institucionais prontos (Início, Imagens, Vídeos, Sobre, página não encontrada). **Nenhuma ferramenta funciona ainda**: todas aparecem como "Em breve" no catálogo (`src/app/tool-catalog.ts`). Confirme o que existe no disco antes de assumir.

## Funcionalidades
- **Imagens (primeira versão)**: converter entre JPG/JPEG, PNG e WEBP; comprimir; redimensionar; recortar, girar e espelhar; processar vários arquivos; baixar os resultados.
- **Vídeos (etapa futura)**: converter formatos; comprimir; recortar trechos; remover início e fim; redimensionar resolução; extrair áudio.
- Fora de escopo agora: autenticação, banco de dados, backend, SVG como entrada, HEIC, qualquer formato fora da lista acima. Só entram mediante pedido explícito.

## Tecnologias
React 19 · TypeScript 7 (estrito) · Vite 8 · Tailwind CSS 4 · React Router 8 (aplicação de página única) · lucide-react · fontes Inter e JetBrains Mono hospedadas no site (`@fontsource-variable`) · Canvas API (`OffscreenCanvas` e `createImageBitmap` onde houver suporte) · Web Workers · Vitest 5 (Node + modo navegador com Playwright) · Playwright · oxlint · GitHub · Vercel (hospedagem estática). FFmpeg.wasm **somente** na etapa de vídeo.

Navegadores suportados (piso herdado do Tailwind 4): Safari/iOS 16.4+, Chrome/Edge 111+, Firefox 128+.

## Comandos
`package.json` é a fonte; não invente scripts. Ambiente: Node 24+, npm, Windows.
- `npm run dev`: servidor de desenvolvimento (vitrine de componentes em `/design-system`).
- `npm run build` / `npm run preview`: build de produção e prévia local.
- `npm run typecheck` · `npm run lint` (oxlint, avisos reprovam).
- `npm test`: Vitest, projetos `unit` (Node, `*.test.ts`) e `browser` (Chromium real, `*.test.tsx`).
- `npm run test:e2e`: Playwright no build de produção (360, 768 e 1280 px) e na vitrine.
- `npm run icons`: regenera favicon e ícones do PWA a partir da geometria do logotipo.
- Primeira vez: `npx playwright install chromium`.

## Estrutura
```
src/
  app/                 # roteador e catálogo de ferramentas
  pages/               # páginas (Início, Imagens, Vídeos, Sobre, erros); pages/dev só em desenvolvimento
  components/
    ui/                # primitivos visuais (Button, Field, SegmentedControl...)
    layout/            # AppShell, navegação, rodapé, Container, PageHeader, ActionBar
    tool/              # padrão das ferramentas (Dropzone, FilePreview, DownloadActions...), sem processamento
    brand/             # logotipo e sua geometria
  core/                # TypeScript puro, sem DOM nem React: formatação; depois validação, formatos, dimensões
  styles/              # tokens.css (valores), base.css, index.css
  test/                # configuração dos testes de navegador
  features/            # ferramentas, quando implementadas (image-tools, video-tools)
  workers/             # Workers e protocolo de mensagens tipado, quando houver processamento
scripts/               # geração de ícones
tests/e2e/             # Playwright
docs/design-system.md  # regras de uso da identidade e dos componentes
```
Testes unitários ficam ao lado do código. `features/` e `workers/` ainda não existem. Mudar esta estrutura é decisão arquitetural (ver abaixo).

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
- Não persistir arquivos do usuário (localStorage, IndexedDB, cache) sem decisão explícita.
- Skills: `security-auditor` (segurança), `performance-optimization` (memória).

## Segurança
- Proibido sem exceção justificada: `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write`.
- Nome de arquivo, mensagens e metadados são texto não confiável: nunca como HTML.
- Sem segredos no cliente (tudo no bundle é público; inclui `VITE_*`). Não registrar informação sensível em logs.
- Hospedagem com cabeçalhos de segurança (CSP restritiva, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) em `vercel.json`. COOP/COEP só se o FFmpeg multi-thread for adotado.
- Nenhuma afirmação de "aplicação segura": relate escopo e limites da verificação.

## Desempenho
- Medir antes de otimizar; não fazer otimização prematura (a regra do Worker acima não é otimização prematura).
- Bundle inicial enxuto; bibliotecas pesadas via `import()` sob demanda.
- Considerar celulares e computadores modestos: concorrência baixa, limites de tamanho, mensagens claras quando faltar memória.
- Liberar memória por arquivo processado; não manter Blobs/bitmaps grandes em estado reativo do React.

## Estratégia de testes
- **Vitest**: lógica pura (assinaturas de bytes, dimensões, nomes de saída, filas, mapeamento de erros) no projeto `unit`; componentes e qualquer coisa que dependa de Canvas no projeto `browser` (Chromium real). jsdom não é usado: **não** validar conversão com mock.
- **Playwright**: fluxo real (selecionar → processar → baixar → conferir o arquivo). Verificar formato real (assinatura), dimensões e pixels da saída, não só "baixou".
- Casos obrigatórios: conversões entre formatos, arquivo inválido/corrompido/vazio, arquivo grande, erro no processamento, múltiplos arquivos.
- **Funcionalidade só está concluída com testes adequados passando** (unit + E2E relevantes), typecheck e lint limpos. Interface funcionando não basta. Relatar o que não foi testado. Skill: `test-driven-development`.

## Responsividade e acessibilidade
- Mobile-first; verificar 360 px, 768 px e 1280 px+; sem scroll horizontal; alvos de toque de 44 px; upload funciona sem arrastar e soltar.
- Meta de acessibilidade: **WCAG 2.2 AA**: teclado, foco visível, contraste, HTML semântico, `role="status"`/`"alert"` para progresso e erros, `prefers-reduced-motion`.
- **Identidade visual definida** (Media Tools: escura, azul discreto, Inter e JetBrains Mono, ícones Lucide, logotipo "Recorte"). Regras em `docs/design-system.md`; valores só em `src/styles/tokens.css`, que removem a paleta padrão do Tailwind. Contraste dos tokens verificado em `tokens.test.ts`. Skills: `frontend-design`, `accessibility-review`.

## Política de dependências
Antes de instalar qualquer pacote, justificar ao usuário: o problema, por que a API nativa não basta, tamanho (KB comprimidos), manutenção, licença, scripts de instalação e se é dependência de produção ou de desenvolvimento. Preferir a plataforma (Canvas, Blob, URL, `CompressionStream`). Versões e lockfile versionados; `npm audit` na adoção. Instalar com `npm install --before=<data de 2 semanas atrás>` para evitar versões recém-publicadas. Sem CDN de terceiros sem necessidade. Risco aceito: alerta de ReDoS no `picomatch` (GHSA-fc5q-39xc-vjpf), só em desenvolvimento (Vite/Vitest), sem versão corrigida em 17/11/2026 e sem entrada de visitante; reavaliar quando houver correção. Pendências já previstas, **a decidir quando chegar a hora**: biblioteca de ZIP para download em lote, interface de recorte, FFmpeg.wasm.

## Vídeo (desenvolvimento futuro)
- Feature isolada (`features/video-tools`), Worker próprio, carregamento sob demanda; FFmpeg fora do bundle inicial; core hospedado no próprio site e versão fixa.
- Antes de adotar FFmpeg.wasm: conferir licença do build (LGPL/GPL, codecs e patentes) e avaliar WebCodecs/`MediaRecorder` como alternativa.
- Limites: RAM (arquivo + saída em memória; teto do WebAssembly de 32 bits), CPU (lento; multi-thread exige COOP/COEP), tamanho e duração máximos avisados **antes** de começar, progresso e cancelamento sempre.
- Preferir operações sem recodificar (`-c copy`) para recortar, remover trechos e extrair áudio quando o formato permitir.
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
