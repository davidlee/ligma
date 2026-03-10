import { describe, expect, it } from 'vitest'

import {
  FigmaError,
  FigmaUrlParseError,
  FigmaAuthError,
  FigmaNotFoundError,
  FigmaRateLimitError,
  FigmaRenderError,
  NormalizationError,
} from '../src/errors.js'

describe('error hierarchy', () => {
  it('FigmaError extends Error', () => {
    const error = new FigmaError('base error')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FigmaError)
    expect(error.message).toBe('base error')
    expect(error.name).toBe('FigmaError')
  })

  it('FigmaError carries cause', () => {
    const cause = new Error('root')
    const error = new FigmaError('wrapped', { cause })
    expect(error.cause).toBe(cause)
  })

  describe.each([
    ['FigmaUrlParseError', FigmaUrlParseError],
    ['FigmaAuthError', FigmaAuthError],
    ['FigmaNotFoundError', FigmaNotFoundError],
    ['FigmaRateLimitError', FigmaRateLimitError],
    ['FigmaRenderError', FigmaRenderError],
    ['NormalizationError', NormalizationError],
  ] as const)('%s', (name, ErrorClass) => {
    it('is instantiable', () => {
      const error = new ErrorClass('test')
      expect(error).toBeInstanceOf(ErrorClass)
      expect(error.message).toBe('test')
    })

    it('extends FigmaError and Error', () => {
      const error = new ErrorClass('test')
      expect(error).toBeInstanceOf(FigmaError)
      expect(error).toBeInstanceOf(Error)
    })

    it('has correct name', () => {
      const error = new ErrorClass('test')
      expect(error.name).toBe(name)
    })

    it('carries cause chain', () => {
      const cause = new Error('root cause')
      const error = new ErrorClass('wrapped', { cause })
      expect(error.cause).toBe(cause)
    })
  })

  describe('FigmaRateLimitError', () => {
    it('carries retryAfter', () => {
      const error = new FigmaRateLimitError('rate limited', { retryAfter: 30 })
      expect(error.retryAfter).toBe(30)
    })

    it('retryAfter defaults to undefined', () => {
      const error = new FigmaRateLimitError('rate limited')
      expect(error.retryAfter).toBeUndefined()
    })
  })

  describe('context fields', () => {
    it('FigmaUrlParseError carries url context', () => {
      const error = new FigmaUrlParseError('invalid URL', {
        context: { url: 'https://bad.url' },
      })
      expect(error.context).toEqual({ url: 'https://bad.url' })
    })

    it('FigmaNotFoundError carries fileKey and nodeId', () => {
      const error = new FigmaNotFoundError('not found', {
        context: { fileKey: 'abc', nodeId: '1:2' },
      })
      expect(error.context).toEqual({ fileKey: 'abc', nodeId: '1:2' })
    })

    it('FigmaRenderError carries fileKey, nodeId, httpStatus', () => {
      const error = new FigmaRenderError('render failed', {
        context: { fileKey: 'abc', nodeId: '1:2', httpStatus: 500 },
      })
      expect(error.context).toEqual({ fileKey: 'abc', nodeId: '1:2', httpStatus: 500 })
    })

    it('context defaults to undefined', () => {
      const error = new FigmaError('no context')
      expect(error.context).toBeUndefined()
    })
  })
})
