import { FigmaUrlParseError } from '../errors.js'

export type ParsedFigmaUrl = {
  fileKey: string
  nodeId: string      // API format: "123:456"
  originalUrl: string
}

const FIGMA_HOST = 'www.figma.com'
const VALID_PATH_PREFIXES = ['design', 'file']

/**
 * Parse a Figma URL into { fileKey, nodeId, originalUrl }.
 * Converts node IDs from URL format (123-456) to API format (123:456).
 * Throws FigmaUrlParseError on invalid input.
 */
export function parseFigmaUrl(url: string): ParsedFigmaUrl {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new FigmaUrlParseError('Not a valid URL', {
      context: { url },
    })
  }

  if (parsed.hostname !== FIGMA_HOST) {
    throw new FigmaUrlParseError('Not a Figma URL', {
      context: { url },
    })
  }

  const segments = parsed.pathname.split('/').filter(Boolean)
  const prefix = segments[0]
  const fileKey = segments[1]

  if (!prefix || !VALID_PATH_PREFIXES.includes(prefix) || !fileKey) {
    throw new FigmaUrlParseError('Unrecognized Figma URL path', {
      context: { url },
    })
  }

  const rawNodeId = parsed.searchParams.get('node-id')
  if (!rawNodeId) {
    throw new FigmaUrlParseError('Missing node-id query parameter', {
      context: { url, fileKey },
    })
  }

  const nodeId = rawNodeId.replace(/-/g, ':')

  return { fileKey, nodeId, originalUrl: url }
}
