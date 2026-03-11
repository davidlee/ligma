import type { NormalizedNode } from '../schemas/normalized.js'
import type { OutlineNode } from '../schemas/outline.js'

export interface OutlineOptions {
  includeHidden?: boolean
}

export interface OutlineResult {
  outline: OutlineNode
  hiddenNodesOmitted: number
}

export function buildOutline(
  node: NormalizedNode,
  options?: OutlineOptions,
): OutlineResult {
  const includeHidden = options?.includeHidden ?? false
  let hiddenNodesOmitted = 0

  function projectChild(n: NormalizedNode): OutlineNode | null {
    if (!n.visible && !includeHidden) {
      hiddenNodesOmitted++
      return null
    }
    return projectNode(n)
  }

  function projectNode(n: NormalizedNode): OutlineNode {
    const children: OutlineNode[] = []
    for (const child of n.children) {
      const projected = projectChild(child)
      if (projected !== null) {
        children.push(projected)
      }
    }

    return {
      id: n.id,
      name: n.name,
      type: n.type,
      role: n.role,
      visible: n.visible,
      bounds: n.bounds !== null
        ? { x: n.bounds.x, y: n.bounds.y, width: n.bounds.width, height: n.bounds.height }
        : null,
      childCount: n.hierarchy.childCount,
      children,
    }
  }

  const outline = projectNode(node)
  return { outline, hiddenNodesOmitted }
}

const XML_ELEMENT_NAMES = new Map<string, string>([
  ['document', 'document'],
  ['page', 'page'],
  ['frame', 'frame'],
  ['group', 'group'],
  ['component', 'component'],
  ['instance', 'instance'],
  ['variant-set', 'variant-set'],
  ['text', 'text'],
  ['shape', 'shape'],
  ['vector', 'vector'],
  ['image', 'image'],
  ['line', 'line'],
  ['boolean-operation', 'boolean-operation'],
  ['mask', 'mask'],
  ['section', 'section'],
  ['unknown', 'unknown'],
])

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function outlineToXml(outline: OutlineNode): string {
  return serializeNode(outline, 0)
}

function resolveElementName(type: string): string {
  return XML_ELEMENT_NAMES.get(type) ?? 'unknown'
}

function serializeNode(node: OutlineNode, depth: number): string {
  const indent = '  '.repeat(depth)
  const tag = resolveElementName(node.type)

  const attributes: string[] = [
    `id="${escapeXml(node.id)}"`,
    `name="${escapeXml(node.name)}"`,
  ]

  if (node.role !== null) {
    attributes.push(`role="${escapeXml(node.role)}"`)
  }

  if (node.bounds !== null) {
    attributes.push(`w="${String(node.bounds.width)}"`)
    attributes.push(`h="${String(node.bounds.height)}"`)
  }

  attributes.push(`child-count="${String(node.childCount)}"`)

  if (!node.visible) {
    attributes.push('visible="false"')
  }

  const attributeString = attributes.join(' ')

  if (node.children.length === 0) {
    return `${indent}<${tag} ${attributeString} />`
  }

  const childLines = node.children
    .map(child => serializeNode(child, depth + 1))
    .join('\n')

  return `${indent}<${tag} ${attributeString}>\n${childLines}\n${indent}</${tag}>`
}
