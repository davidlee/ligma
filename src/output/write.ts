import { join } from 'node:path'

import { ensureDirectory, writeBinaryFile, writeJsonFile } from '../util/fs.js'

import type { FetchImageResult } from '../figma/fetch-image.js'
import type { Manifest } from '../schemas/manifest.js'
import type { TokensUsedSummary } from '../schemas/tokens-used.js'

export interface OutputArtifacts {
  readonly manifest: Manifest
  readonly rawNode: unknown
  readonly tokensUsed?: TokensUsedSummary | undefined
  readonly image?: FetchImageResult | undefined
}

const SUBDIRS = ['visual', 'structure', 'tokens', 'assets', 'logs'] as const

export async function writeOutput(
  outputDirectory: string,
  artifacts: OutputArtifacts,
): Promise<void> {
  await createDirectoryStructure(outputDirectory)
  await writeManifest(outputDirectory, artifacts.manifest)
  await writeRawNode(outputDirectory, artifacts.rawNode)

  if (artifacts.tokensUsed !== undefined) {
    await writeTokensUsed(outputDirectory, artifacts.tokensUsed)
  }

  if (artifacts.image !== undefined) {
    await writeImage(outputDirectory, artifacts)
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
