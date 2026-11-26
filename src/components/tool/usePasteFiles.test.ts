import { describe, expect, it } from 'vitest'
import { pasteShortcut } from './usePasteFiles'

describe('pasteShortcut', () => {
  it('⌘V no Mac e no iPhone; Ctrl+V nos demais', () => {
    expect(pasteShortcut('MacIntel', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('⌘V')
    expect(pasteShortcut('iPhone', 'Mozilla/5.0 (iPhone)')).toBe('⌘V')
    expect(pasteShortcut('Win32', 'Mozilla/5.0 (Windows NT 10.0)')).toBe('Ctrl+V')
    expect(pasteShortcut('Linux armv8l', 'Mozilla/5.0 (Linux; Android 15)')).toBe('Ctrl+V')
  })
})
