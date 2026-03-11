import { readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveConfig } from '../src/config.js'
import { FigmaAuthError, FigmaUrlParseError } from '../src/errors.js'
import { orchestrate } from '../src/orchestrate.js'
import { writeOutput } from '../src/output/write.js'
import { ManifestSchema } from '../src/schemas/manifest.js'
import { OutlineNodeSchema } from '../src/schemas/outline.js'
import { TokensUsedSummarySchema } from '../src/schemas/tokens-used.js'

import type { FetchConfig } from '../src/config.js'

const MOCK_NODES_RESPONSE = {
  name: 'Test File',
  lastModified: '2026-03-10T00:00:00Z',
  version: '12345',
  nodes: {
    '0:1': {
      document: { id: '0:1', name: 'Frame', type: 'FRAME', children: [] },
      components: {},
      schemaVersion: 0,
    },
  },
}

const MOCK_IMAGES_RESPONSE = {
  images: { '0:1': 'https://figma-cdn.example.com/rendered.png' },
}

const MOCK_IMAGE_BINARY = Buffer.from([0x89, 0x50, 0x4e, 0x47])

function mockFetchSuccess(): void {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/v1/files/') && url.includes('/nodes')) {
      return Promise.resolve(new Response(JSON.stringify(MOCK_NODES_RESPONSE)))
    }
    if (url.includes('/v1/images/')) {
      return Promise.resolve(new Response(JSON.stringify(MOCK_IMAGES_RESPONSE)))
    }
    if (url.includes('figma-cdn.example.com')) {
      return Promise.resolve(new Response(MOCK_IMAGE_BINARY))
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  }))
}

function mockFetchImageFailure(): void {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/v1/files/') && url.includes('/nodes')) {
      return Promise.resolve(new Response(JSON.stringify(MOCK_NODES_RESPONSE)))
    }
    if (url.includes('/v1/images/')) {
      return Promise.resolve(
        new Response(JSON.stringify({ images: { '0:1': null } })),
      )
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  }))
}

// Mock response with an asset-exportable child (bitmap fill triggers exportSuggested)
const MOCK_NODES_WITH_ASSET = {
  name: 'Test File',
  lastModified: '2026-03-10T00:00:00Z',
  version: '12345',
  nodes: {
    '0:1': {
      document: {
        id: '0:1', name: 'Frame', type: 'FRAME',
        children: [
          {
            id: '5:1', name: 'Hero Image', type: 'RECTANGLE',
            fills: [{ type: 'IMAGE', imageRef: 'img:hero' }],
          },
        ],
      },
      components: {},
      schemaVersion: 0,
    },
  },
}

const MOCK_ASSET_CDN_URL = 'https://figma-cdn.example.com/asset-5-1.png'

function mockFetchWithAssets(): void {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/v1/files/') && url.includes('/nodes')) {
      return Promise.resolve(new Response(JSON.stringify(MOCK_NODES_WITH_ASSET)))
    }
    if (url.includes('/v1/images/')) {
      // Return CDN URLs for both the root node and any asset node
      return Promise.resolve(new Response(JSON.stringify({
        images: {
          '0:1': 'https://figma-cdn.example.com/rendered.png',
          '5:1': MOCK_ASSET_CDN_URL,
        },
      })))
    }
    if (url.includes('figma-cdn.example.com')) {
      return Promise.resolve(new Response(MOCK_IMAGE_BINARY))
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  }))
}

