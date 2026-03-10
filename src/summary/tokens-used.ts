import type { NormalizedNode, NormalizedPaint, NormalizedStroke } from '../schemas/normalized.js'
import type { EncounteredLocation, TokenReference, TokensUsedSummary } from '../schemas/tokens-used.js'

type ResolvedType = TokenReference['resolvedType']

interface TokenAccumulator {
  tokenId: string
  tokenName: string | null
  collectionId: string | null
  resolvedType: ResolvedType
  encounteredOn: EncounteredLocation[]
  warnings: string[]
}

const SPECIFICITY: Record<ResolvedType, number> = {
  color: 3,
  number: 3,
  string: 3,
  boolean: 3,
  unknown: 0,
}

function resolveTypeConflict(
  existing: ResolvedType,
  incoming: ResolvedType,
  tokenId: string,
  warnings: string[],
): ResolvedType {
  if (existing === incoming) {
    return existing
  }
  if (SPECIFICITY[existing] === 0) {
    return incoming
  }
  if (SPECIFICITY[incoming] === 0) {
    return existing
  }
  warnings.push(
    `Token ${tokenId} has conflicting resolvedType: '${existing}' vs '${incoming}'`,
  )
  return existing
}

function collectFromBindings(
  node: NormalizedNode,
  tokenMap: Map<string, TokenAccumulator>,
): void {
  if (node.variables === null) {
    return
  }

  for (const binding of node.variables.bindings) {
    const location: EncounteredLocation = {
      nodeId: node.id,
      nodeName: node.name,
      field: binding.field,
    }

    const existing = tokenMap.get(binding.tokenId)
    if (existing !== undefined) {
      existing.resolvedType = resolveTypeConflict(
        existing.resolvedType,
        binding.resolvedType,
        binding.tokenId,
        existing.warnings,
      )
      existing.encounteredOn.push(location)
    } else {
      tokenMap.set(binding.tokenId, {
        tokenId: binding.tokenId,
        tokenName: binding.tokenName,
        collectionId: binding.collectionId,
        resolvedType: binding.resolvedType,
        encounteredOn: [location],
        warnings: [],
      })
    }
  }
}

function getBindingTokenIds(node: NormalizedNode): Set<string> {
  if (node.variables === null) {
    return new Set()
  }
  return new Set(node.variables.bindings.map((b) => b.tokenId))
}

function collectPaintTokenReference(
  paint: NormalizedPaint | NormalizedStroke,
  node: NormalizedNode,
  field: string,
  bindingTokenIds: Set<string>,
  tokenMap: Map<string, TokenAccumulator>,
): void {
  if (paint.tokenRef === null || bindingTokenIds.has(paint.tokenRef)) {
    return
  }

  const location: EncounteredLocation = {
    nodeId: node.id,
    nodeName: node.name,
    field,
  }

  const existing = tokenMap.get(paint.tokenRef)
  if (existing !== undefined) {
    existing.encounteredOn.push(location)
  } else {
    tokenMap.set(paint.tokenRef, {
      tokenId: paint.tokenRef,
      tokenName: null,
      collectionId: null,
      resolvedType: 'color',
      encounteredOn: [location],
      warnings: [],
    })
  }
}

function collectSupplementalPaintReferences(
  node: NormalizedNode,
  tokenMap: Map<string, TokenAccumulator>,
): void {
  if (node.appearance === null) {
    return
  }

  const bindingTokenIds = getBindingTokenIds(node)

  for (let index = 0; index < node.appearance.fills.length; index++) {
    const fill = node.appearance.fills[index]
    if (fill !== undefined) {
      collectPaintTokenReference(fill, node, `fills/${String(index)}`, bindingTokenIds, tokenMap)
    }
  }

  for (let index = 0; index < node.appearance.strokes.length; index++) {
    const stroke = node.appearance.strokes[index]
    if (stroke !== undefined) {
      collectPaintTokenReference(stroke, node, `strokes/${String(index)}`, bindingTokenIds, tokenMap)
    }
  }
}

function walkTree(
  node: NormalizedNode,
  tokenMap: Map<string, TokenAccumulator>,
): void {
  collectFromBindings(node, tokenMap)
  collectSupplementalPaintReferences(node, tokenMap)

  for (const child of node.children) {
    walkTree(child, tokenMap)
  }
}

function countByType(variables: readonly TokenReference[]): TokensUsedSummary['counts'] {
  let colors = 0
  let numbers = 0
  let other = 0

  for (const ref of variables) {
    switch (ref.resolvedType) {
      case 'color': {
        colors++
        break
      }
      case 'number': {
        numbers++
        break
      }
      case 'string':
      case 'boolean':
      case 'unknown': {
        other++
        break
      }
    }
  }

  return { colors, typography: 0, numbers, other }
}

export function aggregateTokensUsed(
  root: NormalizedNode,
  fileKey: string,
  rootNodeId: string,
): TokensUsedSummary {
  const tokenMap = new Map<string, TokenAccumulator>()
  walkTree(root, tokenMap)

  const variables: TokenReference[] = []
  for (const accumulator of tokenMap.values()) {
    variables.push({
      tokenId: accumulator.tokenId,
      tokenName: accumulator.tokenName,
      collectionId: accumulator.collectionId,
      resolvedType: accumulator.resolvedType,
      encounteredOn: accumulator.encounteredOn,
    })
  }

  return {
    scope: {
      fileKey,
      rootNodeId,
      isFullInventory: false as const,
    },
    variables,
    styles: [],
    counts: countByType(variables),
  }
}
