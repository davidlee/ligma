import pLimit from 'p-limit'

import {
  FigmaAuthError,
  FigmaError,
  FigmaNotFoundError,
  FigmaRateLimitError,
} from '../errors.js'

import type { FigmaAuth } from './auth.js'

export interface FigmaClientOptions {
  auth: FigmaAuth
  concurrency?: number
}

export interface FigmaClient {
  request(url: string): Promise<unknown>
}

function parseJson(text: string): unknown {
  // JSON.parse returns `any`; wrapping in a typed function avoids type assertions
  return JSON.parse(text) as unknown // eslint-disable-line @typescript-eslint/consistent-type-assertions
}

function parseRetryAfter(response: Response): number | undefined {
  const value = response.headers.get('retry-after')
  if (value === null) {
    return undefined
  }
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function throwForStatus(response: Response, url: string): never {
  const context = { status: response.status, url }

  if (response.status === 403) {
    throw new FigmaAuthError('Figma API authentication failed', { context })
  }
  if (response.status === 404) {
    throw new FigmaNotFoundError('Figma API resource not found', { context })
  }
  if (response.status === 429) {
    throw new FigmaRateLimitError('Figma API rate limit exceeded', {
      context,
      retryAfter: parseRetryAfter(response),
    })
  }

  throw new FigmaError(`Figma API error (${String(response.status)})`, { context })
}

export function createClient(options: FigmaClientOptions): FigmaClient {
  const limit = pLimit(options.concurrency ?? 3)
  const headers = options.auth.header()

  return {
    async request(url: string): Promise<unknown> {
      return await limit(async () => {
        const response = await fetch(url, { headers })

        if (!response.ok) {
          throwForStatus(response, url)
        }

        const text = await response.text()
        return parseJson(text)
      })
    },
  }
}
