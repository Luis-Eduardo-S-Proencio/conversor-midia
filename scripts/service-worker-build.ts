import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformWithOxc, type Plugin } from 'vite'

/** Na raiz do site: o escopo do service worker é a pasta dele, e ele precisa cobrir o app inteiro. */
export const SW_FILE = 'sw.js'
/** Identificador em `src/service-worker/sw.ts` trocado pela lista de arquivos e pela versão. */
const PLACEHOLDER = '__SW_MANIFEST__'

export interface PrecacheFile {
  /** Caminho dentro da pasta do build, separado por "/". */
  path: string
  content: Uint8Array | string
}

export interface PrecacheManifest {
  /** Muda quando qualquer arquivo guardado (ou o próprio service worker) muda: vira o nome do cache. */
  version: string
  urls: string[]
}

/** Fora do cache: o próprio service worker, mapas de código e arquivos internos de ferramentas (ex.: `.vite/`). */
function isPrecached(path: string): boolean {
  return path !== SW_FILE && !path.endsWith('.map') && !path.split('/').some((part) => part.startsWith('.'))
}

/**
 * O que o service worker guarda: todos os arquivos do build, com o index.html no endereço "/", que é
 * como o servidor o entrega (em qualquer rota do app). A versão é um hash dos endereços e dos conteúdos.
 */
export function precacheManifest(files: readonly PrecacheFile[], workerCode: string): PrecacheManifest {
  const entries = files
    .filter((file) => isPrecached(file.path))
    .map((file) => ({ url: file.path === 'index.html' ? '/' : `/${file.path}`, content: file.content }))
    .sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0))
  const hash = createHash('sha256').update(workerCode)
  for (const { url, content } of entries) hash.update('\0').update(url).update('\0').update(content)
  return { version: hash.digest('hex').slice(0, 16), urls: entries.map((entry) => entry.url) }
}

export function injectManifest(workerCode: string, manifest: PrecacheManifest): string {
  const parts = workerCode.split(PLACEHOLDER)
  if (parts.length !== 2) throw new Error(`O service worker deve citar ${PLACEHOLDER} exatamente uma vez.`)
  return parts.join(JSON.stringify(manifest))
}

async function listFiles(dir: string): Promise<PrecacheFile[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  return Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const full = join(entry.parentPath, entry.name)
        return { path: relative(dir, full).split(sep).join('/'), content: await readFile(full) }
      }),
  )
}

/**
 * Grava `sw.js` depois do build, quando a pasta final já tem tudo (inclusive o que vem de `public/`):
 * tira os tipos do service worker e põe nele a lista do que guardar. Sem bundler: o arquivo de origem
 * não importa nada, e um service worker comum (não módulo) funciona em todos os navegadores suportados.
 */
export function serviceWorker(source: URL): Plugin {
  let outDir = ''
  return {
    name: 'media-tools:service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    writeBundle: {
      order: 'post',
      sequential: true,
      async handler() {
        const sourcePath = fileURLToPath(source)
        // Erro de sintaxe já é lançado aqui, interrompendo o build.
        const { code } = await transformWithOxc(await readFile(sourcePath, 'utf8'), sourcePath)
        if (/^\s*(import|export)\b/m.test(code)) throw new Error('O service worker não pode ter import nem export.')
        const manifest = precacheManifest(await listFiles(outDir), code)
        await writeFile(join(outDir, SW_FILE), injectManifest(code, manifest))
      },
    },
  }
}