const validConfig: FetchConfig = resolveConfig({
  url: 'https://www.figma.com/design/abc123/MyFile?node-id=0-1',
  token: 'test-token',
  cacheEnabled: false,
  expansionEnabled: false,
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe('orchestrate', () => {
  it('returns OrchestrateResult with manifest and rawNode', async () => {
    mockFetchSuccess()
    const result = await orchestrate(validConfig)

    expect(result.manifest).toBeDefined()
    expect(result.rawNode).toBeDefined()
    expect(result.image).toBeDefined()
  })

  it('produces a valid manifest', async () => {
    mockFetchSuccess()
    const result = await orchestrate(validConfig)
    const validation = ManifestSchema.safeParse(result.manifest)
    expect(validation.success).toBe(true)
  })

  it('populates source metadata from API response', async () => {
    mockFetchSuccess()
    const result = await orchestrate(validConfig)

    expect(result.manifest.source.fileKey).toBe('abc123')
    expect(result.manifest.source.nodeId).toBe('0:1')
    expect(result.manifest.source.fileName).toBe('Test File')
    expect(result.manifest.source.version).toBe('12345')
  })

  it('returns raw node document', async () => {
    mockFetchSuccess()
    const result = await orchestrate(validConfig)

    const document = result.rawNode
    expect(document).toEqual({
      id: '0:1',
      name: 'Frame',
      type: 'FRAME',
      children: [],
    })
  })

  it('returns image result on success', async () => {
    mockFetchSuccess()
    const result = await orchestrate(validConfig)

    expect(result.image).toBeDefined()
    expect(result.image?.format).toBe('png')
    expect(result.image?.buffer).toBeInstanceOf(Buffer)
  })

  it('throws on invalid URL', async () => {
    const config = resolveConfig({
      url: 'https://not-figma.com/foo',
      token: 'test-token',
    })
    await expect(orchestrate(config)).rejects.toThrow(FigmaUrlParseError)
  })

  it('throws on empty token', async () => {
    const config = resolveConfig({
      url: 'https://www.figma.com/design/abc123/MyFile?node-id=0-1',
      token: '',
    })
    await expect(orchestrate(config)).rejects.toThrow(FigmaAuthError)
  })

  it('records image error in manifest when image export fails', async () => {
    mockFetchImageFailure()
    const result = await orchestrate(validConfig)

    expect(result.image).toBeUndefined()
    expect(result.manifest.errors).toHaveLength(1)
    const firstError = result.manifest.errors[0]
    expect(firstError).toBeDefined()
    expect(firstError?.type).toBe('FigmaRenderError')
    expect(firstError?.nodeId).toBe('0:1')
  })

  it('still returns rawNode when image export fails', async () => {
    mockFetchImageFailure()
    const result = await orchestrate(validConfig)

    expect(result.rawNode).toBeDefined()
    expect(result.manifest.source.fileKey).toBe('abc123')
  })

  it('returns tokensUsed summary', async () => {
    mockFetchSuccess()
    const result = await orchestrate(validConfig)

    expect(result.tokensUsed).toBeDefined()
    const parsed = TokensUsedSummarySchema.safeParse(result.tokensUsed)
    expect(parsed.success).toBe(true)
  })

  it('tokensUsed scope matches parsed URL', async () => {
    mockFetchSuccess()
    const result = await orchestrate(validConfig)

    expect(result.tokensUsed.scope.fileKey).toBe('abc123')
    expect(result.tokensUsed.scope.rootNodeId).toBe('0:1')
    expect(result.tokensUsed.scope.isFullInventory).toBe(false)
  })

  it('sets correct output paths in manifest', async () => {
    mockFetchSuccess()
    const result = await orchestrate(validConfig)

    expect(result.manifest.outputs.rawNodeJson).toBe('structure/raw-node.json')
    expect(result.manifest.outputs.normalizedNodeJson).toBe('structure/normalized-node.json')
    expect(result.manifest.outputs.outlineJson).toBe('structure/outline.json')
    expect(result.manifest.outputs.outlineXml).toBe('structure/outline.xml')
    expect(result.manifest.outputs.contextMd).toBe('context.md')
    expect(result.manifest.outputs.tokensUsedJson).toBe('tokens/tokens-used.json')
    expect(result.manifest.outputs.png).toBe('visual/0:1.png')
  })

  it('sets svg output path when format is svg', async () => {
    mockFetchSuccess()
    const config = resolveConfig({
      url: 'https://www.figma.com/design/abc123/MyFile?node-id=0-1',
      token: 'test-token',
      format: 'svg',
      cacheEnabled: false,
      expansionEnabled: false,
    })
    const result = await orchestrate(config)
    expect(result.manifest.outputs.svg).toBe('visual/0:1.svg')
    expect(result.manifest.outputs.png).toBeUndefined()
  })

  it('returns outlineJson as valid OutlineNode', async () => {
    mockFetchSuccess()
    const result = await orchestrate(validConfig)

    expect(result.outlineJson).toBeDefined()
    const parsed = OutlineNodeSchema.safeParse(result.outlineJson)
    expect(parsed.success).toBe(true)
  })

  it('returns outlineXml as string', async () => {
    mockFetchSuccess()
    const result = await orchestrate(validConfig)

    expect(typeof result.outlineXml).toBe('string')
    expect(result.outlineXml).toContain('<frame')
  })

  it('returns contextMd as string', async () => {
    mockFetchSuccess()
    const result = await orchestrate(validConfig)

    expect(typeof result.contextMd).toBe('string')
    expect(result.contextMd).toContain('## Source')
  })
})

describe('orchestrate + writeOutput integration', () => {
  let outputDirectory: string

  beforeEach(() => {
    outputDirectory = join(
      tmpdir(),
      `figma-fetch-integration-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`,
    )
  })

  afterEach(async () => {
    await rm(outputDirectory, { recursive: true, force: true })
  })

  it('writes complete artifact bundle to disk', async () => {
    mockFetchSuccess()
    const config = resolveConfig({
      url: 'https://www.figma.com/design/abc123/MyFile?node-id=0-1',
      token: 'test-token',
      outputDir: outputDirectory,
      cacheEnabled: false,
      expansionEnabled: false,
    })
    const result = await orchestrate(config)
    await writeOutput(config.outputDir, result)

    // manifest.json exists and validates
    const manifestContent = await readFile(
      join(outputDirectory, 'manifest.json'),
      'utf-8',
    )
    const manifest: unknown = JSON.parse(manifestContent)
    expect(ManifestSchema.safeParse(manifest).success).toBe(true)

    // raw-node.json exists
    const rawNodeStat = await stat(
      join(outputDirectory, 'structure', 'raw-node.json'),
    )
    expect(rawNodeStat.isFile()).toBe(true)

    // normalized-node.json exists
    const normStat = await stat(
      join(outputDirectory, 'structure', 'normalized-node.json'),
    )
    expect(normStat.isFile()).toBe(true)

    // outline.json exists
    const outlineJsonStat = await stat(
      join(outputDirectory, 'structure', 'outline.json'),
    )
    expect(outlineJsonStat.isFile()).toBe(true)

    // outline.xml exists
    const outlineXmlStat = await stat(
      join(outputDirectory, 'structure', 'outline.xml'),
    )
    expect(outlineXmlStat.isFile()).toBe(true)

    // context.md exists
    const contextMdStat = await stat(join(outputDirectory, 'context.md'))
    expect(contextMdStat.isFile()).toBe(true)

    // image file exists
    const imageStat = await stat(join(outputDirectory, 'visual', '0:1.png'))
    expect(imageStat.isFile()).toBe(true)

    // tokens-used.json exists and validates
    const tokensContent = await readFile(
      join(outputDirectory, 'tokens', 'tokens-used.json'),
      'utf-8',
    )
    const tokensData: unknown = JSON.parse(tokensContent)
    expect(TokensUsedSummarySchema.safeParse(tokensData).success).toBe(true)

    // all subdirs exist
    for (const subdir of ['visual', 'structure', 'tokens', 'assets', 'logs']) {
      const subdirStat = await stat(join(outputDirectory, subdir))
      expect(subdirStat.isDirectory()).toBe(true)
    }
  })

  it('writes manifest with errors when image fails', async () => {
    mockFetchImageFailure()
    const config = resolveConfig({
      url: 'https://www.figma.com/design/abc123/MyFile?node-id=0-1',
      token: 'test-token',
      outputDir: outputDirectory,
      cacheEnabled: false,
      expansionEnabled: false,
    })
    const result = await orchestrate(config)
    await writeOutput(config.outputDir, result)

    const manifestContent = await readFile(
      join(outputDirectory, 'manifest.json'),
      'utf-8',
    )
    const manifest: unknown = JSON.parse(manifestContent)
    const parsed = ManifestSchema.safeParse(manifest)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.errors).toHaveLength(1)
    }

    // raw-node.json still written
    const rawNodeStat = await stat(
      join(outputDirectory, 'structure', 'raw-node.json'),
    )
    expect(rawNodeStat.isFile()).toBe(true)

    // no image file
    await expect(
      stat(join(outputDirectory, 'visual', '0:1.png')),
    ).rejects.toThrow()
  })
})

