import type { AssetKind, NormalizedNode } from '../schemas/normalized.js'

export interface ExportTarget {
  readonly nodeId: string
  readonly nodeName: string
  readonly kind: AssetKind
  readonly reason: string | null
}

const KIND_PRIORITY: Record<AssetKind, number> = {
  bitmap: 0,
  svg: 1,
  mixed: 1,
}

export function collectExportTargets(
  root: NormalizedNode,
  maxAssets: number,
): ExportTarget[] {
  if (maxAssets <= 0) {
    return []
  }

  const candidates: ExportTarget[] = []
  walkTree(root, (node) => {
    if (node.asset?.exportSuggested === true) {
      candidates.push({
        nodeId: node.id,
        nodeName: node.name,
        kind: node.asset.kind,
        reason: node.asset.reason,
      })
    }
  })

  candidates.sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind])

  return candidates.slice(0, maxAssets)
}

export interface AssetListEntry {
  readonly nodeId: string
  readonly name: string
  readonly format: string
  readonly reason: string | null
}

const KIND_TO_FORMAT: Record<AssetKind, string> = {
  bitmap: 'png',
  svg: 'svg',
  mixed: 'png,svg',
}

export function toAssetListEntry(target: ExportTarget): AssetListEntry {
  return {
    nodeId: target.nodeId,
    name: target.nodeName,
    format: KIND_TO_FORMAT[target.kind],
    reason: target.reason,
  }
}

export function assetFileName(target: ExportTarget, format: 'png' | 'svg'): string {
  const sanitized = sanitizeName(target.nodeName)
  const idSlug = target.nodeId.replaceAll(':', '-')
  return `${sanitized}-${idSlug}.${format}`
}

export function sanitizeName(name: string): string {
  const result = name
    .toLowerCase()
    .replaceAll(/[^a-z0-9-]/g, '-')
    .replaceAll(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
  return result === '' ? 'asset' : result
}

function walkTree(node: NormalizedNode, visitor: (n: NormalizedNode) => void): void {
  visitor(node)
  for (const child of node.children) {
    walkTree(child, visitor)
  }
}
