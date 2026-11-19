# Roteiro de teste em aparelhos reais

Os testes automáticos rodam no Chromium, no Firefox e no WebKit do Windows, com o celular **simulado**. Ficam de fora o Safari de verdade, o seletor de fotos, a galeria, a memória de um celular e o toque real. Este roteiro cobre esses pontos em cerca de 35 minutos por aparelho. Faça em pelo menos um iPhone (Safari) e um Android (Chrome).

## 1. Abrir o site no celular

**A. Prévia na Vercel (recomendado).** O endereço é https, e só assim funcionam o botão "Salvar na galeria" e a instalação como app. Exige publicar a branch: um push para o GitHub ligado à Vercel ou `npx vercel` na pasta do projeto.

**B. Rede local, sem publicar.** No computador, rode `npm run build` e depois `npm run preview -- --host`. O terminal mostra `Network: http://192.168.x.x:4173`. Abra esse endereço no celular conectado ao mesmo Wi-Fi. Se o Windows perguntar, permita o Node na rede privada.
Limite: por ser http, "Salvar na galeria" não aparece e o app não pode ser instalado. O resto funciona.

## 2. Separe na galeria

- 5 fotos da câmera, uma delas tirada com o celular em pé.
- Um print de tela.
- Uma foto na resolução máxima da câmera, se houver: 48 MP no iPhone Pro, 50 MP em muitos Android.

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

**Uso geral**

23. Os botões são fáceis de tocar, e a ação principal fica no rodapé, ao alcance do polegar. Com o celular em pé e deitado, nada fica cortado nem obriga a rolar para o lado. Em Pixels e no Recortar, os campos abrem o teclado numérico.
24. Opcional: com o VoiceOver ou o TalkBack ligado, o fim da conversão é anunciado ("Imagem convertida. Pronta para baixar."), cada toque em girar ou espelhar diz como a imagem ficou, e a área de recorte e os cantos têm nomes em português.
25. Opcional, só no endereço https, instale o app. No iPhone, use Compartilhar › Adicionar à Tela de Início. No Android, use o menu › Instalar app. Aberto pelo ícone, o app aparece sem a barra do navegador e com o ícone certo.

## 4. Comportamentos já conhecidos

Confirme se acontecem; não precisam ser tratados como erro.

- O Safari não gera WEBP. Por isso, no iPhone, a conversão para WEBP fica indisponível, a compressão de PNG sai em JPG e um WEBP redimensionado, girado ou recortado sai em JPG (ou em PNG, se tiver transparência).
- Um PNG que declara canal de transparência não é comprimido no Safari, mesmo que todos os pixels sejam opacos. O app lê a declaração do arquivo e não confere pixel a pixel. **Avise se isso acontecer com prints de tela comuns** (item 11): dá para melhorar.
- O limite é de 50 milhões de pixels. Fotos "50 MP" de alguns Android têm 8160 × 6144 (50,1 milhões) e são recusadas com explicação. **Anote se acontecer** (item 9): o limite pode ser revisto.
- BMP e TIFF não têm compressão: uma foto de 12 MP vira um arquivo de uns 35 MB. É do formato.
- Converter, comprimir, redimensionar, girar, espelhar e recortar removem metadados, como localização e data. A exceção é quando a original é mantida.

## 5. Resultado

Copie, preencha e mande:

```
Aparelho e sistema: (ex.: iPhone 13, iOS 18.2)
Navegador e versão: (ex.: Safari; Chrome 131)
Acesso: Vercel (https) ou rede local (http)
Itens com problema: (número do item + o que aconteceu)
Foto grande: resolução ___ · ___ s até a prévia · ___ s para converter · ___ s para redimensionar a 50%
Prints ou gravação de tela dos problemas
```