// --- Expansion tests ---

// A shallow tree: Frame with two childless containers at depth 2
const SHALLOW_NODES_RESPONSE = {
  name: 'Test File',
  lastModified: '2026-03-10T00:00:00Z',
  version: '12345',
  nodes: {
    '0:1': {
      document: {
        id: '0:1', name: 'Root', type: 'FRAME',
        children: [
          { id: '1:1', name: 'Card', type: 'FRAME', children: [
            { id: '2:1', name: 'Header', type: 'FRAME' },
            { id: '2:2', name: 'Body', type: 'FRAME' },
          ] },
        ],
      },
      components: {},
      schemaVersion: 0,
    },
  },
}

// Expanded subtree for node 2:1 (Header)
const EXPANDED_HEADER_RESPONSE = {
  name: 'Test File',
  lastModified: '2026-03-10T00:00:00Z',
  version: '12345',
  nodes: {
    '2:1': {
      document: {
        id: '2:1', name: 'Header', type: 'FRAME',
        children: [
          { id: '3:1', name: 'Title', type: 'TEXT' },
        ],
      },
      components: {},
      schemaVersion: 0,
    },
  },
}

// Expanded subtree for node 2:2 (Body)
const EXPANDED_BODY_RESPONSE = {
  name: 'Test File',
  lastModified: '2026-03-10T00:00:00Z',
  version: '12345',
  nodes: {
    '2:2': {
      document: {
        id: '2:2', name: 'Body', type: 'FRAME',
        children: [
          { id: '3:2', name: 'Content', type: 'TEXT' },
        ],
      },
      components: {},
      schemaVersion: 0,
    },
  },
}

