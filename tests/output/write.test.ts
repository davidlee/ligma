import { readFile, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildManifest } from '../../src/output/manifest.js'
import { writeOutput } from '../../src/output/write.js'
import { ManifestSchema } from '../../src/schemas/manifest.js'

import type { FetchedAsset } from '../../src/assets/fetch.js'
import type { OutputArtifacts } from '../../src/output/write.js'
import type { NormalizedNode } from '../../src/schemas/normalized.js'
import type { OutlineNode } from '../../src/schemas/outline.js'
import type { TokensUsedSummary } from '../../src/schemas/tokens-used.js'

let outputDirectory: string

beforeEach(() => {
  outputDirectory = join(
    tmpdir(),
    `figma-fetch-write-test-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`,
  )
})

afterEach(async () => {
  await rm(outputDirectory, { recursive: true, force: true })
})

const STUB_NORMALIZED: NormalizedNode = {
  id: '0:1',
  name: 'Frame',
  type: 'frame',
  role: null,
  visible: true,
  bounds: null,
  rotation: null,
  hierarchy: { parentId: null, depth: 0, childCount: 0, path: [] },
  layout: null,
  appearance: null,
  text: null,
  component: null,
  variables: null,
  asset: null,
  interactions: null,
  semantics: {
    likelyInteractive: false,
    likelyTextInput: false,
    likelyIcon: false,
    likelyImage: false,
    likelyMask: false,
    likelyReusableComponent: false,
  },
  children: [],
  diagnostics: {
    sourceNodeType: 'FRAME',
    omittedFields: [],
    warnings: [],
    confidence: 'high',
  },
}

const STUB_OUTLINE: OutlineNode = {
  id: '0:1',
  name: 'Frame',
  type: 'frame',
  role: null,
  visible: true,
  bounds: null,
  childCount: 0,
  children: [],
}

const STUB_TOKENS: TokensUsedSummary = {
  scope: { fileKey: 'abc123', rootNodeId: '0:1', isFullInventory: false as const },
  variables: [],
  styles: [],
  counts: { colors: 0, typography: 0, numbers: 0, other: 0 },
}

const REQUIRED_OUTPUTS = {
  rawNodeJson: 'structure/raw-node.json',
  normalizedNodeJson: 'structure/normalized-node.json',
  outlineJson: 'structure/outline.json',
  outlineXml: 'structure/outline.xml',
  contextMd: 'context.md',
  tokensUsedJson: 'tokens/tokens-used.json',
}

function makeArtifacts(
  overrides?: Partial<OutputArtifacts>,
): OutputArtifacts {
  const manifest = buildManifest({
    source: { fileKey: 'abc123', nodeId: '0:1' },
    outputs: {
      ...REQUIRED_OUTPUTS,
      png: 'visual/0:1.png',
      assets: [],
    },
    errors: [],
  })
  return {
    manifest,
    rawNode: { id: '0:1', name: 'Frame', type: 'FRAME' },
    normalizedNode: STUB_NORMALIZED,
    outlineJson: STUB_OUTLINE,
    outlineXml: '<frame id="0:1" name="Frame" child-count="0" />',
    contextMd: '## Source\n- File key: abc123\n',
    tokensUsed: STUB_TOKENS,
    image: {
      format: 'png' as const,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      sourceUrl: 'https://example.com/image.png',
    },
    ...overrides,
  }
}

