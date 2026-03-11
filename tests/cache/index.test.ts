import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createNoopCache,
  fetchImageCached,
  fetchNodeCached,
} from '../../src/cache/index.js'
import { createAuth } from '../../src/figma/auth.js'
import { createClient } from '../../src/figma/client.js'

import type { ImageCacheKey, NodeCacheKey } from '../../src/cache/types.js'
import type { FigmaClient } from '../../src/figma/client.js'
import type { FigmaFileResponse } from '../../src/figma/types-raw.js'

const MOCK_FILE_RESPONSE: FigmaFileResponse = {
  name: 'Test File',
  lastModified: '2026-03-11T00:00:00Z',
  version: '456',
  document: {
    id: '1:2',
    name: 'TestNode',
    type: 'FRAME',
    children: [],
  },
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function validNodesResponse(nodeId: string): Record<string, unknown> {
  return {
    name: 'Test File',
    lastModified: '2026-03-11T00:00:00Z',
    version: '456',
    nodes: {
      [nodeId]: {
        document: {
          id: nodeId,
          name: 'TestNode',
          type: 'FRAME',
          children: [],
        },
      },
    },
  }
}

/**
 * Simple in-memory cache for testing. Tracks call counts via counters
 * rather than vi.fn to avoid unbound-method lint issues.
 */
function makeTestCache(): {
  nodeStore: Map<string, FigmaFileResponse>
  imageStore: Map<string, Uint8Array>
  setNodeCalls: number
  setImageCalls: number
  getNode(key: NodeCacheKey): Promise<FigmaFileResponse | null>
  setNode(key: NodeCacheKey, value: FigmaFileResponse): Promise<void>
  getImage(key: ImageCacheKey): Promise<Uint8Array | null>
  setImage(key: ImageCacheKey, value: Uint8Array, sourceUrl?: string): Promise<void>
  invalidateFile(fileKey: string): Promise<void>
  clear(): Promise<void>
} {
  const nodeStore = new Map<string, FigmaFileResponse>()
  const imageStore = new Map<string, Uint8Array>()
  const counters = { setNodeCalls: 0, setImageCalls: 0 }

  return {
    nodeStore,
    imageStore,
    get setNodeCalls(): number { return counters.setNodeCalls },
    get setImageCalls(): number { return counters.setImageCalls },
    getNode(key: NodeCacheKey): Promise<FigmaFileResponse | null> {
      return Promise.resolve(nodeStore.get(JSON.stringify(key)) ?? null)
    },
    setNode(key: NodeCacheKey, value: FigmaFileResponse): Promise<void> {
      counters.setNodeCalls += 1
      nodeStore.set(JSON.stringify(key), value)
      return Promise.resolve()
    },
    getImage(key: ImageCacheKey): Promise<Uint8Array | null> {
      return Promise.resolve(imageStore.get(JSON.stringify(key)) ?? null)
    },
    setImage(key: ImageCacheKey, value: Uint8Array): Promise<void> {
      counters.setImageCalls += 1
      imageStore.set(JSON.stringify(key), value)
      return Promise.resolve()
    },
    invalidateFile(): Promise<void> { return Promise.resolve() },
    clear(): Promise<void> {
      nodeStore.clear()
      imageStore.clear()
      return Promise.resolve()
    },
  }
}

describe('createNoopCache', () => {
  it('always returns null for getNode', async () => {
    const cache = createNoopCache()
    const key: NodeCacheKey = {
      fileKey: 'abc', nodeId: '1:2', depth: 2,
      geometry: false, pluginData: 'none', version: null,
    }
    expect(await cache.getNode(key)).toBeNull()
  })

  it('always returns null for getImage', async () => {
    const cache = createNoopCache()
    const key: ImageCacheKey = {
      fileKey: 'abc', nodeId: '1:2', format: 'png', scale: 2, version: null,
    }
    expect(await cache.getImage(key)).toBeNull()
  })

  it('setNode is a no-op — subsequent get still returns null', async () => {
    const cache = createNoopCache()
    const key: NodeCacheKey = {
      fileKey: 'abc', nodeId: '1:2', depth: 2,
      geometry: false, pluginData: 'none', version: null,
    }
    await cache.setNode(key, MOCK_FILE_RESPONSE)
    expect(await cache.getNode(key)).toBeNull()
  })
})

describe('fetchNodeCached', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof globalThis.fetch>>
  let client: FigmaClient

  beforeEach(() => {
    fetchMock = vi.fn<typeof globalThis.fetch>()
    vi.stubGlobal('fetch', fetchMock)
    client = createClient({ auth: createAuth('test-token') })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches from API on cache miss and caches result', async () => {
    const cache = makeTestCache()
    fetchMock.mockResolvedValueOnce(jsonResponse(validNodesResponse('1:2')))

    const result = await fetchNodeCached(client, cache, 'abc', '1:2', {
      depth: 2,
      version: null,
    })

    expect(result.fromCache).toBe(false)
    expect(result.response.document.id).toBe('1:2')
    expect(cache.setNodeCalls).toBe(1)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('returns cached result on cache hit without calling API', async () => {
    const cache = makeTestCache()
    fetchMock.mockResolvedValue(jsonResponse(validNodesResponse('1:2')))

    await fetchNodeCached(client, cache, 'abc', '1:2', { depth: 2, version: null })
    const result = await fetchNodeCached(client, cache, 'abc', '1:2', { depth: 2, version: null })

    expect(result.fromCache).toBe(true)
    expect(result.response.document.id).toBe('1:2')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('different version produces cache miss', async () => {
    const cache = makeTestCache()
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(validNodesResponse('1:2'))))

    await fetchNodeCached(client, cache, 'abc', '1:2', { depth: 2, version: null })
    const result = await fetchNodeCached(client, cache, 'abc', '1:2', { depth: 2, version: '789' })

    expect(result.fromCache).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('different geometry produces cache miss', async () => {
    const cache = makeTestCache()
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(validNodesResponse('1:2'))))

    await fetchNodeCached(client, cache, 'abc', '1:2', { depth: 2, version: null })
    const result = await fetchNodeCached(client, cache, 'abc', '1:2', { depth: 2, geometry: true, version: null })

    expect(result.fromCache).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('works with noopCache — always misses', async () => {
    const cache = createNoopCache()
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(validNodesResponse('1:2'))))

    const first = await fetchNodeCached(client, cache, 'abc', '1:2', { depth: 2, version: null })
    const second = await fetchNodeCached(client, cache, 'abc', '1:2', { depth: 2, version: null })

    expect(first.fromCache).toBe(false)
    expect(second.fromCache).toBe(false)
  })
})

describe('fetchImageCached', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof globalThis.fetch>>
  let client: FigmaClient

  beforeEach(() => {
    fetchMock = vi.fn<typeof globalThis.fetch>()
    vi.stubGlobal('fetch', fetchMock)
    client = createClient({ auth: createAuth('test-token') })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns cached image on hit without calling API', async () => {
    const cache = makeTestCache()
    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

    const key: ImageCacheKey = {
      fileKey: 'abc', nodeId: '1:2', format: 'png', scale: 2, version: null,
    }
    cache.imageStore.set(JSON.stringify(key), imageData)

    const result = await fetchImageCached(client, cache, 'abc', '1:2', {
      format: 'png', scale: 2, version: null,
    })

    expect(result.fromCache).toBe(true)
    expect(result.result.format).toBe('png')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches from API on cache miss and caches result', async () => {
    const cache = makeTestCache()
    const imageUrl = 'https://figma-images.example.com/image.png'

    // First call: images endpoint returns URL
    fetchMock.mockResolvedValueOnce(jsonResponse({ images: { '1:2': imageUrl } }))
    // Second call: download binary from returned URL
    fetchMock.mockResolvedValueOnce(new Response(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      { status: 200 },
    ))

    const result = await fetchImageCached(client, cache, 'abc', '1:2', {
      format: 'png', scale: 2, version: null,
    })

    expect(result.fromCache).toBe(false)
    expect(result.result.format).toBe('png')
    expect(cache.setImageCalls).toBe(1)
  })
})