const NODE_EXPANSION_ROUTES: Record<string, unknown> = {
  '0': SHALLOW_NODES_RESPONSE,
  '2:1': EXPANDED_HEADER_RESPONSE,
  '2:2': EXPANDED_BODY_RESPONSE,
}

function matchNodeRoute(url: string, routes: Record<string, unknown>): Response | null {
  for (const [key, value] of Object.entries(routes)) {
    const encoded = key.replace(':', '%3A')
    const dashed = key.replace(':', '-')
    if (url.includes(encoded) || url.includes(dashed)) {
      return new Response(JSON.stringify(value))
    }
  }
  return null
}

function routeImageAndCdn(url: string): Response | null {
  if (url.includes('/v1/images/')) {
    return new Response(JSON.stringify(MOCK_IMAGES_RESPONSE))
  }
  if (url.includes('figma-cdn.example.com')) {
    return new Response(MOCK_IMAGE_BINARY)
  }
  return null
}

function mockFetchWithExpansion(): void {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/nodes')) {
      const matched = matchNodeRoute(url, NODE_EXPANSION_ROUTES)
      if (matched !== null) {
        return Promise.resolve(matched)
      }
    }
    return Promise.resolve(routeImageAndCdn(url) ?? new Response('Not Found', { status: 404 }))
  }))
}

function mockFetchExpansionFailure(): void {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/nodes')) {
      const initial = matchNodeRoute(url, { '0': SHALLOW_NODES_RESPONSE })
      if (initial !== null) {
        return Promise.resolve(initial)
      }
      return Promise.resolve(new Response('Forbidden', { status: 403 }))
    }
    return Promise.resolve(routeImageAndCdn(url) ?? new Response('Not Found', { status: 404 }))
  }))
}

const expansionConfig: FetchConfig = resolveConfig({
  url: 'https://www.figma.com/design/abc123/MyFile?node-id=0-1',
  token: 'test-token',
  depth: 2,
  expansionEnabled: true,
  cacheEnabled: false,
})

describe('orchestrate expansion loop (VT-034)', () => {
  it('triggers expansion for depth-truncated containers and merges results', async () => {
    mockFetchWithExpansion()
    const result = await orchestrate(expansionConfig)

    expect(result.expansion).not.toBeNull()
    expect(result.expansion?.totalExecuted).toBeGreaterThan(0)

    // Merged tree should contain expanded children
    const card = result.normalizedNode.children[0]
    expect(card).toBeDefined()
    if (card !== undefined) {
      // Header should now have children from expansion
      const header = card.children[0]
      expect(header).toBeDefined()
      if (header !== undefined) {
        expect(header.children.length).toBeGreaterThan(0)
      }
    }
  })

  it('re-normalizes after merge', async () => {
    mockFetchWithExpansion()
    const result = await orchestrate(expansionConfig)

    // The normalizedNode should reflect the expanded tree
    expect(result.normalizedNode.id).toBe('0:1')
    // Expanded tree has more nodes than the shallow 3-node tree
    expect(result.normalizedNode.children.length).toBeGreaterThan(0)
  })
})

