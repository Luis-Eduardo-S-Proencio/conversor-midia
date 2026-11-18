---
name: accessibility-review
description: "Revisa e garante a acessibilidade do conversor-midia (meta WCAG 2.2 nível AA): navegação por teclado, foco visível, contraste, HTML semântico, leitores de tela, mensagens de erro claras e controles acessíveis como área de upload, botões, formulários, progresso e resultados. Use ao criar ou alterar telas e componentes interativos e antes de concluir uma funcionalidade de interface."
---

# Accessibility Review

Meta do projeto: **WCAG 2.2 nível AA** (definida no `CLAUDE.md`). Esta Skill é o checklist e o método. Escala de severidade: Crítico / Alto / Médio / Baixo / Sugestão (ver `code-reviewer`); "Crítico" aqui é o que **impede** um usuário de completar a tarefa principal.

## Método
1. Leia o JSX/HTML dos componentes.
2. Rode o app (Skill `run`) e percorra o fluxo **só com o teclado**.
3. Se houver testes E2E, use axe (`@axe-core/playwright`, devDependency a ser justificada). A automação cobre **parte** dos problemas; o resto é revisão manual.
4. Quando possível, teste com leitor de tela (NVDA no Windows; VoiceOver no Safari). **Declare o que não foi testado.**

## Checklist

**1. Semântica**
- `lang` do `<html>` coerente com o idioma da interface; `<title>` descritivo.
- Marcos (`header`, `main`, `nav`, `footer`), um `<h1>` e títulos sem pular nível.
- `<button>` para ações, `<a>` para navegação; nunca `div` clicável. Listas reais para lista de arquivos. Todo campo com `<label>` associado. Ordem do DOM = ordem visual.

**2. Teclado**
- Tudo operável por teclado, ordem de foco lógica, sem armadilha. Esc fecha modais e menus.
- **Área de upload**: `<input type="file">` real (com `label` ou botão associado), acionável por Enter/Espaço. Arrastar e soltar é um **extra**, nunca o único caminho.
- Controles que dependem de arrastar (recorte, deslize) têm alternativa: campos numéricos, setas, `<input type="range">` ou ARIA completo (valor, mínimo, máximo).

**3. Foco**
- Indicador visível (`:focus-visible`) com contraste mínimo 3:1; nunca `outline: none` sem substituto.
- Ao mudar de tela ou estado (concluiu, erro), conduza o foco ou anuncie. Ao remover item, leve o foco a um destino lógico. Modais prendem e devolvem o foco.

**4. Visual**
- Contraste de texto 4,5:1 (3:1 para texto grande); componentes de interface e foco 3:1.
- Informação nunca só por cor. Reflow em 320 px e zoom de 200% sem perda; texto em `rem`.
- Alvos de toque de pelo menos 24×24 px (WCAG 2.2), preferindo 44 px. Nada depende de hover.
- Respeitar `prefers-reduced-motion` e, quando possível, `forced-colors`.

**5. Leitores de tela e ARIA**
- ARIA só quando o HTML nativo não resolve. Botões só com ícone têm nome acessível.
- Estados expostos: `aria-expanded`, `aria-pressed`, `aria-busy`.
- Progresso com `<progress>` ou `role="progressbar"` (valor e rótulo). Conclusão em região `role="status"`; erros em `role="alert"`. Anuncie **marcos**, não cada 1%.

**6. Imagens**
- Ícones decorativos: `alt=""` ou `aria-hidden`.
- Pré-visualização de arquivo do usuário: não há como descrever o conteúdo. Use alt informativo com nome e propriedades (ex.: "Pré-visualização de foto.jpg, 1920 por 1080"), ou alt vazio se o nome já aparece em texto ao lado, evitando redundância. Nome, tamanho e formato sempre em texto.

**7. Erros e formulários**
- Mensagem diz o que houve e como resolver, em linguagem simples ("Este arquivo não é uma imagem válida. Escolha um JPG, PNG ou WEBP."), nunca códigos técnicos.
- Associada ao campo (`aria-describedby`, `aria-invalid`); não só por cor; não apaga o que o usuário já preencheu. Em lote, erro por arquivo sem perder os demais.
- Instruções **antes** do campo: formatos aceitos e tamanho máximo.

**8. Tempo e movimento**
- Sem limite de tempo; processamento longo com botão de cancelar; nada pisca.

**9. Diversidade de usuários**
- Linguagem simples, instruções curtas, tolerância a erro. Funciona com teclado, leitor de tela, zoom, alto contraste e toque, no celular e no computador.

## Relato
Por achado: critério WCAG (ex.: 2.4.7 Foco Visível), local (arquivo:linha), quem é afetado, correção. **Nunca declare "100% acessível"**: diga o que foi e o que não foi verificado.
