---
name: test-driven-development
description: "Conduz o desenvolvimento do conversor-midia orientado a testes com Vitest (unitários) e Playwright (integração e ponta a ponta): escreve o teste que falha, implementa o mínimo, refatora. Cobre conversão de formatos, arquivos inválidos, corrompidos e grandes, erros de processamento e lotes, conferindo o conteúdo real do resultado. Use ao implementar ou alterar qualquer funcionalidade, ao corrigir bug e antes de declarar algo concluído."
---

# Test-Driven Development

Regras gerais (estratégia de testes, definição de pronto) estão no `CLAUDE.md`. Esta Skill é o **procedimento** e a **matriz de casos**.

## Ciclo
1. **Red**: escreva o teste do comportamento desejado e veja-o **falhar** pelo motivo certo.
2. **Green**: implemente o mínimo para passar.
3. **Refactor**: limpe com os testes verdes.
- Bug: primeiro um teste que o reproduz; só então corrija (veja `systematic-debugging`).
- Passos pequenos: um comportamento por vez. Antes de rodar, confira em `package.json` quais scripts existem; não invente comandos.

## Escolha a camada certa
- **Vitest (unitário)**: lógica pura. Detecção de formato por assinatura de bytes, cálculo de dimensões (redimensionar proporcional, limites), escolha de formato e qualidade, nome do arquivo de saída, formatação de tamanhos, fila de lote, mapeamento de erros.
- **Limite importante**: jsdom e happy-dom **não implementam de verdade** Canvas, `createImageBitmap` nem `OffscreenCanvas`. Não use mock para "provar" uma conversão: o teste só validaria o próprio mock. Para pixels reais, rode em navegador real (Playwright e/ou Vitest Browser Mode, conforme a versão instalada). Mocke apenas fronteiras (ex.: cliente do Worker).
- **Playwright (integração/E2E)**: fluxo completo: `setInputFiles` → escolher ação → `page.waitForEvent('download')` → ler o arquivo baixado e conferir. Rode em Chromium, Firefox e WebKit quando possível (WebKit aproxima o Safari, não o substitui).

## Verifique o resultado de verdade
"Baixou um arquivo" não basta. Confira:
- **Formato real**: assinatura do arquivo de saída (JPEG `FF D8 FF`; PNG `89 50 4E 47 0D 0A 1A 0A`; WEBP `RIFF....WEBP`), além de extensão e MIME corretos.
- **Dimensões**: decodifique a saída e compare. Rotação de 90° troca largura e altura; recorte e redimensionamento batem com o pedido.
- **Pixels**: use imagem de teste com regiões de cor conhecida (ex.: quatro quadrantes) e amostre pixels após espelhar, girar e recortar. PNG transparente → JPG deve ter fundo definido, sem preto inesperado.
- **Compressão**: saída menor que a entrada no caso projetado; qualidade menor gera arquivo menor ou igual.
- **Entrada preservada**: o arquivo original não é alterado.

## Matriz mínima de casos (cada ferramenta de imagem)
- **Conversões** entre JPG/JPEG, PNG e WEBP, incluindo transparência → JPG.
- **Inválidos**: texto renomeado para `.png`; extensão e MIME incoerentes; arquivo vazio (0 bytes); arquivo truncado/corrompido; formato não suportado (GIF, SVG, PDF) → rejeição com mensagem clara.
- **Grandes**: muitos MB e/ou dimensões enormes (gerar em tempo de execução, nunca versionar binário grande) → limite aplicado ou processamento sem travar a UI.
- **Erros no processamento**: falha de decodificação, `toBlob` nulo, Worker que falha, cancelamento no meio → erro por arquivo, estado recuperável, nenhuma promise pendente.
- **Vários arquivos**: lote misto (válidos + inválidos), ordem, progresso por arquivo, um erro não derruba os demais, download individual e em lote.
- **Opções**: limites (1 px, maior que o original, proporção), qualidade mínima e máxima, orientação EXIF.

## Fixtures
- Pequenas, determinísticas, em `tests/fixtures/` ou geradas por helper (documente como). Sem dados pessoais (nada de fotos reais de pessoas nem EXIF com GPS).

## Disciplina
- Nome do teste descreve o comportamento. Um motivo de falha por teste. Teste o comportamento observável, não detalhes de implementação.
- Sem `sleep` fixo: use espera por condição (auto-wait do Playwright, `expect.poll`). Testes instáveis são defeito a corrigir, não a repetir.
- Nunca enfraqueça, pule ou apague teste para "passar" sem explicar o motivo ao usuário.
- Dependências de teste: só as necessárias, justificadas (política do `CLAUDE.md`).

## Definição de pronto
Funcionalidade só está concluída quando: os testes novos falharam antes e passam agora; a suíte relevante (unitários + E2E) passa; typecheck e lint sem erros; casos de erro cobertos. Interface funcionando na tela **não** é prova suficiente. Relate o que **não** foi testado (ex.: Safari real, aparelho móvel).
