import { sep } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  buildCanonicalKey,
  buildImageKeyPath,
  buildMetadataPath,
  buildNodeKeyPath,
} from '../../src/cache/keys.js'

import type { ImageCacheKey, NodeCacheKey } from '../../src/cache/types.js'

const NODE_KEY: NodeCacheKey = {
  fileKey: 'abc123',
  nodeId: '1:2',
  depth: 2,
  geometry: false,
  pluginData: 'none',
  version: null,
}

const IMAGE_KEY: ImageCacheKey = {
  fileKey: 'abc123',
  nodeId: '1:2',
  format: 'png',
  scale: 2,
  version: null,
}

describe('buildCanonicalKey', () => {
  it('produces sorted JSON for node keys', () => {
    const canonical = buildCanonicalKey(NODE_KEY)
    // Verify keys appear in alphabetical order by checking the string directly
    const keyPattern = /"depth".*"fileKey".*"geometry".*"nodeId".*"pluginData".*"version"/s
    expect(canonical).toMatch(keyPattern)
  })

  it('produces sorted JSON for image keys', () => {
    const canonical = buildCanonicalKey(IMAGE_KEY)
    const keyPattern = /"fileKey".*"format".*"nodeId".*"scale".*"version"/s
    expect(canonical).toMatch(keyPattern)
  })

  it('is deterministic across calls', () => {
    expect(buildCanonicalKey(NODE_KEY)).toBe(buildCanonicalKey(NODE_KEY))
    expect(buildCanonicalKey(IMAGE_KEY)).toBe(buildCanonicalKey(IMAGE_KEY))
  })
})

describe('buildNodeKeyPath', () => {
  it('produces a path under nodes/<fileKey>/<nodeId>/', () => {
    const path = buildNodeKeyPath('/cache', NODE_KEY)
    expect(path).toContain(`nodes${sep}abc123${sep}1:2${sep}`)
    expect(path).toMatch(/\.json$/)
  })

  it('is deterministic', () => {
    expect(buildNodeKeyPath('/cache', NODE_KEY))
      .toBe(buildNodeKeyPath('/cache', NODE_KEY))
  })

  it('produces different paths for different keys', () => {
    const other: NodeCacheKey = { ...NODE_KEY, depth: 3 }
    expect(buildNodeKeyPath('/cache', NODE_KEY))
      .not.toBe(buildNodeKeyPath('/cache', other))
  })

  it('produces different paths when version differs', () => {
    const versioned: NodeCacheKey = { ...NODE_KEY, version: '123456' }
    expect(buildNodeKeyPath('/cache', NODE_KEY))
      .not.toBe(buildNodeKeyPath('/cache', versioned))
  })

  it('produces different paths when geometry differs', () => {
    const withGeometry: NodeCacheKey = { ...NODE_KEY, geometry: true }
    expect(buildNodeKeyPath('/cache', NODE_KEY))
      .not.toBe(buildNodeKeyPath('/cache', withGeometry))
  })

  it('produces different paths when pluginData differs', () => {
    const withPlugin: NodeCacheKey = { ...NODE_KEY, pluginData: 'shared' }
    expect(buildNodeKeyPath('/cache', NODE_KEY))
      .not.toBe(buildNodeKeyPath('/cache', withPlugin))
  })

  it('null version produces a different hash from string "null"', () => {
    const nullVersion: NodeCacheKey = { ...NODE_KEY, version: null }
    // We can't set version to literal "null" string easily, but verify
    // null is included in canonical key and produces a distinct hash
    const withStringVersion: NodeCacheKey = { ...NODE_KEY, version: 'null' }
    expect(buildNodeKeyPath('/cache', nullVersion))
      .not.toBe(buildNodeKeyPath('/cache', withStringVersion))
  })
})

describe('buildImageKeyPath', () => {
  it('produces a path under images/<fileKey>/<nodeId>/', () => {
    const path = buildImageKeyPath('/cache', IMAGE_KEY)
    expect(path).toContain(`images${sep}abc123${sep}1:2${sep}`)
    expect(path).toMatch(/\.png$/)
  })

  it('uses the format as extension', () => {
    const svgKey: ImageCacheKey = { ...IMAGE_KEY, format: 'svg' }
    expect(buildImageKeyPath('/cache', svgKey)).toMatch(/\.svg$/)
  })

  it('produces different paths for different scales', () => {
    const other: ImageCacheKey = { ...IMAGE_KEY, scale: 4 }
    expect(buildImageKeyPath('/cache', IMAGE_KEY))
      .not.toBe(buildImageKeyPath('/cache', other))
  })
})

describe('buildMetadataPath', () => {
  it('replaces file extension with .meta.json', () => {
    expect(buildMetadataPath('/cache/nodes/abc/1:2/deadbeef.json'))
      .toBe('/cache/nodes/abc/1:2/deadbeef.meta.json')
  })

  it('handles image extensions', () => {
    expect(buildMetadataPath('/cache/images/abc/1:2/deadbeef.png'))
      .toBe('/cache/images/abc/1:2/deadbeef.meta.json')
  })

  it('appends .meta.json when no extension exists', () => {
    expect(buildMetadataPath('/cache/nodes/abc/1:2/deadbeef'))
      .toBe('/cache/nodes/abc/1:2/deadbeef.meta.json')
  })
})
