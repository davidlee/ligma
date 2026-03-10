import { readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ensureDirectory, writeBinaryFile, writeJsonFile } from '../../src/util/fs.js'

let testDirectory: string

beforeEach(() => {
  testDirectory = join(tmpdir(), `figma-fetch-test-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`)
})

afterEach(async () => {
  await rm(testDirectory, { recursive: true, force: true })
})

describe('ensureDirectory', () => {
  it('creates a nested directory', async () => {
    const nested = join(testDirectory, 'a', 'b', 'c')
    await ensureDirectory(nested)
    // writeFile would fail if dir doesn't exist
    const probe = join(nested, 'probe.txt')
    await writeJsonFile(probe, { ok: true })
    const content = await readFile(probe, 'utf-8')
    expect(content).toContain('"ok": true')
  })

  it('does not throw if directory already exists', async () => {
    await ensureDirectory(testDirectory)
    await expect(ensureDirectory(testDirectory)).resolves.toBeUndefined()
  })
})

describe('writeJsonFile', () => {
  it('writes pretty-printed JSON with trailing newline', async () => {
    await ensureDirectory(testDirectory)
    const filePath = join(testDirectory, 'data.json')
    await writeJsonFile(filePath, { name: 'test', value: 42 })

    const content = await readFile(filePath, 'utf-8')
    expect(content).toBe('{\n  "name": "test",\n  "value": 42\n}\n')
  })

  it('writes valid JSON that can be parsed back', async () => {
    await ensureDirectory(testDirectory)
    const filePath = join(testDirectory, 'roundtrip.json')
    const original = { items: [1, 2, 3], nested: { key: 'value' } }
    await writeJsonFile(filePath, original)

    const content = await readFile(filePath, 'utf-8')
    expect(JSON.parse(content)).toEqual(original)
  })
})

describe('writeBinaryFile', () => {
  it('round-trips binary data', async () => {
    await ensureDirectory(testDirectory)
    const filePath = join(testDirectory, 'image.png')
    const original = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    await writeBinaryFile(filePath, original)

    const readBack = await readFile(filePath)
    expect(Buffer.compare(readBack, original)).toBe(0)
  })
})
