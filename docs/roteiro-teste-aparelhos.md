# Roteiro de teste em aparelhos reais

Os testes automáticos rodam no Chromium, no Firefox e no WebKit do Windows, com o celular **simulado**. Ficam de fora o Safari de verdade, o seletor de fotos, a galeria, a memória de um celular, o toque real e os vídeos gravados pela câmera (HEVC no iPhone). Este roteiro cobre esses pontos em cerca de 55 minutos por aparelho. Faça em pelo menos um iPhone (Safari) e um Android (Chrome).

## 1. Abrir o site no celular

**A. Prévia na Vercel (recomendado).** O endereço é https, e só assim funcionam o botão "Salvar na galeria" e a instalação como app. Exige publicar a branch: um push para o GitHub ligado à Vercel ou `npx vercel` na pasta do projeto.

**B. Rede local, sem publicar.** No computador, rode `npm run build` e depois `npm run preview -- --host`. O terminal mostra `Network: http://192.168.x.x:4173`. Abra esse endereço no celular conectado ao mesmo Wi-Fi. Se o Windows perguntar, permita o Node na rede privada.
Limite: por ser http, "Salvar na galeria" não aparece e o app não pode ser instalado. O resto funciona.

## 2. Separe na galeria

- 5 fotos da câmera, uma delas tirada com o celular em pé.
- Um print de tela.
- Uma foto na resolução máxima da câmera, se houver: 48 MP no iPhone Pro, 50 MP em muitos Android.
- Um vídeo curto da câmera (10 a 20 s), gravado com o celular em pé, com som.
- Um vídeo de 1 a 3 minutos, para medir o tempo de recodificar.

## 3. Checklist

Marque ✔ ou ✘ e anote o que estranhar.

**Converter** (`/imagens/converter`)

1. A página abre sem o aviso de navegador sem os recursos necessários.
2. "Selecionar imagens" abre o seletor do sistema. Escolha 1 foto da galeria. No iPhone, a foto HEIC chega como JPG e é aceita.
3. A prévia aparece. Converta para PNG e baixe. Anote onde o arquivo foi parar: no iPhone, app Arquivos › Transferências; no Android, pasta Download.
4. A foto tirada em pé continua em pé no resultado.
5. WEBP: no iPhone, a opção fica desativada com explicação. No Android, gera um `.webp`.
6. Converta a mesma foto para PDF e abra o arquivo baixado: ele abre no leitor do aparelho, com a foto inteira na página.
7. Selecione as 5 fotos de uma vez, converta e toque em "Baixar todas (.zip)". O ZIP abre no aparelho.
8. Só no endereço https: "Salvar na galeria" abre a folha de compartilhamento, e a imagem salva aparece na galeria.
9. Foto grande: anote o tempo até a prévia e o tempo da conversão. A página não pode recarregar sozinha nem travar. Toque em "Cancelar" no meio de uma conversão; depois, converta de novo.

**Comprimir** (`/imagens/comprimir`)

10. Foto da câmera no nível Média: o resultado fica menor, com o tamanho e a porcentagem na lista.
11. Print de tela (PNG): no Android, sai em WEBP menor. No iPhone, sai em JPG.
12. Comprima de novo um arquivo que já foi comprimido: aparece "Já estava otimizada: mantida a original".

**Redimensionar** (`/imagens/redimensionar`)

13. Foto da câmera a 50%: o tamanho final aparece antes de processar. O arquivo baixado tem metade da largura e da altura, e o nome termina com as medidas (ex.: `-2016x1512`).
14. A foto tirada em pé continua em pé, com a largura menor que a altura.
15. Em Pixels, com o cadeado fechado, preencha só a largura com 1080 e redimensione as 5 fotos de uma vez. Todas saem com 1080 px de largura, sem deformar. Uma foto que já seja mais estreita volta com o aviso "Já cabe no tamanho pedido".
16. Foto grande a 50%: anote o tempo. Se a conversão dessa foto falhou por falta de memória (item 9), veja se o redimensionamento funciona.

**Girar e espelhar** (`/imagens/girar`)

17. Toque em "Direita": a prévia gira na hora. Toque em "Ajustar" e baixe. A foto baixada aparece girada na galeria e em outros apps, com o mesmo nome.
18. Uma selfie espelhada: "Horizontal" desfaz o espelho, e o texto que aparecer na foto fica legível.
19. Selecione as 5 fotos, toque em "Esquerda" e ajuste todas de uma vez: todas saem giradas para o mesmo lado.

**Recortar** (`/imagens/recortar`)

