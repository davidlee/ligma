import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FigmaAuthError, FigmaNotFoundError, FigmaRateLimitError } from '../../src/errors.js'
import { createAuth } from '../../src/figma/auth.js'
import { createClient } from '../../src/figma/client.js'

function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  })
}

function getCalledHeaders(
  mock: ReturnType<typeof vi.fn>,
): unknown {
  const call = mock.mock.calls[0]
  if (call === undefined) {
    return undefined
  }
  const options: unknown = call[1]
  if (typeof options !== 'object' || options === null) {
    return undefined
  }
  return 'headers' in options ? options.headers : undefined
}

describe('createClient', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof globalThis.fetch>>

  beforeEach(() => {
    fetchMock = vi.fn<typeof globalThis.fetch>()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends request with auth headers', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    const auth = createAuth('test-token')
    const client = createClient({ auth })

    await client.request('https://api.figma.com/v1/files/abc/nodes')

    expect(fetchMock).toHaveBeenCalledOnce()
    const headers = getCalledHeaders(fetchMock)
    expect(headers).toHaveProperty('X-Figma-Token', 'test-token')
  })

  it('returns parsed JSON on success', async () => {
    const data = { name: 'Test', version: '1' }
    fetchMock.mockResolvedValueOnce(jsonResponse(data))
    const auth = createAuth('tok')
    const client = createClient({ auth })

    const result = await client.request('https://api.figma.com/v1/files/abc/nodes')

    expect(result).toStrictEqual(data)
  })

  it('throws FigmaAuthError on 403', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 403 }, 403))
    const auth = createAuth('bad-token')
    const client = createClient({ auth })

    await expect(
      client.request('https://api.figma.com/v1/files/abc/nodes'),
    ).rejects.toThrow(FigmaAuthError)
  })

  it('throws FigmaNotFoundError on 404', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 404 }, 404))
    const auth = createAuth('tok')
    const client = createClient({ auth })

    await expect(
      client.request('https://api.figma.com/v1/files/abc/nodes'),
    ).rejects.toThrow(FigmaNotFoundError)
  })

  it('throws FigmaRateLimitError on 429', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: 429 }, 429, { 'retry-after': '30' }),
    )
    const auth = createAuth('tok')
    const client = createClient({ auth })

    await expect(
      client.request('https://api.figma.com/v1/files/abc/nodes'),
    ).rejects.toThrow(FigmaRateLimitError)
  })

  it('includes retryAfter from Retry-After header on 429', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: 429 }, 429, { 'retry-after': '45' }),
    )
    const auth = createAuth('tok')
    const client = createClient({ auth })

    try {
      await client.request('https://api.figma.com/v1/files/abc/nodes')
      expect.unreachable('should have thrown')
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(FigmaRateLimitError)
      if (error instanceof FigmaRateLimitError) {
        expect(error.retryAfter).toBe(45)
      }
    }
  })

  it('throws FigmaError on 500', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 500 }, 500))
    const auth = createAuth('tok')
    const client = createClient({ auth })

    await expect(
      client.request('https://api.figma.com/v1/files/abc/nodes'),
    ).rejects.toThrow('Figma API error')
  })

  it('includes status and URL in error context', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 404))
    const auth = createAuth('tok')
    const client = createClient({ auth })

    try {
      await client.request('https://api.figma.com/v1/files/abc/nodes')
      expect.unreachable('should have thrown')
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(FigmaNotFoundError)
      if (error instanceof FigmaNotFoundError) {
        expect(error.context).toHaveProperty('status', 404)
        expect(error.context).toHaveProperty('url')
      }
    }
  })

  it('respects concurrency limit', async () => {
    let concurrent = 0
    let maxConcurrent = 0

    fetchMock.mockImplementation(async (): Promise<Response> => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise((resolve) => setTimeout(resolve, 10))
      concurrent--
      return jsonResponse({ ok: true })
    })

    const auth = createAuth('tok')
    const client = createClient({ auth, concurrency: 2 })

    await Promise.all([
      client.request('https://api.figma.com/v1/a'),
      client.request('https://api.figma.com/v1/b'),
      client.request('https://api.figma.com/v1/c'),
      client.request('https://api.figma.com/v1/d'),
    ])

    expect(maxConcurrent).toBeLessThanOrEqual(2)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})
