import { describe, expect, it } from 'vitest'

import { FigmaAuthError } from '../../src/errors.js'
import { createAuth } from '../../src/figma/auth.js'

import type { FigmaAuth } from '../../src/figma/auth.js'

describe('createAuth', () => {
  it('returns an object satisfying the FigmaAuth interface', () => {
    const auth: FigmaAuth = createAuth('test-token')
    expect(auth).toBeDefined()
    expect(auth.token).toBe('test-token')
    expect(typeof auth.header).toBe('function')
  })

  it('produces X-Figma-Token header with the token value', () => {
    const auth = createAuth('my-secret-token')
    expect(auth.header()).toStrictEqual({ 'X-Figma-Token': 'my-secret-token' })
  })

  it('returns the same header on repeated calls', () => {
    const auth = createAuth('tok')
    expect(auth.header()).toStrictEqual(auth.header())
  })

  it('throws FigmaAuthError on empty string token', () => {
    expect(() => createAuth('')).toThrow(FigmaAuthError)
  })

  it('throws FigmaAuthError with descriptive message on empty token', () => {
    expect(() => createAuth('')).toThrow('Token must not be empty')
  })

  it('preserves whitespace in token without trimming', () => {
    const auth = createAuth('  spaced  ')
    expect(auth.token).toBe('  spaced  ')
    expect(auth.header()).toStrictEqual({ 'X-Figma-Token': '  spaced  ' })
  })
})
