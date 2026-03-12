import {
  createCache,
  createNoopCache,
} from './cache/index.js'
import { createAuth } from './figma/auth.js'
import { createClient } from './figma/client.js'
import { parseFigmaUrl } from './figma/url.js'

import type { Cache } from './cache/index.js'
import type { FetchConfig } from './config.js'
import type { FigmaClient } from './figma/client.js'

export interface ParsedFigmaUrl {
  readonly fileKey: string
  readonly nodeId: string
}

export interface Session {
  readonly client: FigmaClient
  readonly cache: Cache
  readonly parsed: ParsedFigmaUrl
  readonly config: FetchConfig
}

export function createSession(config: FetchConfig): Session {
  const parsed = parseFigmaUrl(config.url)
  const auth = createAuth(config.token)
  const client = createClient({ auth })
  const cache = config.cacheEnabled
    ? createCache({ enabled: true, cacheDirectory: config.cacheDirectory })
    : createNoopCache()

  return { client, cache, parsed, config }
}
