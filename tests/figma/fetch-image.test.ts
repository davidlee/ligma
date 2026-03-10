import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FigmaRenderError } from '../../src/errors.js'
import { createAuth } from '../../src/figma/auth.js'
import { createClient } from '../../src/figma/client.js'
import { fetchImage } from '../../src/figma/fetch-image.js'

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function binaryResponse(content: string): Response {
  return new Response(content, {
    status: 200,
    headers: { 'content-type': 'image/png' },
  })
}

function getCalledUrl(mock: ReturnType<typeof vi.fn>, callIndex = 0): URL {
  const call = mock.mock.calls[callIndex]
  expect(call).toBeDefined()
  return new URL(String(call?.[0]))
}

const PRESIGNED_URL = 'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/test.png'

describe('fetchImage', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof globalThis.fetch>>

  beforeEach(() => {
    fetchMock = vi.fn<typeof globalThis.fetch>()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches PNG image via two-step process', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        images: { '1:2': PRESIGNED_URL },
      }))
      .mockResolvedValueOnce(binaryResponse('fake-png-data'))

    const client = createClient({ auth: createAuth('tok') })
    const result = await fetchImage(client, 'abc123', '1:2')

    expect(result.format).toBe('png')
    expect(result.sourceUrl).toBe(PRESIGNED_URL)
    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('sends correct API URL with default options', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ images: { '1:2': PRESIGNED_URL } }))
      .mockResolvedValueOnce(binaryResponse('data'))

    const client = createClient({ auth: createAuth('tok') })
    await fetchImage(client, 'abc123', '1:2')

    const firstCallUrl = getCalledUrl(fetchMock, 0)
    expect(firstCallUrl.pathname).toBe('/v1/images/abc123')
    expect(firstCallUrl.searchParams.get('ids')).toBe('1:2')
    expect(firstCallUrl.searchParams.get('format')).toBe('png')
    expect(firstCallUrl.searchParams.get('scale')).toBe('2')
  })

  it('respects SVG format option', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ images: { '1:2': PRESIGNED_URL } }))
      .mockResolvedValueOnce(binaryResponse('<svg></svg>'))

    const client = createClient({ auth: createAuth('tok') })
    const result = await fetchImage(client, 'abc123', '1:2', { format: 'svg' })

    expect(result.format).toBe('svg')
    const firstCallUrl = getCalledUrl(fetchMock, 0)
    expect(firstCallUrl.searchParams.get('format')).toBe('svg')
    expect(firstCallUrl.searchParams.has('scale')).toBe(false)
  })

  it('respects custom scale option', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ images: { '1:2': PRESIGNED_URL } }))
      .mockResolvedValueOnce(binaryResponse('data'))

    const client = createClient({ auth: createAuth('tok') })
    await fetchImage(client, 'abc123', '1:2', { scale: 4 })

    const firstCallUrl = getCalledUrl(fetchMock, 0)
    expect(firstCallUrl.searchParams.get('scale')).toBe('4')
  })

  it('throws FigmaRenderError when render returns null URL', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      images: { '1:2': null },
    }))

    const client = createClient({ auth: createAuth('tok') })

    await expect(
      fetchImage(client, 'abc123', '1:2'),
    ).rejects.toThrow(FigmaRenderError)

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('includes node context in render null error', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      images: { '1:2': null },
    }))

    const client = createClient({ auth: createAuth('tok') })

    try {
      await fetchImage(client, 'abc123', '1:2')
      expect.unreachable('should have thrown')
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(FigmaRenderError)
      if (error instanceof FigmaRenderError) {
        expect(error.context).toHaveProperty('nodeId', '1:2')
        expect(error.context).toHaveProperty('fileKey', 'abc123')
      }
    }
  })

  it('throws FigmaRenderError when presigned URL download fails', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ images: { '1:2': PRESIGNED_URL } }))
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 }))

    const client = createClient({ auth: createAuth('tok') })

    await expect(
      fetchImage(client, 'abc123', '1:2'),
    ).rejects.toThrow(FigmaRenderError)
  })

  it('downloads from presigned URL without auth headers', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ images: { '1:2': PRESIGNED_URL } }))
      .mockResolvedValueOnce(binaryResponse('data'))

    const client = createClient({ auth: createAuth('tok') })
    await fetchImage(client, 'abc123', '1:2')

    // Second call (presigned URL download) should NOT go through client
    const secondCall = fetchMock.mock.calls[1]
    expect(secondCall).toBeDefined()
    const secondCallUrl: unknown = secondCall?.[0]
    expect(String(secondCallUrl)).toBe(PRESIGNED_URL)
    // No options passed to the presigned URL fetch (no auth headers)
    expect(secondCall?.[1]).toBeUndefined()
  })

  it('throws FigmaRenderError when node is missing from render response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      images: { '9:9': PRESIGNED_URL },
    }))

    const client = createClient({ auth: createAuth('tok') })

    await expect(
      fetchImage(client, 'abc123', '1:2'),
    ).rejects.toThrow(FigmaRenderError)
  })
})
