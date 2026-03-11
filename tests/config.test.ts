import { describe, expect, it } from 'vitest'

import { resolveConfig } from '../src/config.js'

describe('resolveConfig defaults', () => {
  const base = { url: 'https://figma.com/design/abc/X?node-id=0-1', token: 'tok' }

  it('applies expansion defaults', () => {
    const config = resolveConfig(base)
    expect(config.expansionEnabled).toBe(true)
    expect(config.maxExpansionTargets).toBe(10)
    expect(config.expansionDepth).toBe(2)
  })

  it('applies cache defaults', () => {
    const config = resolveConfig(base)
    expect(config.cacheEnabled).toBe(true)
    expect(config.cacheDirectory).toBe('.cache/figma-fetch')
  })

  it('applies asset defaults', () => {
    const config = resolveConfig(base)
    expect(config.maxAssets).toBe(20)
    expect(config.assetFormat).toBe('auto')
  })

  it('allows overriding expansion fields', () => {
    const config = resolveConfig({
      ...base,
      expansionEnabled: false,
      maxExpansionTargets: 5,
      expansionDepth: 3,
    })
    expect(config.expansionEnabled).toBe(false)
    expect(config.maxExpansionTargets).toBe(5)
    expect(config.expansionDepth).toBe(3)
  })

  it('allows overriding cache fields', () => {
    const config = resolveConfig({
      ...base,
      cacheEnabled: false,
      cacheDirectory: '/tmp/custom-cache',
    })
    expect(config.cacheEnabled).toBe(false)
    expect(config.cacheDirectory).toBe('/tmp/custom-cache')
  })
})

describe('resolveConfig validation (VT-038)', () => {
  const base = { url: 'https://figma.com/design/abc/X?node-id=0-1', token: 'tok' }

  it('throws when depth < 1', () => {
    expect(() => resolveConfig({ ...base, depth: 0 })).toThrow('depth')
  })

  it('throws when expansionDepth < 1', () => {
    expect(() => resolveConfig({ ...base, expansionDepth: 0 })).toThrow('expansionDepth')
  })

  it('throws when maxExpansionTargets < 0', () => {
    expect(() => resolveConfig({ ...base, maxExpansionTargets: -1 })).toThrow('maxExpansionTargets')
  })

  it('throws when scale <= 0', () => {
    expect(() => resolveConfig({ ...base, scale: 0 })).toThrow('scale')
  })

  it('throws when maxAssets < 0', () => {
    expect(() => resolveConfig({ ...base, maxAssets: -1 })).toThrow('maxAssets')
  })

  it('accepts boundary values', () => {
    expect(() => resolveConfig({ ...base, depth: 1 })).not.toThrow()
    expect(() => resolveConfig({ ...base, expansionDepth: 1 })).not.toThrow()
    expect(() => resolveConfig({ ...base, maxExpansionTargets: 0 })).not.toThrow()
    expect(() => resolveConfig({ ...base, scale: 0.01 })).not.toThrow()
    expect(() => resolveConfig({ ...base, maxAssets: 0 })).not.toThrow()
  })
})
