import { describe, expect, it } from 'vitest'

import { buildImagesEndpoint, buildNodesEndpoint } from '../../src/figma/endpoints.js'

describe('buildNodesEndpoint', () => {
  it('builds the correct base URL', () => {
    const url = buildNodesEndpoint('abc123', '1:2')
    expect(url).toContain('https://api.figma.com/v1/files/abc123/nodes')
  })

  it('includes the node ID as ids query parameter', () => {
    const url = new URL(buildNodesEndpoint('abc123', '1:2'))
    expect(url.searchParams.get('ids')).toBe('1:2')
  })

  it('uses default depth of 2', () => {
    const url = new URL(buildNodesEndpoint('abc123', '1:2'))
    expect(url.searchParams.get('depth')).toBe('2')
  })

  it('respects custom depth option', () => {
    const url = new URL(buildNodesEndpoint('abc123', '1:2', { depth: 5 }))
    expect(url.searchParams.get('depth')).toBe('5')
  })

  it('omits geometry param by default', () => {
    const url = new URL(buildNodesEndpoint('abc123', '1:2'))
    expect(url.searchParams.has('geometry')).toBe(false)
  })

  it('includes geometry=paths when geometry option is true', () => {
    const url = new URL(buildNodesEndpoint('abc123', '1:2', { geometry: true }))
    expect(url.searchParams.get('geometry')).toBe('paths')
  })

  it('omits plugin_data param by default', () => {
    const url = new URL(buildNodesEndpoint('abc123', '1:2'))
    expect(url.searchParams.has('plugin_data')).toBe(false)
  })

  it('includes plugin_data when pluginData option is provided', () => {
    const url = new URL(buildNodesEndpoint('abc123', '1:2', { pluginData: 'shared' }))
    expect(url.searchParams.get('plugin_data')).toBe('shared')
  })
})

describe('buildImagesEndpoint', () => {
  it('builds the correct base URL', () => {
    const url = buildImagesEndpoint('abc123', '1:2')
    expect(url).toContain('https://api.figma.com/v1/images/abc123')
  })

  it('includes the node ID as ids query parameter', () => {
    const url = new URL(buildImagesEndpoint('abc123', '1:2'))
    expect(url.searchParams.get('ids')).toBe('1:2')
  })

  it('defaults to png format', () => {
    const url = new URL(buildImagesEndpoint('abc123', '1:2'))
    expect(url.searchParams.get('format')).toBe('png')
  })

  it('defaults to scale 2', () => {
    const url = new URL(buildImagesEndpoint('abc123', '1:2'))
    expect(url.searchParams.get('scale')).toBe('2')
  })

  it('respects custom format option', () => {
    const url = new URL(buildImagesEndpoint('abc123', '1:2', { format: 'svg' }))
    expect(url.searchParams.get('format')).toBe('svg')
  })

  it('respects custom scale option', () => {
    const url = new URL(buildImagesEndpoint('abc123', '1:2', { scale: 4 }))
    expect(url.searchParams.get('scale')).toBe('4')
  })

  it('omits scale for svg format', () => {
    const url = new URL(buildImagesEndpoint('abc123', '1:2', { format: 'svg' }))
    expect(url.searchParams.has('scale')).toBe(false)
  })
})
