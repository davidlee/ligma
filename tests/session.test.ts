import { describe, expect, it } from 'vitest'

import { resolveConfig } from '../src/config.js'
import { FigmaAuthError, FigmaUrlParseError } from '../src/errors.js'
import { createSession } from '../src/session.js'

const VALID_URL = 'https://www.figma.com/design/abc123/MyFile?node-id=0-1'

describe('createSession', () => {
  it('parses URL into fileKey and nodeId', () => {
    const config = resolveConfig({ url: VALID_URL, token: 'tok' })
    const session = createSession(config)

    expect(session.parsed.fileKey).toBe('abc123')
    expect(session.parsed.nodeId).toBe('0:1')
  })

  it('creates a client with a request method', () => {
    const config = resolveConfig({ url: VALID_URL, token: 'tok' })
    const session = createSession(config)

    expect(session.client).toBeDefined()
    expect(typeof session.client.request).toBe('function')
  })

  it('creates a cache when caching is enabled', () => {
    const config = resolveConfig({ url: VALID_URL, token: 'tok', cacheEnabled: true })
    const session = createSession(config)

    expect(session.cache).toBeDefined()
  })

  it('creates a noop cache when caching is disabled', () => {
    const config = resolveConfig({ url: VALID_URL, token: 'tok', cacheEnabled: false })
    const session = createSession(config)

    expect(session.cache).toBeDefined()
  })

  it('preserves the original config', () => {
    const config = resolveConfig({ url: VALID_URL, token: 'tok', depth: 5 })
    const session = createSession(config)

    expect(session.config).toBe(config)
    expect(session.config.depth).toBe(5)
  })

  it('throws FigmaUrlParseError for invalid URL', () => {
    const config = resolveConfig({ url: 'https://not-figma.com/foo', token: 'tok' })

    expect(() => createSession(config)).toThrow(FigmaUrlParseError)
  })

  it('throws FigmaAuthError for empty token', () => {
    const config = resolveConfig({ url: VALID_URL, token: '' })

    expect(() => createSession(config)).toThrow(FigmaAuthError)
  })
})
