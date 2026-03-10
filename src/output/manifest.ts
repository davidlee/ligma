import type { Manifest, ManifestError } from '../schemas/manifest.js'

export interface ManifestInput {
  readonly source: {
    readonly fileKey: string
    readonly nodeId: string
    readonly fileName?: string | undefined
    readonly version?: string | undefined
    readonly lastModified?: string | undefined
  }
  readonly outputs: {
    readonly rawNodeJson: string
    readonly tokensUsedJson?: string | undefined
    readonly png?: string | undefined
    readonly svg?: string | undefined
    readonly assets: readonly string[]
  }
  readonly errors: readonly ManifestError[]
}

/**
 * Builds a complete Manifest from core fetch results.
 * Fields not present in ManifestInput (normalizedNodeJson, outlineJson, etc.)
 * are omitted from output. Later deltas extend ManifestInput — not the builder.
 */
export function buildManifest(input: ManifestInput): Manifest {
  return {
    source: buildSource(input.source),
    outputs: buildOutputs(input.outputs),
    errors: [...input.errors],
  }
}

function buildSource(source: ManifestInput['source']): Manifest['source'] {
  const result: Manifest['source'] = {
    fileKey: source.fileKey,
    nodeId: source.nodeId,
  }
  if (source.fileName !== undefined) {
    result.fileName = source.fileName
  }
  if (source.version !== undefined) {
    result.version = source.version
  }
  if (source.lastModified !== undefined) {
    result.lastModified = source.lastModified
  }
  return result
}

function buildOutputs(outputs: ManifestInput['outputs']): Manifest['outputs'] {
  const result: Manifest['outputs'] = {
    rawNodeJson: outputs.rawNodeJson,
    assets: [...outputs.assets],
  }
  if (outputs.tokensUsedJson !== undefined) {
    result.tokensUsedJson = outputs.tokensUsedJson
  }
  if (outputs.png !== undefined) {
    result.png = outputs.png
  }
  if (outputs.svg !== undefined) {
    result.svg = outputs.svg
  }
  return result
}
