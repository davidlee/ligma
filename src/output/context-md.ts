import type { Manifest } from '../schemas/manifest.js'
import type { NormalizedNode } from '../schemas/normalized.js'
import type { OutlineNode } from '../schemas/outline.js'
import type { TokensUsedSummary } from '../schemas/tokens-used.js'

export interface ContextMdInput {
  node: NormalizedNode
  manifest: Manifest
  tokensUsed: TokensUsedSummary
  outline: OutlineNode
  hiddenNodesOmitted: number
}

type SectionGenerator = (input: ContextMdInput) => string | null
type NoteGenerator = (input: ContextMdInput) => string | null

export function generateContextMd(input: ContextMdInput): string {
  const sections = SECTION_GENERATORS
    .map(gen => gen(input))
    .filter((s): s is string => s !== null)

  return sections.join('\n\n') + '\n'
}

// --- Section generators ---

const SECTION_GENERATORS: SectionGenerator[] = [
  sourceSection,
  visualReferenceSection,
  structuralSummarySection,
  importantChildrenSection,
  tokensUsedSection,
  assetsSection,
  implementationNotesSection,
]

function sourceSection(input: ContextMdInput): string | null {
  const { source } = input.manifest
  const lines: string[] = ['## Source']
  lines.push(`- File key: ${source.fileKey}`)
  lines.push(`- Node ID: ${source.nodeId}`)
  if (source.fileName !== undefined) {
    lines.push(`- File name: ${source.fileName}`)
  }
  if (source.version !== undefined) {
    lines.push(`- Version: ${source.version}`)
  }
  return lines.join('\n')
}

function visualReferenceSection(input: ContextMdInput): string | null {
  const { outputs } = input.manifest
  if (outputs.png === undefined && outputs.svg === undefined) {
    return null
  }
  const path = outputs.png ?? outputs.svg ?? ''
  return `## Visual reference\nUse ./${path} as the visual source of truth.`
}

function structuralSummarySection(input: ContextMdInput): string | null {
  const { node, outline, hiddenNodesOmitted } = input
  const lines: string[] = ['## Structural summary']

  const rolePart = node.role !== null ? `, role ${node.role}` : ''
  lines.push(`- Root: ${node.type}${rolePart}`)

  if (node.bounds !== null) {
    lines.push(`- Size: ${String(node.bounds.width)}\u00D7${String(node.bounds.height)}`)
  }

  if (node.layout !== null && node.layout.mode !== 'none') {
    lines.push(`- Layout: ${formatLayoutLine(node)}`)
  }

  const total = node.hierarchy.childCount
  const shown = outline.children.length
  const hidden = hiddenNodesOmitted
  if (total > 0) {
    lines.push(`- Children: ${String(total)} total, ${String(shown)} shown in outline, ${String(hidden)} hidden`)
  }

  return lines.join('\n')
}

function formatLayoutLine(node: NormalizedNode): string {
  const parts: string[] = []
  if (node.layout === null) {return ''}

  parts.push(`${node.layout.mode} auto-layout`)

  if (node.layout.gap !== null) {
    parts.push(`gap ${String(node.layout.gap)}`)
  }

  if (node.layout.padding !== null) {
    const p = node.layout.padding
    parts.push(`padding ${String(p.top)}/${String(p.right)}/${String(p.bottom)}/${String(p.left)}`)
  }

  return parts.join(', ')
}

// --- Important children (DEC-022) ---

const ROLE_TIERS: Record<string, number> = {
  heading: 1, input: 1, button: 1, 'icon-button': 1,
  image: 2, icon: 2, card: 2, badge: 2, avatar: 2,
  stack: 3, grid: 3, list: 3, 'list-item': 3,
  navigation: 3, modal: 3, container: 3, divider: 3,
}

const IMPORTANT_CHILDREN_CAP = 8

function importantChildrenSection(input: ContextMdInput): string | null {
  const visibleChildren = input.node.children.filter(c => c.visible)
  if (visibleChildren.length === 0) {return null}

  const sorted = visibleChildren
    .map((child, index) => ({ child, index }))
    .sort((a, b) => {
      const tierA = a.child.role !== null ? (ROLE_TIERS[a.child.role] ?? 4) : 4
      const tierB = b.child.role !== null ? (ROLE_TIERS[b.child.role] ?? 4) : 4
      if (tierA !== tierB) {return tierA - tierB}
      return a.index - b.index
    })

  const capped = sorted.slice(0, IMPORTANT_CHILDREN_CAP)
  const remaining = sorted.length - capped.length

  const lines: string[] = ['## Important children']
  for (const [index, entry] of capped.entries()) {
    const label = entry.child.role ?? entry.child.type
    lines.push(`${String(index + 1)}. ${entry.child.name} (${label})`)
  }

  if (remaining > 0) {
    lines.push(`\u2026 and ${String(remaining)} more children`)
  }

  return lines.join('\n')
}

// --- Tokens used ---

const TOKENS_CAP = 15

