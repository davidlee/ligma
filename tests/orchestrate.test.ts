import { readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveConfig } from '../src/config.js'
import { FigmaAuthError, FigmaUrlParseError } from '../src/errors.js'
import { orchestrate } from '../src/orchestrate.js'
import { writeOutput } from '../src/output/write.js'
import { ManifestSchema } from '../src/schemas/manifest.js'
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

const validConfig: FetchConfig = resolveConfig({
  url: 'https://www.figma.com/design/abc123/MyFile?node-id=0-1',
  token: 'test-token',
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
    expect(result.manifest.outputs.tokensUsedJson).toBe('tokens/tokens-used.json')
    expect(result.manifest.outputs.png).toBe('visual/0:1.png')
  })

  it('sets svg output path when format is svg', async () => {
    mockFetchSuccess()
    const config = resolveConfig({
      url: 'https://www.figma.com/design/abc123/MyFile?node-id=0-1',
      token: 'test-token',
      format: 'svg',
    })
    const result = await orchestrate(config)
    expect(result.manifest.outputs.svg).toBe('visual/0:1.svg')
    expect(result.manifest.outputs.png).toBeUndefined()
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
