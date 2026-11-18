---
name: frontend-design
description: "Constrói e revisa a interface do Media Tools seguindo o Design System do projeto: layout responsivo, componentes reutilizáveis, hierarquia visual, tipografia, espaçamento, animações discretas e estados de upload, processamento, sucesso e erro. Use ao criar ou alterar telas, componentes, estilos Tailwind e fluxos de upload e download, ou ao revisar o visual."
---

# Frontend Design

Regras gerais (stack, responsividade, acessibilidade) estão no `CLAUDE.md`. Esta Skill define **como projetar e montar a interface**. Acessibilidade em detalhe é da Skill `accessibility-review`; desempenho é da `performance-optimization`.

## Identidade visual: definida
- **Leia `docs/design-system.md` antes de criar ou alterar interface.** Ele traz as regras de cor, tipografia, ícones, componentes e padrões de tela.
- Valores só em `src/styles/tokens.css`. A paleta padrão do Tailwind foi removida: use apenas os tokens (`bg-surface`, `text-fg-muted`, `border-border-strong`...). Nunca valores hexadecimais nos componentes.
- **Reutilize antes de criar**: os primitivos estão em `components/ui`, a estrutura em `components/layout`, o padrão das ferramentas em `components/tool`. Confira a vitrine em `/design-system` (`npm run dev`) e acrescente nela todo componente novo.
- Mudança de identidade (cor da marca, fonte, logotipo) é decisão do usuário: proponha e espere a aprovação.

## Princípios
- **Um caminho óbvio**: escolher arquivo → escolher o que fazer → ver resultado → baixar. Opções avançadas recolhidas e reveladas sob demanda.
- **Pouco por tela**: um botão primário por vista; poucas informações, só as necessárias para decidir.
- **Hierarquia antes de cor**: tamanho, peso e espaço guiam o olhar. Escala tipográfica pequena (3–4 níveis), espaçamento em múltiplos de 4, alinhamentos consistentes.
- **Cor com moderação**: base neutra + um destaque contido. Estado (sucesso, erro, aviso) nunca só por cor: acompanha ícone e texto.
- **Aparência de produto, não de template de IA.** Evite: gradientes decorativos, brilho e desfoque (glow/blur) gratuitos, sombras pesadas, emoji como ícone, hero genérico com texto vazio, grade de 3 "features" com ícones, tudo em cards idênticos. Prefira conteúdo real e clareza.
- Transmitir **profissionalismo, confiança e facilidade**. Na dúvida entre mais um elemento e menos um, remova.

## Responsividade
- Mobile-first. Confira 360 px, 768 px e 1280 px ou mais; nenhum scroll horizontal; use `dvh` em vez de `vh` para alturas de tela.
- Alvos de toque de pelo menos 44 px. O upload funciona sem arrastar e soltar (celular não tem).
- Componentes se adaptam por layout fluido (flex/grid, `min-w-0`), não por duplicar markup por breakpoint.

## Componentes
- Primitivos em `components/ui` (Button, Badge, Field, Input, SegmentedControl, Slider, ProgressBar, Alert, NavList, NavCard) e padrão de ferramenta em `components/tool` (Dropzone, FilePreview, FileInfo, ResultSummary, DownloadActions). Sem lógica de processamento dentro deles.
- Props tipadas; variações por props (`variant`, `size`), não por cópias. Composição em vez de componentes com dezenas de opções.
- Tailwind utilitário; extraia **componente** quando se repetir, não `@apply` em massa. CSS próprio só quando o Tailwind não resolver.

## Estados obrigatórios em cada fluxo
1. **Vazio**: o que fazer, formatos aceitos, limite de tamanho.
2. **Pronto**: arquivo(s) selecionado(s) com nome, tamanho e miniatura leve; opções da ação.
3. **Processando**: progresso real quando existir (senão indicador indeterminado), botão de cancelar, sem bloquear a página.
4. **Sucesso**: antes e depois (tamanho, dimensões), botão de baixar em destaque, ação de recomeçar.
5. **Erro**: o que aconteceu e o que fazer, em linguagem simples. Em lote, erro **por arquivo**, sem perder os demais.
6. **Rejeitado**: motivo claro (formato não suportado, arquivo grande demais, arquivo corrompido).
- Sem salto de layout entre estados. Preserve a seleção do usuário quando houver erro.

## Movimento
- 150–250 ms, easing suave, animar só `opacity` e `transform`. A animação comunica estado (item entrando, progresso), nunca decora.
- Respeite `prefers-reduced-motion`.

## Texto da interface
- Curto, direto, na linguagem do usuário. Mensagens de erro dizem causa provável e próximo passo.
- Afirme "seus arquivos não saem do seu dispositivo" **somente** nas ferramentas em que isso for verdade.

## Verificação
- Rode o app (Skill `run`) e confira nos três tamanhos de tela, todos os seis estados, e o fluxo completo só pelo teclado.
- Antes de concluir uma tela, acione `accessibility-review`; para telas com processamento pesado, `performance-optimization`.