function tokensUsedSection(input: ContextMdInput): string | null {
  const { tokensUsed } = input
  const refs = tokensUsed.variables

  if (refs.length === 0) {return null}

  const hasNames = refs.some(r => r.tokenName !== null)

  if (!hasNames) {
    const typeSkew = formatTypeSkew(tokensUsed)
    const skewPart = typeSkew !== '' ? `; ${typeSkew}` : ''
    return `## Tokens used\n${String(refs.length)} token references detected (names unresolved${skewPart})`
  }

  const lines: string[] = ['## Tokens used']
  const capped = refs.slice(0, TOKENS_CAP)
  for (const ref of capped) {
    lines.push(`- ${ref.tokenName ?? ref.tokenId}`)
  }
  if (refs.length > TOKENS_CAP) {
    lines.push(`\u2026 and ${String(refs.length - TOKENS_CAP)} more`)
  }
  return lines.join('\n')
}

function formatTypeSkew(summary: TokensUsedSummary): string {
  const parts: string[] = []
  if (summary.counts.colors > 0) {parts.push('color')}
  if (summary.counts.numbers > 0) {parts.push('number')}
  if (summary.counts.typography > 0) {parts.push('typography')}
  if (summary.counts.other > 0) {parts.push('other')}
  return parts.length > 0 ? `mostly ${parts.join('/')}` : ''
}

// --- Assets ---

const ASSETS_CAP = 10

function assetsSection(input: ContextMdInput): string | null {
  const exportable = collectExportableAssets(input.node)
  if (exportable.length === 0) {return null}

  const lines: string[] = ['## Assets']
  const capped = exportable.slice(0, ASSETS_CAP)
  for (const asset of capped) {
    lines.push(`- ${asset.name} (${asset.kind}, suggested export)`)
  }
  if (exportable.length > ASSETS_CAP) {
    lines.push(`\u2026 and ${String(exportable.length - ASSETS_CAP)} more`)
  }
  return lines.join('\n')
}

interface ExportableAsset {
  name: string
  kind: string
}

function collectExportableAssets(node: NormalizedNode): ExportableAsset[] {
  const result: ExportableAsset[] = []
  walkTree(node, n => {
    if (n.asset?.exportSuggested === true) {
      result.push({ name: n.name, kind: n.asset.kind })
    }
  })
  return result
}

function walkTree(node: NormalizedNode, visitor: (n: NormalizedNode) => void): void {
  visitor(node)
  for (const child of node.children) {
    walkTree(child, visitor)
  }
}

// --- Implementation notes (DEC-023) ---

const NOTE_GENERATORS: NoteGenerator[] = [
  layoutNote,
  componentNote,
  complexityNote,
  assetNote,
  interactionNote,
  truncationNote,
]

const NOTES_CAP = 5

function implementationNotesSection(input: ContextMdInput): string | null {
  const notes = NOTE_GENERATORS
    .map(gen => gen(input))
    .filter((n): n is string => n !== null)
    .slice(0, NOTES_CAP)

  if (notes.length === 0) {return null}

  const lines: string[] = ['## Implementation notes']
  for (const note of notes) {
    lines.push(`- ${note}`)
  }
  return lines.join('\n')
}

function layoutNote(input: ContextMdInput): string | null {
  const { layout } = input.node
  if (layout === null || layout.mode === 'none') {return null}

  const gapPart = layout.gap !== null ? ` with ${String(layout.gap)}px gap` : ''
  return `Prefer ${layout.mode} stack layout; root uses auto-layout${gapPart}`
}

function componentNote(input: ContextMdInput): string | null {
  const { component } = input.node
  if (component === null) {return null}

  const namePart = component.componentName !== null ? ` (${component.componentName})` : ''
  return `Root is a ${component.kind}${namePart}; treat as reusable`
}

function complexityNote(input: ContextMdInput): string | null {
  const maxDepth = computeMaxDepth(input.node)
  const childCount = input.node.hierarchy.childCount
  const tokenCount = input.tokensUsed.variables.length

  if (maxDepth <= 3 && childCount <= 12 && tokenCount <= 8) {return null}

  const reasons: string[] = []
  if (maxDepth > 3) {
    reasons.push(`${String(maxDepth)} levels deep`)
  }
  if (childCount > 12) {
    reasons.push(`${String(childCount)} children`)
  }
  if (tokenCount > 8) {
    reasons.push(`${String(tokenCount)} token references`)
  }

  return `Structure is moderately complex (${reasons.join(', ')}); implement incrementally`
}

function computeMaxDepth(node: NormalizedNode): number {
  let max = 0
  walkTree(node, n => {
    if (n.hierarchy.depth > max) {
      max = n.hierarchy.depth
    }
  })
  return max
}

function assetNote(input: ContextMdInput): string | null {
  const assets = collectExportableAssets(input.node)
  if (assets.length === 0) {return null}

  return `${String(assets.length)} node${assets.length === 1 ? '' : 's'} suggested for asset export; prefer exported assets over recreating vectors`
}

function interactionNote(input: ContextMdInput): string | null {
  let count = 0
  walkTree(input.node, n => {
    if (n.interactions !== null && n.interactions.length > 0) {
      count++
    }
  })
  if (count === 0) {return null}

  return `Contains ${String(count)} interactive element${count === 1 ? '' : 's'}; ensure event handlers are wired`
}

function truncationNote(input: ContextMdInput): string | null {
  if (input.hiddenNodesOmitted === 0) {return null}

  return `Outline omits ${String(input.hiddenNodesOmitted)} hidden node${input.hiddenNodesOmitted === 1 ? '' : 's'}; normalized JSON retains the full tree`
}