20. Abra uma foto e arraste um canto com o dedo: a área muda e a página não rola junto. Arraste a área pelo meio para mudar de lugar.
21. Escolha 1:1, toque em "Recortar" e baixe: a foto sai quadrada, com o que estava dentro da área. Numa foto tirada em pé, as opções aparecem como 3:4 e 9:16.
22. Digite a largura e a altura nos campos: a área na foto acompanha. "Trocar imagem" abre outra foto e recomeça a área.

**Cortar trecho** (`/videos/cortar`)

23. "Selecionar vídeo" abre a galeria. Escolha o vídeo curto: o player mostra o vídeo, e a linha técnica traz formato, medidas, duração e tamanho. Anote se apareceu "só o corte rápido está disponível" (vídeo HEVC num navegador que não o recodifica).
24. Toque no player para ir a uns 3 s e em "Marcar início aqui"; vá a uns 8 s e toque em "Marcar fim aqui". "Ver como fica" toca só esse pedaço, e a linha azul abaixo do player mostra o que fica.
25. Modo Exato: corte e baixe. O vídeo baixado começa e termina nos pontos marcados, com som, e continua em pé na galeria. Anote o tempo.
26. Modo Rápido, com o mesmo trecho: termina quase na hora. Abra o arquivo na galeria e em outro app (WhatsApp, por exemplo) e anote se algum mostra segundos antes do início.
27. Vídeo longo, modo Exato: anote o tempo e toque em "Cancelar" no meio de uma segunda tentativa; a página volta às opções.
28. Em "Remover partes", marque uma parte do meio do vídeo curto (por exemplo, de 5 a 7 s) e outra perto do fim, com "Adicionar parte". "Ver como fica" pula as duas. Corte e baixe: o vídeo não mostra nada das partes removidas, o som acompanha a imagem depois de cada emenda e não há estalo forte. Anote o tempo.

**Recortar vídeo** (`/videos/recortar`)

29. Abra o vídeo curto: a área aparece sobre o vídeo. Arraste os cantos com o dedo; "Reproduzir" e a barra "Momento do vídeo" mostram outras partes do vídeo sob a área.
30. Escolha 9:16 (ou 16:9, se o vídeo estiver deitado), recorte e baixe: o vídeo sai com só a área escolhida, em pé, com som. Anote o tempo.

**Comprimir vídeo** (`/videos/comprimir`)

31. Abra o vídeo longo da câmera: aparecem a resolução final e o tamanho estimado de cada nível. Comprima no nível Média e baixe: anote o tamanho antes e depois, o tempo e se a qualidade continua boa na tela do celular.
32. No nível Forte, o vídeo sai em até 720p. Envie o resultado pelo WhatsApp e confira que ele abre e toca com som.

**Ver como ficou** (todas as ferramentas)

33. Depois de processar uma foto e um vídeo, a prévia mostra "Como ficou". Toque em "Original" para comparar e em "Ver como ficou" (no painel do resultado) para voltar. Num lote de fotos, o botão de olho de cada uma abre a comparação.

**Uso geral**

34. Os botões são fáceis de tocar, e a ação principal fica no rodapé, ao alcance do polegar. Com o celular em pé e deitado, nada fica cortado nem obriga a rolar para o lado. Em Pixels e no Recortar, os campos abrem o teclado numérico.
35. Opcional: com o VoiceOver ou o TalkBack ligado, o fim da conversão é anunciado ("Imagem convertida. Pronta para baixar."), cada toque em girar ou espelhar diz como a imagem ficou, e a área de recorte e os cantos têm nomes em português. No Cortar trecho, "Marcar início aqui" anuncia o tempo marcado.
36. Opcional, só no endereço https, instale o app. No iPhone, use Compartilhar › Adicionar à Tela de Início. No Android, use o menu › Instalar app. Aberto pelo ícone, o app aparece sem a barra do navegador e com o ícone certo.

**Extrair áudio** (`/videos/extrair-audio`; itens novos, no fim para não mudar a numeração acima)

37. Abra o vídeo curto da câmera: o formato já vem em M4A, com "Cópia exata do som do vídeo". Extraia: termina quase na hora. Toque no player de "Como ficou" e ouça o som. Baixe e abra o `.m4a` no app de música ou de arquivos do aparelho, e envie pelo WhatsApp.
38. Com o mesmo vídeo, toque em "Alterar opções", escolha MP3 e extraia. Anote o tempo com o vídeo longo. O `.mp3` baixado toca no aparelho.
39. Escolha um vídeo sem som (uma gravação de tela sem áudio, por exemplo): aparece "Este vídeo não tem som" e o botão fica desligado.

**Mudar resolução** (`/videos/resolucao`; itens novos, no fim para não mudar a numeração acima)

