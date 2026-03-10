import { describe, it, expect } from 'vitest'
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
    const err = new FigmaError('base error')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(FigmaError)
    expect(err.message).toBe('base error')
    expect(err.name).toBe('FigmaError')
  })

  it('FigmaError carries cause', () => {
    const cause = new Error('root')
    const err = new FigmaError('wrapped', { cause })
    expect(err.cause).toBe(cause)
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
      const err = new ErrorClass('test')
      expect(err).toBeInstanceOf(ErrorClass)
      expect(err.message).toBe('test')
    })

    it('extends FigmaError and Error', () => {
      const err = new ErrorClass('test')
      expect(err).toBeInstanceOf(FigmaError)
      expect(err).toBeInstanceOf(Error)
    })

    it('has correct name', () => {
      const err = new ErrorClass('test')
      expect(err.name).toBe(name)
    })

    it('carries cause chain', () => {
      const cause = new Error('root cause')
      const err = new ErrorClass('wrapped', { cause })
      expect(err.cause).toBe(cause)
    })
  })

  describe('FigmaRateLimitError', () => {
    it('carries retryAfter', () => {
      const err = new FigmaRateLimitError('rate limited', { retryAfter: 30 })
      expect(err.retryAfter).toBe(30)
    })

    it('retryAfter defaults to undefined', () => {
      const err = new FigmaRateLimitError('rate limited')
      expect(err.retryAfter).toBeUndefined()
    })
  })

  describe('context fields', () => {
    it('FigmaUrlParseError carries url context', () => {
      const err = new FigmaUrlParseError('invalid URL', {
        context: { url: 'https://bad.url' },
      })
      expect(err.context).toEqual({ url: 'https://bad.url' })
    })

    it('FigmaNotFoundError carries fileKey and nodeId', () => {
      const err = new FigmaNotFoundError('not found', {
        context: { fileKey: 'abc', nodeId: '1:2' },
      })
      expect(err.context).toEqual({ fileKey: 'abc', nodeId: '1:2' })
    })

    it('FigmaRenderError carries fileKey, nodeId, httpStatus', () => {
      const err = new FigmaRenderError('render failed', {
        context: { fileKey: 'abc', nodeId: '1:2', httpStatus: 500 },
      })
      expect(err.context).toEqual({ fileKey: 'abc', nodeId: '1:2', httpStatus: 500 })
    })

    it('context defaults to undefined', () => {
      const err = new FigmaError('no context')
      expect(err.context).toBeUndefined()
    })
  })
})
