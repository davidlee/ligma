import { NormalizationError } from '../errors.js'

import { normalizeNode } from './node.js'

import type { NormalizeContext } from './node.js'
import type { FigmaNode } from '../figma/types-raw.js'
import type { NormalizedNode } from '../schemas/normalized.js'

export function normalize(rawNode: FigmaNode): NormalizedNode {
  if (typeof rawNode.id !== 'string' || typeof rawNode.name !== 'string' || typeof rawNode.type !== 'string') {
    throw new NormalizationError('Root node missing required id, name, or type fields', {
      context: { nodeId: rawNode.id, nodeName: rawNode.name, nodeType: rawNode.type },
    })
  }

  const rootContext: NormalizeContext = {
    parentId: null,
    depth: 0,
    path: [],
  }

  return normalizeNode(rawNode, rootContext)
}
