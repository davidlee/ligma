import type { ExportTarget } from './collect.js'
import type { ManifestError } from '../schemas/manifest.js'
import type { AssetKind } from '../schemas/normalized.js'

export interface FetchedAsset {
  readonly target: ExportTarget
  readonly format: 'png' | 'svg'
  readonly buffer: Buffer
}

export interface AssetFetchResult {
  readonly fetched: readonly FetchedAsset[]
  readonly errors: readonly ManifestError[]
}

export type ImageFetcher = (
  nodeId: string,
  format: 'png' | 'svg',
) => Promise<Buffer>

function formatsForKind(kind: AssetKind, formatOverride: 'png' | 'svg' | null): readonly ('png' | 'svg')[] {
  if (formatOverride !== null) {
    return [formatOverride]
  }
  switch (kind) {
    case 'bitmap': return ['png']
    case 'svg': return ['svg']
    case 'mixed': return ['png', 'svg']
  }
}

export async function fetchAssets(
  fetcher: ImageFetcher,
  targets: readonly ExportTarget[],
  formatOverride: 'png' | 'svg' | null,
): Promise<AssetFetchResult> {
  const fetched: FetchedAsset[] = []
  const errors: ManifestError[] = []

  for (const target of targets) {
    const formats = formatsForKind(target.kind, formatOverride)
    for (const format of formats) {
      try {
        const buffer = await fetcher(target.nodeId, format)
        fetched.push({ target, format, buffer })
      } catch (error) {
        errors.push({
          type: 'AssetExportError',
          message: error instanceof Error ? error.message : 'Unknown asset export error',
          nodeId: target.nodeId,
        })
      }
    }
  }

  return { fetched, errors }
}
