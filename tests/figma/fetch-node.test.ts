import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FigmaError, FigmaNotFoundError } from '../../src/errors.js'
import { createAuth } from '../../src/figma/auth.js'
import { createClient } from '../../src/figma/client.js'
import { fetchNode } from '../../src/figma/fetch-node.js'

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function getCalledUrl(mock: ReturnType<typeof vi.fn>): URL {
  const call = mock.mock.calls[0]
  expect(call).toBeDefined()
  return new URL(String(call?.[0]))
}

const validNodesResponse = {
  nodes: {
    '1:2': {
      document: {
        id: '1:2',
        name: 'Frame',
        type: 'FRAME',
        children: [],
      },
      components: {},
      schemaVersion: 14,
    },
  },
  name: 'Test File',
  lastModified: '2026-01-01T00:00:00Z',
  version: '123',
}

describe('fetchNode', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof globalThis.fetch>>

  beforeEach(() => {
    fetchMock = vi.fn<typeof globalThis.fetch>()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and returns validated file response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(validNodesResponse))
    const client = createClient({ auth: createAuth('tok') })

    const result = await fetchNode(client, 'abc123', '1:2')

    expect(result.name).toBe('Test File')
    expect(result.version).toBe('123')
    expect(result.document.id).toBe('1:2')
    expect(result.document.type).toBe('FRAME')
  })

  it('passes correct URL with default options', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(validNodesResponse))
    const client = createClient({ auth: createAuth('tok') })

    await fetchNode(client, 'abc123', '1:2')

    const calledUrl = getCalledUrl(fetchMock)
    expect(calledUrl.pathname).toBe('/v1/files/abc123/nodes')
    expect(calledUrl.searchParams.get('ids')).toBe('1:2')
    expect(calledUrl.searchParams.get('depth')).toBe('2')
  })

  it('passes custom depth option', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(validNodesResponse))
    const client = createClient({ auth: createAuth('tok') })

    await fetchNode(client, 'abc123', '1:2', { depth: 5 })

    const calledUrl = getCalledUrl(fetchMock)
    expect(calledUrl.searchParams.get('depth')).toBe('5')
  })

  it('passes geometry option', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(validNodesResponse))
    const client = createClient({ auth: createAuth('tok') })

    await fetchNode(client, 'abc123', '1:2', { geometry: true })

    const calledUrl = getCalledUrl(fetchMock)
    expect(calledUrl.searchParams.get('geometry')).toBe('paths')
  })

  it('passes pluginData option', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(validNodesResponse))
    const client = createClient({ auth: createAuth('tok') })

    await fetchNode(client, 'abc123', '1:2', { pluginData: 'shared' })

    const calledUrl = getCalledUrl(fetchMock)
    expect(calledUrl.searchParams.get('plugin_data')).toBe('shared')
  })

  it('throws FigmaNotFoundError when node is not in response', async () => {
    const emptyResponse = {
      ...validNodesResponse,
      nodes: {},
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(emptyResponse))
    const client = createClient({ auth: createAuth('tok') })

    await expect(
      fetchNode(client, 'abc123', '1:2'),
    ).rejects.toThrow(FigmaNotFoundError)
  })

  it('throws FigmaError when response fails Zod validation', async () => {
    const malformedResponse = {
      nodes: {
        '1:2': {
          document: { id: '1:2' }, // missing name, type
        },
      },
      name: 'Test',
      lastModified: '2026-01-01',
      version: '1',
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(malformedResponse))
    const client = createClient({ auth: createAuth('tok') })

    await expect(
      fetchNode(client, 'abc123', '1:2'),
    ).rejects.toThrow(FigmaError)
  })

  it('retries on 500 and succeeds', async () => {
    vi.useFakeTimers()
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse(validNodesResponse))
    const client = createClient({ auth: createAuth('tok') })

    const promise = fetchNode(client, 'abc123', '1:2')
    await vi.advanceTimersByTimeAsync(1000)
    const result = await promise

    expect(result.name).toBe('Test File')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('does not retry on 404', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 404))
    const client = createClient({ auth: createAuth('tok') })

    await expect(
      fetchNode(client, 'abc123', '1:2'),
    ).rejects.toThrow(FigmaNotFoundError)

    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
