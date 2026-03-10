import { describe, expect, it } from 'vitest'

import { FigmaUrlParseError } from '../../src/errors.js'
import { parseFigmaUrl } from '../../src/figma/url.js'

describe('parseFigmaUrl', () => {
  describe('standard design URLs', () => {
    it('parses a design URL with node-id query param', () => {
      const result = parseFigmaUrl(
        'https://www.figma.com/design/ABC123/My-File?node-id=1-2'
      )
      expect(result).toEqual({
        fileKey: 'ABC123',
        nodeId: '1:2',
        originalUrl: 'https://www.figma.com/design/ABC123/My-File?node-id=1-2',
      })
    })

    it('parses a file URL (legacy format)', () => {
      const result = parseFigmaUrl(
        'https://www.figma.com/file/ABC123/My-File?node-id=10-20'
      )
      expect(result).toEqual({
        fileKey: 'ABC123',
        nodeId: '10:20',
        originalUrl: 'https://www.figma.com/file/ABC123/My-File?node-id=10-20',
      })
    })

    it('handles URL without file name segment', () => {
      const result = parseFigmaUrl(
        'https://www.figma.com/design/ABC123?node-id=1-2'
      )
      expect(result).toEqual({
        fileKey: 'ABC123',
        nodeId: '1:2',
        originalUrl: 'https://www.figma.com/design/ABC123?node-id=1-2',
      })
    })
  })

  describe('node ID normalization', () => {
    it('converts dash-separated node ID to colon format', () => {
      const result = parseFigmaUrl(
        'https://www.figma.com/design/KEY/Name?node-id=123-456'
      )
      expect(result.nodeId).toBe('123:456')
    })

    it('preserves already-colon-formatted node IDs', () => {
      const result = parseFigmaUrl(
        'https://www.figma.com/design/KEY/Name?node-id=123%3A456'
      )
      expect(result.nodeId).toBe('123:456')
    })
  })

  describe('extra query params', () => {
    it('parses correctly despite extra query params', () => {
      const result = parseFigmaUrl(
        'https://www.figma.com/design/ABC123/Name?node-id=1-2&t=abc&mode=dev'
      )
      expect(result.fileKey).toBe('ABC123')
      expect(result.nodeId).toBe('1:2')
    })
  })

  describe('error cases', () => {
    it('throws FigmaUrlParseError for non-Figma URL', () => {
      expect(() => parseFigmaUrl('https://example.com/foo')).toThrow(
        FigmaUrlParseError
      )
    })

    it('throws FigmaUrlParseError for missing node-id', () => {
      expect(() =>
        parseFigmaUrl('https://www.figma.com/design/ABC123/Name')
      ).toThrow(FigmaUrlParseError)
    })

    it('throws FigmaUrlParseError for empty string', () => {
      expect(() => parseFigmaUrl('')).toThrow(FigmaUrlParseError)
    })

    it('throws FigmaUrlParseError for garbage input', () => {
      expect(() => parseFigmaUrl('not a url at all')).toThrow(
        FigmaUrlParseError
      )
    })

    it('error message is descriptive', () => {
      expect(() => parseFigmaUrl('https://example.com')).toThrow(
        /not a figma url/i
      )
    })

    it('error carries URL context', () => {
      try {
        parseFigmaUrl('https://example.com')
        expect.fail('should have thrown')
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(FigmaUrlParseError)
        if (error instanceof FigmaUrlParseError) {
          expect(error.context).toEqual({
            url: 'https://example.com',
          })
        }
      }
    })

    it('throws for missing node-id with descriptive message', () => {
      expect(() =>
        parseFigmaUrl('https://www.figma.com/design/ABC123/Name')
      ).toThrow(/node-id/i)
    })
  })
})
