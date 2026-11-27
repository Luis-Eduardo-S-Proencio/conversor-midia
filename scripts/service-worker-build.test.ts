import { describe, expect, it } from 'vitest'
import { injectManifest, precacheManifest, type PrecacheFile } from './service-worker-build.ts'

const build: PrecacheFile[] = [
  { path: 'index.html', content: '<!doctype html>' },
  { path: 'assets/index-abc123.js', content: 'console.log(1)' },
  { path: 'icons/icon-192.png', content: new Uint8Array([1, 2, 3]) },
  { path: 'sw.js', content: 'service worker' },
  { path: 'assets/index-abc123.js.map', content: '{}' },
  { path: '.vite/manifest.json', content: '{}' },
]

describe('precacheManifest', () => {
  it('guarda os arquivos do build, com o index.html no endereço "/" e sem o próprio service worker', () => {
    expect(precacheManifest(build, 'código').urls).toEqual(['/', '/assets/index-abc123.js', '/icons/icon-192.png'])
  })

  it('a versão não depende da ordem em que os arquivos foram listados', () => {
    expect(precacheManifest([...build].reverse(), 'código').version).toBe(precacheManifest(build, 'código').version)
  })

  it('a versão muda quando um arquivo guardado muda, e não quando muda o que fica fora do cache', () => {
    const { version } = precacheManifest(build, 'código')
    const changedIndex = build.map((file) => (file.path === 'index.html' ? { ...file, content: '<!doctype html><p>' } : file))
    const changedMap = build.map((file) => (file.path.endsWith('.map') ? { ...file, content: '{"x":1}' } : file))
    expect(precacheManifest(changedIndex, 'código').version).not.toBe(version)
    expect(precacheManifest(changedMap, 'código').version).toBe(version)
  })

  it('a versão muda quando o código do service worker muda', () => {
    expect(precacheManifest(build, 'outro código').version).not.toBe(precacheManifest(build, 'código').version)
  })
})

describe('injectManifest', () => {
  it('troca o marcador pela lista e pela versão', () => {
    const manifest = { version: 'v1', urls: ['/', '/a.js'] }
    expect(injectManifest('const MANIFEST = __SW_MANIFEST__;', manifest)).toBe(
      'const MANIFEST = {"version":"v1","urls":["/","/a.js"]};',
    )
  })

  it('recusa código sem o marcador ou com mais de um', () => {
    const manifest = { version: 'v1', urls: [] }
    expect(() => injectManifest('const MANIFEST = {};', manifest)).toThrow()
    expect(() => injectManifest('__SW_MANIFEST__ __SW_MANIFEST__', manifest)).toThrow()
  })
})
