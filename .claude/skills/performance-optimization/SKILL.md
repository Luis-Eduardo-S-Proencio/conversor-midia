---
name: performance-optimization
description: "Otimiza o desempenho do conversor-midia com base em medição: evita travar a interface, reduz uso de memória, usa Web Workers e OffscreenCanvas, limita concorrência em lotes, libera Object URLs e bitmaps, carrega bibliotecas pesadas (FFmpeg.wasm) sob demanda e considera celulares modestos. Use com arquivos grandes ou muitos arquivos, ao notar lentidão, travamento ou consumo de memória, ao adicionar biblioteca pesada e ao planejar ferramentas de vídeo."
---

# Performance Optimization

Regras gerais (Workers como padrão, política de dependências) estão no `CLAUDE.md`. Esta Skill é o **método** e o **conhecimento de memória e carga** do domínio.

## Regra de ouro: meça antes
Defina **sintoma, métrica e meta**. Sem problema ou benefício concreto, não otimize. Observação: processar pixels em Worker é decisão **arquitetural** já tomada no `CLAUDE.md`, não otimização prematura; micro-otimizações, essas sim, esperam medição.

**Como medir**: DevTools Performance (tarefas longas acima de 50 ms, INP) e Memory (heap snapshot antes e depois de N conversões; crescimento sem queda = vazamento); `performance.mark`/`measure` em volta de decodificar e codificar; saída do `vite build` para tamanho de chunks (analisador de bundle só se justificado); Lighthouse. Simule aparelho modesto com CPU throttling (4x–6x) e rede lenta. Registre números **antes e depois**.

## Memória
- Imagem decodificada ocupa **largura × altura × 4 bytes** (50 MP ≈ 200 MB); um arquivo de poucos MB vira centenas de MB. O pico soma bitmap de origem + canvas de destino + Blob de saída + cópias.
- Lote com **concorrência limitada** (1–2 em celular; `navigator.hardwareConcurrency` como teto; não dependa de `deviceMemory`, só existe no Chromium). Libere cada arquivo ao terminar: `bitmap.close()`, zerar `canvas.width/height`, soltar referências.
- Quando só se precisa de menos resolução, reduza na decodificação (`createImageBitmap` com `resizeWidth`/`resizeHeight`), verificando suporte e qualidade.
- Object URLs: crie sob demanda e **revogue** quando o preview some, o item é removido ou o download termina. Miniaturas pequenas, não a imagem inteira.
- Não mantenha `ArrayBuffer`, Blob e base64 do mesmo arquivo ao mesmo tempo; evite `readAsDataURL` em imagens grandes. Entre thread principal e Worker, prefira **transferir** a copiar.
- Blobs e bitmaps grandes fora do estado reativo do React.

## Responsividade da interface
- Pixels no Worker (`OffscreenCanvas` + `convertToBlob`) com fallback onde faltar suporte; thread principal só para UI.
- Limite a taxa de atualização de progresso (cerca de 10–15 por segundo). Evite re-render da lista inteira a cada tick: estado por item, chaves estáveis, `memo` onde medido. Virtualização só para listas realmente enormes.
- Cancelamento com `AbortSignal`. Um pool pequeno e reutilizado de Workers; nunca um Worker por arquivo sem limite; encerre os ociosos.
- Sliders de pré-visualização com debounce; prévia em baixa resolução e resultado final em resolução cheia.

## Carregamento
- Bundle inicial enxuto: `React.lazy` e `import()` por ferramenta. Biblioteca pesada só ao abrir a ferramenta que a usa; pré-carregar por intenção (hover/foco).
- Fontes com `font-display: swap` e subconjunto de caracteres; sem salto de layout. Confirme cabeçalhos de cache dos assets com hash.
- Antes de adicionar dependência: custo em KB comprimidos e alternativa nativa.

## Vídeo e FFmpeg.wasm (etapa futura)
- **RAM**: o arquivo vai inteiro para o sistema de arquivos virtual em memória e a saída também; o pico fica várias vezes o tamanho do arquivo. WebAssembly de 32 bits tem teto de memória (cerca de 2 GB, bem menos em celular). Defina limite de tamanho/duração e avise **antes** de começar.
- **CPU**: muito mais lento que o FFmpeg nativo. A versão single-thread é lenta; multi-thread exige isolamento de origem (COOP/COEP) com custos de hospedagem. Mostre estimativa e progresso, permita cancelar (encerrando o Worker), nunca bloqueie a UI.
- Prefira operações **sem recodificar** (`-c copy`) para recortar, remover início/fim e extrair áudio quando o formato permitir: muito mais rápidas, mas cortam em keyframes. Recodifique só quando necessário e ofereça opções mais leves.
- Avalie alternativas nativas (WebCodecs, `MediaRecorder`) antes de assumir FFmpeg; o suporte varia.
- Celular: limites menores, atenção a aba em segundo plano e tela bloqueada interrompendo o processamento; teste em aparelho real ou com throttling. Falta de memória deve gerar mensagem útil, não erro genérico.

## Relato
Sintoma → medição antes → mudança → medição depois → trade-offs. Sem números, diga que é hipótese.
