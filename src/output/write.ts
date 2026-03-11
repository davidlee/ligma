import { join } from 'node:path'

import { assetFileName } from '../assets/collect.js'
import { ensureDirectory, writeBinaryFile, writeJsonFile, writeTextFile } from '../util/fs.js'

import type { FetchedAsset } from '../assets/fetch.js'
import type { FetchImageResult } from '../figma/fetch-image.js'
import type { Manifest } from '../schemas/manifest.js'
import type { NormalizedNode } from '../schemas/normalized.js'
import type { OutlineNode } from '../schemas/outline.js'
import type { TokensUsedSummary } from '../schemas/tokens-used.js'

export interface OutputArtifacts {
  readonly manifest: Manifest
  readonly rawNode: unknown
  readonly normalizedNode: NormalizedNode
  readonly outlineJson: OutlineNode
  readonly outlineXml: string
  readonly contextMd: string
  readonly tokensUsed: TokensUsedSummary
  readonly image?: FetchImageResult | undefined
  readonly assets?: readonly FetchedAsset[] | undefined
}

const SUBDIRS = ['visual', 'structure', 'tokens', 'assets', 'logs'] as const

export async function writeOutput(
  outputDirectory: string,
  artifacts: OutputArtifacts,
): Promise<void> {
  await createDirectoryStructure(outputDirectory)
  await writeManifest(outputDirectory, artifacts.manifest)
  await writeRawNode(outputDirectory, artifacts.rawNode)
  await writeNormalizedNode(outputDirectory, artifacts.normalizedNode)
  await writeOutlineJson(outputDirectory, artifacts.outlineJson)
  await writeOutlineXml(outputDirectory, artifacts.outlineXml)
  await writeContextMd(outputDirectory, artifacts.contextMd)
  await writeTokensUsed(outputDirectory, artifacts.tokensUsed)

  if (artifacts.image !== undefined) {
    await writeImage(outputDirectory, artifacts)
  }

  if (artifacts.assets !== undefined && artifacts.assets.length > 0) {
    await writeAssets(outputDirectory, artifacts.assets)
  }
}

async function createDirectoryStructure(outputDirectory: string): Promise<void> {
  for (const subdir of SUBDIRS) {
    await ensureDirectory(join(outputDirectory, subdir))
  }
}

async function writeManifest(
  outputDirectory: string,
  manifest: Manifest,
): Promise<void> {
  await writeJsonFile(join(outputDirectory, 'manifest.json'), manifest)
}

async function writeRawNode(
  outputDirectory: string,
  rawNode: unknown,
): Promise<void> {
  await writeJsonFile(join(outputDirectory, 'structure', 'raw-node.json'), rawNode)
}

async function writeNormalizedNode(
  outputDirectory: string,
  normalizedNode: NormalizedNode,
): Promise<void> {
  await writeJsonFile(join(outputDirectory, 'structure', 'normalized-node.json'), normalizedNode)
}

async function writeOutlineJson(
  outputDirectory: string,
  outline: OutlineNode,
): Promise<void> {
  await writeJsonFile(join(outputDirectory, 'structure', 'outline.json'), outline)
}

async function writeOutlineXml(
  outputDirectory: string,
  xml: string,
): Promise<void> {
  await writeTextFile(join(outputDirectory, 'structure', 'outline.xml'), xml)
}

async function writeContextMd(
  outputDirectory: string,
  contextMd: string,
): Promise<void> {
  await writeTextFile(join(outputDirectory, 'context.md'), contextMd)
}

async function writeTokensUsed(
  outputDirectory: string,
  tokensUsed: TokensUsedSummary,
): Promise<void> {
  await writeJsonFile(join(outputDirectory, 'tokens', 'tokens-used.json'), tokensUsed)
}

async function writeImage(
  outputDirectory: string,
  artifacts: OutputArtifacts,
): Promise<void> {
  const image = artifacts.image
  if (image === undefined) {
    return
  }
  const nodeId = artifacts.manifest.source.nodeId
  const fileName = `${nodeId}.${image.format}`
  await writeBinaryFile(join(outputDirectory, 'visual', fileName), image.buffer)
}

async function writeAssets(
  outputDirectory: string,
  assets: readonly FetchedAsset[],
): Promise<void> {
  for (const asset of assets) {
    const fileName = assetFileName(asset.target, asset.format)
    await writeBinaryFile(join(outputDirectory, 'assets', fileName), asset.buffer)
  }
}
