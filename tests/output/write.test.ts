import { readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildManifest } from '../../src/output/manifest.js'
import { writeOutput } from '../../src/output/write.js'
import { ManifestSchema } from '../../src/schemas/manifest.js'

import type { OutputArtifacts } from '../../src/output/write.js'

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

function makeArtifacts(
  overrides?: Partial<OutputArtifacts>,
): OutputArtifacts {
  const manifest = buildManifest({
    source: { fileKey: 'abc123', nodeId: '0:1' },
    outputs: {
      rawNodeJson: 'structure/raw-node.json',
      png: 'visual/0:1.png',
      assets: [],
    },
    errors: [],
  })
  return {
    manifest,
    rawNode: { id: '0:1', name: 'Frame', type: 'FRAME' },
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
        rawNodeJson: 'structure/raw-node.json',
        svg: 'visual/0:2.svg',
        assets: [],
      },
      errors: [],
    })
    const artifacts: OutputArtifacts = {
      manifest,
      rawNode: { id: '0:2' },
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

    // visual/ should exist but be empty
    const directoryStat = await stat(join(outputDirectory, 'visual'))
    expect(directoryStat.isDirectory()).toBe(true)

    // no image file written
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