describe('writeOutput', () => {
  it('creates all required subdirectories', async () => {
    const artifacts = makeArtifacts()
    await writeOutput(outputDirectory, artifacts)

    for (const subdir of ['visual', 'structure', 'tokens', 'assets', 'logs']) {
      const directoryStat = await stat(join(outputDirectory, subdir))
      expect(directoryStat.isDirectory()).toBe(true)
    }
  })

  it('writes manifest.json at the output root', async () => {
    const artifacts = makeArtifacts()
    await writeOutput(outputDirectory, artifacts)

    const content = await readFile(join(outputDirectory, 'manifest.json'), 'utf-8')
    const parsed: unknown = JSON.parse(content)
    const result = ManifestSchema.safeParse(parsed)
    expect(result.success).toBe(true)
  })

  it('writes raw-node.json in structure/', async () => {
    const rawNode = { id: '0:1', name: 'TestFrame', type: 'FRAME', children: [] }
    const artifacts = makeArtifacts({ rawNode })
    await writeOutput(outputDirectory, artifacts)

    const content = await readFile(
      join(outputDirectory, 'structure', 'raw-node.json'),
      'utf-8',
    )
    expect(JSON.parse(content)).toEqual(rawNode)
  })

  it('writes normalized-node.json in structure/', async () => {
    const artifacts = makeArtifacts()
    await writeOutput(outputDirectory, artifacts)

    const content = await readFile(
      join(outputDirectory, 'structure', 'normalized-node.json'),
      'utf-8',
    )
    expect(content).toContain('"id"')
    expect(content).toContain('"0:1"')
  })

  it('writes outline.json in structure/', async () => {
    const artifacts = makeArtifacts()
    await writeOutput(outputDirectory, artifacts)

    const content = await readFile(
      join(outputDirectory, 'structure', 'outline.json'),
      'utf-8',
    )
    expect(content).toContain('"id"')
    expect(content).toContain('"0:1"')
  })

  it('writes outline.xml in structure/', async () => {
    const artifacts = makeArtifacts()
    await writeOutput(outputDirectory, artifacts)

    const content = await readFile(
      join(outputDirectory, 'structure', 'outline.xml'),
      'utf-8',
    )
    expect(content).toContain('<frame')
  })

  it('writes context.md at output root', async () => {
    const artifacts = makeArtifacts()
    await writeOutput(outputDirectory, artifacts)

    const content = await readFile(join(outputDirectory, 'context.md'), 'utf-8')
    expect(content).toContain('## Source')
  })

  it('writes tokens-used.json in tokens/', async () => {
    const artifacts = makeArtifacts()
    await writeOutput(outputDirectory, artifacts)

    const content = await readFile(
      join(outputDirectory, 'tokens', 'tokens-used.json'),
      'utf-8',
    )
    expect(content).toContain('"scope"')
  })

  it('writes image file in visual/ with correct name', async () => {
    const artifacts = makeArtifacts()
    await writeOutput(outputDirectory, artifacts)

    const imageData = await readFile(join(outputDirectory, 'visual', '0:1.png'))
    expect(Buffer.compare(imageData, Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(0)
  })

  it('writes svg image with .svg extension', async () => {
    const manifest = buildManifest({
      source: { fileKey: 'abc123', nodeId: '0:2' },
      outputs: {
        ...REQUIRED_OUTPUTS,
        svg: 'visual/0:2.svg',
        assets: [],
      },
      errors: [],
    })
    const artifacts: OutputArtifacts = {
      manifest,
      rawNode: { id: '0:2' },
      normalizedNode: { ...STUB_NORMALIZED, id: '0:2' },
      outlineJson: { ...STUB_OUTLINE, id: '0:2' },
      outlineXml: '<frame id="0:2" name="Frame" child-count="0" />',
      contextMd: '## Source\n',
      tokensUsed: STUB_TOKENS,
      image: {
        format: 'svg',
        buffer: Buffer.from('<svg></svg>'),
        sourceUrl: 'https://example.com/image.svg',
      },
    }
    await writeOutput(outputDirectory, artifacts)

    const svgContent = await readFile(join(outputDirectory, 'visual', '0:2.svg'), 'utf-8')
    expect(svgContent).toBe('<svg></svg>')
  })

  it('omits image file when image is undefined', async () => {
    const artifacts = makeArtifacts({ image: undefined })
    await writeOutput(outputDirectory, artifacts)

    const directoryStat = await stat(join(outputDirectory, 'visual'))
    expect(directoryStat.isDirectory()).toBe(true)

    await expect(
      stat(join(outputDirectory, 'visual', '0:1.png')),
    ).rejects.toThrow()
  })

  it('writes pretty-printed JSON', async () => {
    const artifacts = makeArtifacts()
    await writeOutput(outputDirectory, artifacts)

    const content = await readFile(join(outputDirectory, 'manifest.json'), 'utf-8')
    expect(content).toContain('\n  ')
    expect(content.endsWith('\n')).toBe(true)
  })
})

describe('writeOutput — asset writing', () => {
  const STUB_ASSETS: readonly FetchedAsset[] = [
    {
      target: { nodeId: '10:1', nodeName: 'Logo', kind: 'bitmap' },
      format: 'png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    },
    {
      target: { nodeId: '10:2', nodeName: 'Icon/Star', kind: 'svg' },
      format: 'svg',
      buffer: Buffer.from('<svg></svg>'),
    },
  ]

  it('writes assets to assets/ with correct filenames', async () => {
    const artifacts = makeArtifacts({ assets: STUB_ASSETS })
    await writeOutput(outputDirectory, artifacts)

    const pngData = await readFile(join(outputDirectory, 'assets', 'logo-10-1.png'))
    expect(Buffer.compare(pngData, Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(0)

    const svgData = await readFile(join(outputDirectory, 'assets', 'icon-star-10-2.svg'), 'utf-8')
    expect(svgData).toBe('<svg></svg>')
  })

  it('writes no asset files when assets array is empty', async () => {
    const artifacts = makeArtifacts({ assets: [] })
    await writeOutput(outputDirectory, artifacts)

    const files = await readdir(join(outputDirectory, 'assets'))
    expect(files).toHaveLength(0)
  })

  it('writes no asset files when assets is undefined', async () => {
    const artifacts = makeArtifacts({ assets: undefined })
    await writeOutput(outputDirectory, artifacts)

    const files = await readdir(join(outputDirectory, 'assets'))
    expect(files).toHaveLength(0)
  })
})