describe('expansion disabled regression (VT-035)', () => {
  it('produces identical result shape when expansion disabled', async () => {
    mockFetchSuccess()
    const disabledConfig = resolveConfig({
      url: 'https://www.figma.com/design/abc123/MyFile?node-id=0-1',
      token: 'test-token',
      expansionEnabled: false,
      cacheEnabled: false,
    })
    const result = await orchestrate(disabledConfig)

    expect(result.expansion).toBeNull()
    expect(result.normalizedNode).toBeDefined()
    expect(result.manifest).toBeDefined()
    expect(result.tokensUsed).toBeDefined()
  })

  it('matches pre-DE-006 output structure', async () => {
    mockFetchSuccess()
    const config = resolveConfig({
      url: 'https://www.figma.com/design/abc123/MyFile?node-id=0-1',
      token: 'test-token',
      expansionEnabled: false,
      cacheEnabled: false,
    })
    const result = await orchestrate(config)

    expect(result.rawNode).toEqual({
      id: '0:1', name: 'Frame', type: 'FRAME', children: [],
    })
    expect(result.manifest.source.version).toBe('12345')
  })
})

describe('failed expansion fetch resilience (VT-036)', () => {
  it('continues pipeline when expansion fetch fails', async () => {
    mockFetchExpansionFailure()
    const result = await orchestrate(expansionConfig)

    // Pipeline should complete despite expansion failures
    expect(result.normalizedNode).toBeDefined()
    expect(result.manifest).toBeDefined()
    expect(result.expansion).not.toBeNull()

    // All expansions should be recorded as failed
    if (result.expansion !== null) {
      for (const executed of result.expansion.executed) {
        expect(executed.success).toBe(false)
        expect(executed.error).toBeDefined()
      }
    }
  })

  it('preserves original subtree on failed expansion', async () => {
    mockFetchExpansionFailure()
    const result = await orchestrate(expansionConfig)

    // Original tree structure preserved — Header/Body still childless
    const card = result.normalizedNode.children[0]
    expect(card).toBeDefined()
    if (card !== undefined) {
      const header = card.children[0]
      expect(header).toBeDefined()
      if (header !== undefined) {
        expect(header.children).toHaveLength(0)
      }
    }
  })
})

describe('expansion maxTargets bound (VT-037)', () => {
  it('limits expansion targets to maxExpansionTargets', async () => {
    mockFetchWithExpansion()
    const limitedConfig = resolveConfig({
      url: 'https://www.figma.com/design/abc123/MyFile?node-id=0-1',
      token: 'test-token',
      depth: 2,
      expansionEnabled: true,
      maxExpansionTargets: 1,
      cacheEnabled: false,
    })
    const result = await orchestrate(limitedConfig)

    expect(result.expansion).not.toBeNull()
    if (result.expansion !== null) {
      expect(result.expansion.totalExecuted).toBeLessThanOrEqual(1)
      expect(result.expansion.skipped.length).toBeGreaterThan(0)
    }
  })
})

describe('asset export pipeline (VT-038)', () => {
  it('populates manifest.outputs.assets when exportable nodes exist', async () => {
    mockFetchWithAssets()
    const config = resolveConfig({
      url: 'https://www.figma.com/design/abc123/MyFile?node-id=0-1',
      token: 'test-token',
      cacheEnabled: false,
      expansionEnabled: false,
    })
    const result = await orchestrate(config)

    expect(result.manifest.outputs.assets.length).toBeGreaterThan(0)
    for (const assetPath of result.manifest.outputs.assets) {
      expect(assetPath).toMatch(/^assets\//)
    }
  })

  it('returns fetched assets in result', async () => {
    mockFetchWithAssets()
    const config = resolveConfig({
      url: 'https://www.figma.com/design/abc123/MyFile?node-id=0-1',
      token: 'test-token',
      cacheEnabled: false,
      expansionEnabled: false,
    })
    const result = await orchestrate(config)

    expect(result.assets.length).toBeGreaterThan(0)
    for (const asset of result.assets) {
      expect(asset.buffer).toBeInstanceOf(Buffer)
      expect(asset.target.nodeId).toBe('5:1')
    }
  })

  it('produces empty assets when maxAssets is 0', async () => {
    mockFetchWithAssets()
    const config = resolveConfig({
      url: 'https://www.figma.com/design/abc123/MyFile?node-id=0-1',
      token: 'test-token',
      cacheEnabled: false,
      expansionEnabled: false,
      maxAssets: 0,
    })
    const result = await orchestrate(config)

    expect(result.manifest.outputs.assets).toHaveLength(0)
    expect(result.assets).toHaveLength(0)
  })

  it('produces empty assets when no exportable nodes exist', async () => {
    mockFetchSuccess()
    const result = await orchestrate(validConfig)

    expect(result.manifest.outputs.assets).toHaveLength(0)
    expect(result.assets).toHaveLength(0)
  })
})
