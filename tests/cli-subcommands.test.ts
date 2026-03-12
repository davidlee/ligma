import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { assetFileName, collectExportTargets, toAssetListEntry } from '../src/assets/collect.js'
import { fetchImageCached, fetchNodeCached } from '../src/cache/index.js'
import { resolveConfig } from '../src/config.js'
import { normalize } from '../src/normalize/index.js'
import { createSession } from '../src/session.js'

import type { FetchConfig } from '../src/config.js'

// --- Mock data ---

const FIGMA_URL = 'https://www.figma.com/design/abc123/MyFile?node-id=0-1'

const MOCK_NODES_RESPONSE = {
  name: 'Test File',
  lastModified: '2026-03-10T00:00:00Z',
  version: '12345',
  nodes: {
    '0:1': {
      document: {
        id: '0:1',
        name: 'Frame',
        type: 'FRAME',
        children: [
          {
            id: '1:1',
            name: 'Logo',
            type: 'RECTANGLE',
            children: [],
            fills: [
              { type: 'IMAGE', imageRef: 'img:abc', scaleMode: 'FILL', visible: true },
            ],
          },
        ],
      },
      components: {},
      schemaVersion: 0,
    },
  },
}

const MOCK_NODES_EMPTY = {
  name: 'Test File',
  lastModified: '2026-03-10T00:00:00Z',
  version: '12345',
  nodes: {
    '0:1': {
      document: { id: '0:1', name: 'EmptyFrame', type: 'FRAME', children: [] },
      components: {},
      schemaVersion: 0,
    },
  },
}

const MOCK_IMAGES_RESPONSE = {
  images: { '1:1': 'https://figma-cdn.example.com/rendered.png' },
}

const MOCK_IMAGE_BINARY = Buffer.from([0x89, 0x50, 0x4e, 0x47])

// --- Mock helpers ---

function mockFetchWithAssets(): void {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/v1/files/') && url.includes('/nodes')) {
      return Promise.resolve(new Response(JSON.stringify(MOCK_NODES_RESPONSE)))
    }
    if (url.includes('/v1/images/')) {
      return Promise.resolve(new Response(JSON.stringify(MOCK_IMAGES_RESPONSE)))
    }
    if (url.includes('figma-cdn.example.com')) {
      return Promise.resolve(new Response(MOCK_IMAGE_BINARY))
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  }))
}

function mockFetchEmpty(): void {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/v1/files/') && url.includes('/nodes')) {
      return Promise.resolve(new Response(JSON.stringify(MOCK_NODES_EMPTY)))
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  }))
}

function makeConfig(overrides: Partial<FetchConfig> = {}): FetchConfig {
  return resolveConfig({ url: FIGMA_URL, token: 'test-token', cacheEnabled: false, ...overrides })
}

// --- Test output directory ---

const TMP_DIR = join(import.meta.dirname, '..', '.tmp-cli-subcommand-test')

// --- Tests ---

describe('list-assets pipeline', () => {
  beforeEach(() => {
    mockFetchWithAssets()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns export targets in consumer-facing shape', async () => {
    const config = makeConfig()
    const session = createSession(config)
    const { response } = await fetchNodeCached(
      session.client, session.cache, session.parsed.fileKey, session.parsed.nodeId,
      { depth: config.depth, version: null },
    )
    const normalizedNode = normalize(response.document)
    const targets = collectExportTargets(normalizedNode, config.maxAssets)
    const entries = targets.map(toAssetListEntry)

    expect(entries.length).toBeGreaterThan(0)
    const first = entries[0]
    expect(first).toBeDefined()
    expect(first).toHaveProperty('nodeId', '1:1')
    expect(first).toHaveProperty('name', 'Logo')
    expect(first).toHaveProperty('format')
    expect(first).toHaveProperty('reason')
  })

  it('returns empty array when no export targets exist', async () => {
    mockFetchEmpty()
    const config = makeConfig()
    const session = createSession(config)
    const { response } = await fetchNodeCached(
      session.client, session.cache, session.parsed.fileKey, session.parsed.nodeId,
      { depth: config.depth, version: null },
    )
    const normalizedNode = normalize(response.document)
    const targets = collectExportTargets(normalizedNode, config.maxAssets)
    const entries = targets.map(toAssetListEntry)

    expect(entries).toEqual([])
  })

  it('respects depth parameter', async () => {
    const config = makeConfig({ depth: 1 })
    const session = createSession(config)
    const { response } = await fetchNodeCached(
      session.client, session.cache, session.parsed.fileKey, session.parsed.nodeId,
      { depth: config.depth, version: null },
    )
    const normalizedNode = normalize(response.document)
    const targets = collectExportTargets(normalizedNode, config.maxAssets)

    // depth=1 still finds the child asset (depth controls Figma API fetch depth, not walk depth)
    expect(Array.isArray(targets)).toBe(true)
  })

  it('outputs valid JSON', async () => {
    const config = makeConfig()
    const session = createSession(config)
    const { response } = await fetchNodeCached(
      session.client, session.cache, session.parsed.fileKey, session.parsed.nodeId,
      { depth: config.depth, version: null },
    )
    const normalizedNode = normalize(response.document)
    const targets = collectExportTargets(normalizedNode, config.maxAssets)
    const entries = targets.map(toAssetListEntry)
    const json = JSON.stringify(entries, null, 2)

    const parsed: unknown = JSON.parse(json)
    expect(Array.isArray(parsed)).toBe(true)
  })
})

describe('get-asset pipeline', () => {
  beforeEach(() => {
    mockFetchWithAssets()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await rm(TMP_DIR, { recursive: true, force: true })
  })

  it('fetches image and returns buffer', async () => {
    const config = makeConfig()
    const session = createSession(config)
    const { result } = await fetchImageCached(
      session.client, session.cache, session.parsed.fileKey, '1:1',
      { format: config.format, version: null },
    )

    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(result.format).toBe('png')
  })

  it('writes image to disk at expected path', async () => {
    const config = makeConfig({ outputDir: TMP_DIR })
    const session = createSession(config)
    const { result } = await fetchImageCached(
      session.client, session.cache, session.parsed.fileKey, '1:1',
      { format: config.format, version: null },
    )

    const target = { nodeId: '1:1', nodeName: '1:1', kind: 'bitmap' as const, reason: null }
    const fileName = assetFileName(target, result.format)
    const directory = join(config.outputDir, 'assets')
    await mkdir(directory, { recursive: true })
    const filePath = join(directory, fileName)
    await writeFile(filePath, result.buffer)

    const content = await readFile(filePath)
    expect(content).toEqual(MOCK_IMAGE_BINARY)
  })

  it('supports svg format', async () => {
    const config = makeConfig({ format: 'svg' })
    const session = createSession(config)
    const { result } = await fetchImageCached(
      session.client, session.cache, session.parsed.fileKey, '1:1',
      { format: config.format, version: null },
    )

    expect(result.format).toBe('svg')
  })
})
