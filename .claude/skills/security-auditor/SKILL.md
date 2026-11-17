---
name: security-auditor
description: "Audita a segurança do conversor-midia tratando todo arquivo do visitante como dado não confiável: validação por conteúdo real (assinatura de bytes, decodificação), arquivos malformados e bombas de pixels, SVG e conteúdo ativo, XSS, dependências vulneráveis, bibliotecas de terceiros (FFmpeg.wasm), exposição de dados e cabeçalhos de hospedagem na Vercel (CSP, COOP/COEP). Use ao mexer em upload, validação ou download, ao adicionar dependência e antes de publicar."
---

# Security Auditor

Complementa o `/security-review` nativo (revisão do diff pendente): esta Skill é o **checklist do domínio** do projeto. Regras gerais no `CLAUDE.md`. Somente leitura, salvo pedido explícito de correção.

## Modelo de ameaça
Aplicação 100% cliente, sem contas nem backend. Superfície: (a) arquivos maliciosos ou malformados abrindo no navegador do usuário; (b) XSS por nome de arquivo, metadados ou SVG; (c) cadeia de suprimentos (npm, CDN); (d) configuração de hospedagem; (e) privacidade (upload involuntário, telemetria, metadados). **Não há segredos no cliente**: tudo que vai no bundle é público (inclusive variáveis `VITE_*`).

## Método
Leia o código; rode `npm audit` e `npm ls` quando houver `package.json`; busque padrões perigosos (Grep); revise cabeçalhos (`vercel.json`). Reporte com a escala Crítico / Alto / Médio / Baixo / Sugestão (definida em `code-reviewer`), cada achado com **local, cenário de ataque realista e correção**.

## Checklist

**A. Validação de entrada**
- Lista de formatos permitidos (JPEG, PNG, WEBP; vídeo quando existir). Todo o resto é rejeitado.
- **Extensão e `file.type` são controlados pelo usuário: nunca são prova.** Confira a assinatura dos primeiros bytes (JPEG `FF D8 FF`; PNG `89 50 4E 47 0D 0A 1A 0A`; WEBP `RIFF` + 4 bytes + `WEBP`) e depois a prova real: decodificar (`createImageBitmap`) com falha tratada. Se extensão, MIME e assinatura divergirem, a política (rejeitar ou usar a assinatura e avisar) deve estar definida e testada.
- Limites **antes** de decodificar: tamanho em bytes, quantidade de arquivos por lote e **dimensões lidas do cabeçalho**. Um arquivo pequeno pode declarar dezenas de milhares de pixels por lado e esgotar a memória (decodificado ≈ largura × altura × 4 bytes).
- Nome de arquivo é texto não confiável: nunca em HTML cru; saneie para o nome de saída (sem separadores de caminho, sem caracteres de controle, tamanho limitado).

**B. Conteúdo ativo**
- SVG, HTML, PDF e similares **não são aceitos** na v1. Se SVG for adicionado: nunca inline nem `innerHTML`; só `<img>` com URL `blob:` ou rasterização; se for preciso exibir marcação, sanitizar com biblioteca dedicada e remover scripts, `on*`, `foreignObject` e referências externas.
- Downloads com `Blob` de `type` correto e extensão coerente. Nunca entregar conteúdo do usuário como `text/html`. Nunca abrir Blob em nova janela como HTML.

**C. XSS e injeção**
- Proibidos, salvo exceção justificada e saneada: `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write`, `setTimeout` com string.
- Mensagens de erro (de bibliotecas ou de arquivos) como **texto**, nunca como HTML. Links externos com `rel="noopener noreferrer"`. Parâmetros de URL e hash são não confiáveis.

**D. Privacidade**
- Nenhum `fetch`, XHR, `sendBeacon` ou WebSocket carrega conteúdo de arquivo. Confirme na aba Network: zero requisições com o arquivo. Analytics ou telemetria de terceiros só com decisão explícita (quebram a promessa de privacidade e a CSP).
- Recodificar via canvas **remove metadados** (EXIF, incluindo GPS): bom para privacidade. Se algum fluxo preservar metadados, deve ser explícito.
- Sem nomes ou conteúdo de arquivos em logs de produção. Não persistir arquivos em `localStorage`/IndexedDB sem decisão.

**E. Dependências e cadeia de suprimentos**
- `npm audit` separando dev de produção e alcançável de não alcançável; lockfile versionado; `npm ci` no CI.
- Nova dependência: mantenedor, atividade, licença, scripts de instalação (`postinstall`), tamanho, alternativa nativa.
- Sem script, CSS ou fonte de CDN de terceiros sem necessidade; se inevitável, versão fixa e SRI. Prefira hospedar os arquivos (também exigido por COEP).
- **FFmpeg.wasm** (futuro): hospedar o core no próprio site; fixar versão; conferir a licença do build usado (LGPL ou GPL, codecs e patentes); trata entrada não confiável, então limitar tamanho e tempo e tratar falta de memória.

**F. Hospedagem (Vercel)**
- Cabeçalhos em `vercel.json`: `Content-Security-Policy` restritiva (`default-src 'self'`; `script-src 'self'`, acrescentando `'wasm-unsafe-eval'` somente quando houver WebAssembly; `worker-src 'self' blob:`; `img-src 'self' blob: data:`; `connect-src 'self'`, que também barra exfiltração acidental; `object-src 'none'`; `base-uri 'self'`; `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` desabilitando recursos não usados (câmera, microfone, geolocalização).
- COOP `same-origin` + COEP `require-corp` **só** se o FFmpeg multi-thread for adotado, ciente do custo: todo recurso de outra origem passa a exigir CORS/CORP.
- Toda exceção (`'unsafe-inline'` etc.) documentada com o motivo.
- Verifique os cabeçalhos **reais** do deploy (`curl -I`), não apenas o arquivo de configuração. Decida conscientemente sobre source maps em produção.

## Conclusão do relatório
**Nunca declare a aplicação "segura".** Diga: "nenhum problema encontrado no escopo X, pelos métodos Y; não cobre Z". Separe o que foi verificado do que não foi.
