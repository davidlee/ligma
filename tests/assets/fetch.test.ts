import { describe, expect, it, vi } from 'vitest'

import { fetchAssets } from '../../src/assets/fetch.js'

import type { ExportTarget } from '../../src/assets/collect.js'
import type { ImageFetcher } from '../../src/assets/fetch.js'

function makeTarget(overrides: Partial<ExportTarget> = {}): ExportTarget {
  return {
    nodeId: '1:1',
    nodeName: 'Test',
    kind: 'bitmap',
    ...overrides,
  }
}

function successFetcher(): ImageFetcher {
  return vi.fn().mockResolvedValue(Buffer.from('image-data'))
}

describe('fetchAssets', () => {
  it('returns empty for no targets', async () => {
    const result = await fetchAssets(successFetcher(), [], null)
    expect(result.fetched).toEqual([])
    expect(result.errors).toEqual([])
  })

  it('fetches bitmap target as PNG by default', async () => {
    const fetcher = successFetcher()
    const target = makeTarget({ kind: 'bitmap' })
    const result = await fetchAssets(fetcher, [target], null)
    expect(result.fetched).toHaveLength(1)
    expect(result.fetched[0]?.format).toBe('png')
    expect(result.fetched[0]?.target).toBe(target)
    expect(fetcher).toHaveBeenCalledWith('1:1', 'png')
  })

  it('fetches svg target as SVG by default', async () => {
    const fetcher = successFetcher()
    const target = makeTarget({ nodeId: '2:1', kind: 'svg' })
    const result = await fetchAssets(fetcher, [target], null)
    expect(result.fetched).toHaveLength(1)
    expect(result.fetched[0]?.format).toBe('svg')
    expect(fetcher).toHaveBeenCalledWith('2:1', 'svg')
  })

  it('fetches mixed target as both PNG and SVG', async () => {
    const target = makeTarget({ kind: 'mixed' })
    const result = await fetchAssets(successFetcher(), [target], null)
    expect(result.fetched).toHaveLength(2)
    const formats = result.fetched.map((f) => f.format).sort()
    expect(formats).toEqual(['png', 'svg'])
  })

  it('format override forces all targets to specified format', async () => {
    const targets = [
      makeTarget({ nodeId: '1:1', kind: 'bitmap' }),
      makeTarget({ nodeId: '2:1', kind: 'svg' }),
    ]
    const result = await fetchAssets(successFetcher(), targets, 'svg')
    expect(result.fetched).toHaveLength(2)
    for (const fetched of result.fetched) {
      expect(fetched.format).toBe('svg')
    }
  })

  it('records error on fetch failure without throwing', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Rate limited'))
    const target = makeTarget()
    const result = await fetchAssets(fetcher, [target], null)
    expect(result.fetched).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({
      type: 'AssetExportError',
      message: 'Rate limited',
      nodeId: '1:1',
    })
  })

  it('mixed target with one format failing still produces the other', async () => {
    let callCount = 0
    const fetcher: ImageFetcher = (_nodeId, _format) => {
      callCount++
      if (callCount === 1) {
        return Promise.reject(new Error('PNG failed'))
      }
      return Promise.resolve(Buffer.from('svg-data'))
    }

    const target = makeTarget({ kind: 'mixed' })
    const result = await fetchAssets(fetcher, [target], null)
    expect(result.fetched).toHaveLength(1)
    expect(result.fetched[0]?.format).toBe('svg')
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.message).toBe('PNG failed')
  })

  it('handles non-Error thrown values', async () => {
    const fetcher = vi.fn().mockRejectedValue('string error')
    const result = await fetchAssets(fetcher, [makeTarget()], null)
    expect(result.errors[0]?.message).toBe('Unknown asset export error')
  })
})