40. Abra o vídeo curto da câmera, gravado em pé: as resoluções iguais ou maiores que a do vídeo aparecem desligadas, com a explicação de que só dá para diminuir. Escolha 720p, mude e baixe: o vídeo continua em pé, sem esticar, com som, e a galeria mostra 720 de largura. Anote o tempo.
41. Com o vídeo longo, escolha 480p: anote o tempo e o tamanho antes e depois.

**Converter vídeo** (`/videos/converter`; itens novos, no fim para não mudar a numeração acima)

42. No iPhone, abra o vídeo curto da câmera (MOV): MP4 já vem marcado e aparece "Vídeo HEVC (do iPhone)" com "Compatível" e "Rápido". Em "Compatível", converta, anote o tempo e baixe: o `.mp4` toca no iPhone, em pé e com som. Se puder, abra também num computador com Windows.
43. Com o mesmo vídeo, escolha "Rápido": termina quase na hora. O `.mp4` toca no iPhone. Anote se ele toca num computador com Windows ou num Android (pode não tocar: é o aviso da opção).
44. No Android, abra o vídeo curto da câmera (MP4): MOV já vem marcado e diz "Só troca o formato do arquivo". Converta: termina quase na hora. Depois escolha WEBM, converta e anote o tempo com o vídeo longo. O `.webm` toca no aparelho, em pé e com som.

## 4. Comportamentos já conhecidos

Confirme se acontecem; não precisam ser tratados como erro.

- O Safari não gera WEBP. Por isso, no iPhone, a conversão para WEBP fica indisponível, a compressão de PNG sai em JPG e um WEBP redimensionado, girado ou recortado sai em JPG (ou em PNG, se tiver transparência).
- Um PNG que declara canal de transparência não é comprimido no Safari, mesmo que todos os pixels sejam opacos. O app lê a declaração do arquivo e não confere pixel a pixel. **Avise se isso acontecer com prints de tela comuns** (item 11): dá para melhorar.
- O limite é de 50 milhões de pixels. Fotos "50 MP" de alguns Android têm 8160 × 6144 (50,1 milhões) e são recusadas com explicação. **Anote se acontecer** (item 9): o limite pode ser revisto.
- BMP e TIFF não têm compressão: uma foto de 12 MP vira um arquivo de uns 35 MB. É do formato.
- Converter, comprimir, redimensionar, girar, espelhar e recortar removem metadados, como localização e data. A exceção é quando a original é mantida. Os vídeos cortados e recortados também saem sem metadados.
- Vídeo recortado ou cortado no modo Exato sai em H.264 (MP4 e MOV) ou VP9 (WEBM), recodificado em alta qualidade: pode ficar maior que o original.
- O corte rápido guarda escondidos alguns segundos antes do início (até o quadro-chave anterior). A maioria dos players começa no ponto escolhido; alguns aplicativos e editores mostram esses segundos.
- Comprimir mostra um tamanho estimado: o real pode ficar um pouco acima ou abaixo. Se não ficar menor que o original, o app entrega o original.
- O limite é de 1 GB por vídeo. Num celular com pouca memória, vídeos bem menores que isso podem falhar com a mensagem de memória. **Anote o tamanho e a duração se acontecer.**
- Extrair áudio: o M4A copiado é instantâneo; o MP3 é refeito e leva mais tempo (no computador, cerca de 10 s para cada 3 minutos de som). O som de vídeos WEBM sai em WEBM, que iPhones mais antigos podem não tocar: para eles, existem M4A e MP3.
- Converter vídeo: entre MP4 e MOV, um vídeo H.264 só é copiado (instantâneo). Para WEBM, ou de WEBM para MP4 e MOV, o vídeo é refeito e demora em vídeos longos. Um vídeo pequeno e já bem comprimido pode sair um pouco maior ao ser refeito. No Firefox, MP4 e MOV ficam indisponíveis quando o som precisa ser refeito (o Firefox não gera AAC).

## 5. Resultado

Copie, preencha e mande:

```
Aparelho e sistema: (ex.: iPhone 13, iOS 18.2)
Navegador e versão: (ex.: Safari; Chrome 131)
Acesso: Vercel (https) ou rede local (http)
Itens com problema: (número do item + o que aconteceu)
Foto grande: resolução ___ · ___ s até a prévia · ___ s para converter · ___ s para redimensionar a 50%
Vídeo: duração ___ · tamanho ___ · formato (HEVC/H.264) ___ · ___ s no corte exato · ___ s no corte rápido · ___ s para recortar · comprimir (Média): ___ MB → ___ MB em ___ s
Extrair áudio (vídeo longo): ___ s em M4A · ___ s em MP3
Mudar resolução (vídeo longo, 480p): ___ s · ___ MB → ___ MB
Converter vídeo (vídeo longo): ___ s em Compatível (iPhone) · ___ s para WEBM · ___ MB → ___ MB
Prints ou gravação de tela dos problemas
```
