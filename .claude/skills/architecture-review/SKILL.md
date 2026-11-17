---
name: architecture-review
description: "Avalia e orienta a arquitetura do conversor-midia: organização de pastas, separação de responsabilidades, tamanho de componentes, duplicação, pipeline de processamento de imagem e vídeo e uso de Web Workers. Use ao planejar uma funcionalidade ou ferramenta nova, criar ou mover módulos, escolher padrão ou dependência, ou quando um arquivo estiver crescendo demais. Use antes de implementar, não depois."
---

# Architecture Review

Regras permanentes do projeto estão no `CLAUDE.md` (seção Arquitetura). Esta Skill é o **método de avaliação**; não repita as regras aqui, aplique-as.

## Quando usar
- Planejar funcionalidade nova ou ferramenta nova (imagem agora, vídeo depois).
- Criar, mover ou renomear módulos; mexer no pipeline de processamento ou no protocolo do Worker.
- Introduzir dependência, camada, abstração ou padrão novo.
- Componente ou arquivo crescendo, lógica repetida, estado confuso.

Não use para correção pontual de bug, ajuste de estilo ou texto.

## Procedimento
1. **Leia o estado real** (Glob/Read). A estrutura do `CLAUDE.md` é uma proposta; confirme o que existe antes de assumir.
2. **Mapeie o que a mudança toca**: UI, estado, pipeline, Worker, tipos compartilhados, testes.
3. **Aplique o checklist** abaixo, só nos pontos relevantes.
4. **Recomende a opção mais simples** que atende ao requisito. Mostre alternativas apenas se houver trade-off real.
5. **Mudança grande** (altera estrutura de pastas, cria camada ou abstração, adiciona dependência, muda o protocolo do Worker): antes de implementar, explique **motivo, alternativas consideradas, impacto (arquivos, risco, custo de reverter)** e aguarde a aprovação do usuário.

## Checklist

**Separação de responsabilidades**
- Dependências apontam para baixo: UI (React) → hooks/estado → cliente do Worker → Worker → núcleo puro (TypeScript sem DOM nem React).
- Lógica de processamento (cálculo de dimensões, escolha de formato, nome de saída, validação) vive em funções puras e testáveis. Componentes só apresentam e orquestram.
- Sinais de componente grande demais: mais de um motivo para mudar, regra de negócio dentro do JSX, cerca de 200+ linhas. São sinais, não limite rígido.

**Duplicação**
- Procure (Grep) antes de criar. Extraia quando a regra de negócio é a mesma ou na 3ª repetição. Semelhança apenas visual não exige abstração.

**Pipeline de processamento (imagem e vídeo)**
- Contrato único por operação: entrada (`Blob` ou `ImageBitmap`) + opções tipadas → `Promise<Blob>`, com `AbortSignal` para cancelar e callback de progresso.
- Protocolo do Worker tipado (união discriminada). Transfira buffers e bitmaps (transferables) em vez de copiar. Todo pedido recebe resposta de sucesso **ou** erro; nunca deixe promise pendente. Erros com código estável e mensagem amigável.
- Detecte recursos (`OffscreenCanvas`, `createImageBitmap`, codificação WebP) e tenha fallback explícito: o suporte varia entre navegadores.
- Lote: fila com concorrência limitada; falha de um arquivo não derruba o lote; resultado por arquivo.
- Estado: Blobs e arquivos grandes fora do estado reativo do React (ref ou store). O estado de UI guarda metadados (id, nome, tamanho, status, progresso).

**Escalabilidade**
- Ferramenta nova = módulo novo reutilizando o núcleo, sem editar ferramentas existentes. Só crie registry ou plugin quando houver 2–3 ferramentas com a mesma forma; antes disso é abstração prematura.
- Vídeo: feature isolada, com Worker próprio e carregamento sob demanda (`import()`); FFmpeg fora do bundle inicial. Ver seção de vídeo no `CLAUDE.md`.

**Dependências**
- Antes de sugerir biblioteca: dá para resolver com API nativa (Canvas, Blob, URL, `CompressionStream`)? Pese tamanho de bundle, manutenção, licença e segurança. Justifique conforme a política do `CLAUDE.md`.

**Não regressão**
- Liste contratos públicos afetados (tipos, props, protocolo do Worker) e os testes que os cobrem. Sem testes, escreva-os antes de refatorar (Skill `test-driven-development`).

## Formato da resposta
Veredito curto (adequado / ajustes / refatorar) → problemas por prioridade, cada um com arquivo, recomendação mínima e impacto. Não proponha reescrever o que funciona sem motivo concreto.
