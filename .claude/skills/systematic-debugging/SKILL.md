---
name: systematic-debugging
description: "Investiga bugs do conversor-midia de forma sistemática: reproduzir, coletar evidências, formular e testar hipóteses, achar a causa raiz e aplicar a menor correção com teste de regressão. Use ao encontrar erro, falha de teste, comportamento inesperado, travamento, vazamento de memória ou resultado de conversão incorreto, antes de alterar código para consertar."
---

# Systematic Debugging

**Regra de ouro: nenhuma correção sem causa raiz identificada e comprovada.** Palpites ("talvez seja X") viram hipóteses a testar, não alterações no código.

## Fases
1. **Reproduzir.** Passos exatos e entrada mínima: arquivo, opções, navegador e versão, SO, modo dev ou build de produção. Se possível, transforme em teste que falha (Skill `test-driven-development`). Se não reproduz, colete mais dados; não "corrija às cegas".
2. **Coletar evidências.** Mensagem completa e stack; console do navegador (erros, avisos, violações de CSP); aba Network (saiu alguma requisição inesperada?); erros do Worker (`onerror`, `onmessageerror`); saída dos testes ou trace do Playwright (`--trace on`); `git log` e `git diff` recentes: o que mudou desde que funcionava (`git bisect` se preciso); versões de dependências.
3. **Isolar.** Reduza: qual arquivo, qual opção, qual navegador, thread principal ou Worker, dev ou build. Compare um caso que funciona com um que falha.
4. **Hipóteses.** Liste 1–3, cada uma com uma previsão testável ("se for X, então Y deve acontecer"). Teste a mais provável com instrumentação mínima (log, breakpoint, teste) e descarte por evidência.
5. **Causa raiz.** Explique o mecanismo em poucas frases: onde, por quê, e por que só nesse caso. Separe **sintoma** de **causa** (ex.: `toBlob` retornar `null` é sintoma; a causa pode ser canvas acima do limite do aparelho).
6. **Corrigir.** A menor mudança que ataca a causa. Sem refatorar de carona, sem tocar vários arquivos sem necessidade, sem `try/catch` que esconde o erro, sem "resolver" com timeout maior. **Se a correção for complexa ou invasiva, explique a causa e a abordagem e peça confirmação antes de aplicar.**
7. **Verificar.** O teste de reprodução passa; a suíte completa passa; repita o passo a passo original se for problema de interface; confira vizinhança (outros formatos, outros navegadores); remova logs e instrumentação temporários.
8. **Relatar.** Sintoma, causa raiz, correção (arquivos), como foi verificado, riscos restantes.

## Suspeitos comuns neste projeto
- **Canvas**: `toBlob` devolve `null` ou tipo diferente do pedido (ex.: navegador sem codificação WebP cai para PNG); canvas acima do limite de dimensão/área (sobretudo Safari no celular); transparência virando preto no JPEG; orientação EXIF; espaço de cor.
- **Workers**: caminho do Worker diferente entre dev e build (`new Worker(new URL('./x.ts', import.meta.url), { type: 'module' })`); erro dentro do Worker sem resposta; dado clonado em vez de transferido; Worker nunca encerrado; CSP bloqueando `worker-src` ou `blob:`.
- **Memória**: Object URLs não revogados, `ImageBitmap` sem `close()`, Blobs retidos em estado; aba que recarrega ou fecha sozinha em celular.
- **React**: estado velho em closure assíncrona; efeito executado duas vezes no StrictMode (dev); corrida entre conversões; limpeza ausente em `useEffect`.
- **Ambiente**: diferença entre dev e build (Vite); cabeçalhos de hospedagem (COOP/COEP, CSP); `SharedArrayBuffer` indisponível sem isolamento de origem (FFmpeg multi-thread); extensões do navegador; versão do Node.
- **Testes**: instabilidade por espera fixa, ordem dos testes, fixture errada.

## Quando travar
Três tentativas de correção sem sucesso: **pare**. Volte às fases 2–3, questione o modelo mental, e reporte ao usuário o que se sabe e o que falta saber. Não empilhe remendos.
