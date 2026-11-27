/**
 * Service worker do Media Tools: guarda no aparelho os arquivos do próprio site (nunca os da pessoa),
 * para o app abrir e funcionar sem internet. Não há aviso na interface: é só infraestrutura.
 *
 * Arquivo autossuficiente (sem import): o build (scripts/service-worker-build.ts) só tira os tipos,
 * troca `__SW_MANIFEST__` pela lista de arquivos do build e grava `sw.js` na raiz do site.
 *
 * Ciclo de vida:
 * - install: guarda todos os arquivos do build num cache com o nome da versão. Os de `/assets/` têm o
 *   hash no nome e nunca mudam: se já estiverem num cache anterior, são copiados de lá, sem baixar.
 * - activate: assume já (sem esperar fechar as abas). Mantém o cache da versão anterior, porque uma aba
 *   aberta com o código antigo ainda pode pedir pedaços dele (ferramentas carregadas sob demanda), que
 *   já não existem no servidor depois do deploy; os mais antigos são apagados.
 * - fetch: páginas abrem pelo index.html guardado (o app é de página única); arquivos vêm do cache e,
 *   se não estiverem lá, da rede. A versão nova vale a partir da próxima vez que o app abrir.
 */

declare const self: ServiceWorkerGlobalScope
declare const __SW_MANIFEST__: { version: string; urls: string[] }

const MANIFEST = __SW_MANIFEST__
const PREFIX = 'media-tools-'
const CACHE = `${PREFIX}${MANIFEST.version}`
/** Fora do prefixo das versões: guarda qual versão estava ativa, para saber qual é a anterior. */
const META_CACHE = 'media-tools:meta'
const ACTIVE_KEY = '/__sw/active-cache'
/** Página que o servidor entrega em qualquer rota do app. */
const SHELL = '/'
/** O servidor pode variar a resposta por cabeçalho (ex.: Origin nas fontes); o arquivo é o mesmo. */
const MATCH: CacheQueryOptions = { ignoreVary: true }

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await Promise.all(MANIFEST.urls.map((url) => store(cache, url)))
      await self.skipWaiting()
    })(),
  )
})

async function store(cache: Cache, url: string): Promise<void> {
  if (await cache.match(url, MATCH)) return
  const reused = url.startsWith('/assets/') ? await caches.match(url, MATCH) : undefined
  // Direto do servidor, sem o cache HTTP: um index.html guardado por ele poderia ser o da versão anterior,
  // e nem "revalidar" basta (um servidor que compara só a data, em segundos, responde "não mudou").
  const response = reused ?? (await fetch(url, { cache: 'reload' }))
  // Falhar a instalação é seguro: a versão anterior continua valendo e o navegador tenta de novo depois.
  if (!response.ok || response.redirected) throw new Error(`Não foi possível guardar ${url} (${response.status}).`)
  await cache.put(url, response)
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const meta = await caches.open(META_CACHE)
      const previous = await (await meta.match(ACTIVE_KEY))?.text()
      const keep = new Set([CACHE, previous])
      const names = await caches.keys()
      await Promise.all(names.filter((name) => name.startsWith(PREFIX) && !keep.has(name)).map((name) => caches.delete(name)))
      await meta.put(ACTIVE_KEY, new Response(CACHE))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  event.respondWith(request.mode === 'navigate' ? page(request, url) : file(request))
})

/** Arquivo do site aberto direto (ex.: a licença em texto) ou, para as rotas do app, o index.html. */
async function page(request: Request, url: URL): Promise<Response> {
  const cache = await caches.open(CACHE)
  const cached = (await cache.match(url.pathname, MATCH)) ?? (await cache.match(SHELL, MATCH))
  return cached ?? fetch(request)
}

/** Primeiro a versão atual; depois a anterior (abas com o código antigo); por último, a rede. */
async function file(request: Request): Promise<Response> {
  const current = await (await caches.open(CACHE)).match(request, MATCH)
  return current ?? (await caches.match(request, MATCH)) ?? fetch(request)
}
