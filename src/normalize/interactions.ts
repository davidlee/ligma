import { getRawArray, isRecord, ok } from './raw-helpers.js'

import type { ExtractorResult } from './raw-helpers.js'
import type { FigmaNode } from '../figma/types-raw.js'
import type {
  InteractionActionKind,
  InteractionTrigger,
  NormalizedAction,
  NormalizedInteraction,
} from '../schemas/normalized.js'

const TRIGGER_MAP: ReadonlyMap<string, InteractionTrigger> = new Map([
  ['ON_HOVER', 'hover'],
  ['ON_CLICK', 'click'],
  ['ON_PRESS', 'press'],
  ['ON_DRAG', 'drag'],
  ['ON_KEY_DOWN', 'key-down'],
  ['MOUSE_ENTER', 'mouse-enter'],
  ['MOUSE_LEAVE', 'mouse-leave'],
  ['MOUSE_UP', 'mouse-up'],
  ['MOUSE_DOWN', 'mouse-down'],
  ['AFTER_TIMEOUT', 'after-timeout'],
])

const KNOWN_UNSUPPORTED_TRIGGERS = new Set(['ON_MEDIA_HIT', 'ON_MEDIA_END'])

const NAVIGATION_MAP: ReadonlyMap<string, InteractionActionKind> = new Map([
  ['NAVIGATE', 'navigate'],
  ['CHANGE_TO', 'change-to'],
  ['OVERLAY', 'overlay'],
  ['SWAP_OVERLAY', 'swap-overlay'],
  ['SCROLL_TO', 'scroll-to'],
])

function mapTrigger(raw: unknown, warnings: string[]): InteractionTrigger | null {
  if (!isRecord(raw)) {
    warnings.push('Malformed interaction trigger — skipping entry')
    return null
  }
  const type = raw.type
  if (typeof type !== 'string') {
    warnings.push('Interaction trigger missing type — skipping entry')
    return null
  }
  const mapped = TRIGGER_MAP.get(type)
  if (mapped !== undefined) {
    return mapped
  }
  const prefix = KNOWN_UNSUPPORTED_TRIGGERS.has(type) ? 'Unsupported' : 'Unknown'
  warnings.push(`${prefix} interaction trigger: ${type}`)
  return 'unknown'
}

const DIRECT_ACTION_MAP: ReadonlyMap<string, NormalizedAction> = new Map([
  ['BACK', { kind: 'back', destinationId: null, url: null }],
  ['CLOSE', { kind: 'close', destinationId: null, url: null }],
  ['URL', { kind: 'url', destinationId: null, url: null }],
  ['OPEN_URL', { kind: 'url', destinationId: null, url: null }],
])

function mapNavigationAction(
  raw: Record<string, unknown>, warnings: string[],
): NormalizedAction | null {
  const navigation = typeof raw.navigation === 'string' ? raw.navigation : null
  if (navigation === null) {
    return null
  }
  const destinationId = typeof raw.destinationId === 'string' ? raw.destinationId : null
  const kind = NAVIGATION_MAP.get(navigation)
  if (kind !== undefined) {
    return { kind, destinationId, url: null }
  }
  warnings.push(`Unknown navigation type: ${navigation}`)
  return { kind: 'unknown', destinationId, url: null }
}

function mapAction(raw: unknown, warnings: string[]): NormalizedAction | null {
  if (!isRecord(raw)) {
    return null
  }
  const type = typeof raw.type === 'string' ? raw.type : ''

  const direct = DIRECT_ACTION_MAP.get(type)
  if (direct !== undefined) {
    const url = direct.kind === 'url' && typeof raw.url === 'string' ? raw.url : null
    return { ...direct, url }
  }

  const navResult = mapNavigationAction(raw, warnings)
  if (navResult !== null) {
    return navResult
  }

  if (type !== '') {
    warnings.push(`Unsupported interaction action: ${type}`)
  }
  return { kind: 'unknown', destinationId: null, url: null }
}

function normalizeInteraction(
  raw: unknown, warnings: string[],
): NormalizedInteraction | null {
  if (!isRecord(raw)) {
    warnings.push('Malformed interaction entry — skipping')
    return null
  }

  const trigger = mapTrigger(raw.trigger, warnings)
  if (trigger === null) {
    return null
  }

  const rawActions = Array.isArray(raw.actions) ? raw.actions : []
  const actions: NormalizedAction[] = []
  for (const rawAction of rawActions) {
    const action = mapAction(rawAction, warnings)
    if (action !== null) {
      actions.push(action)
    }
  }

  return { trigger, actions }
}

export function extractInteractions(
  node: FigmaNode,
): ExtractorResult<NormalizedInteraction[] | null> {
  const rawInteractions = getRawArray(node, 'interactions')
  if (rawInteractions.length === 0) {
    return ok(null)
  }

  const warnings: string[] = []
  const interactions: NormalizedInteraction[] = []

  for (const raw of rawInteractions) {
    const interaction = normalizeInteraction(raw, warnings)
    if (interaction !== null) {
      interactions.push(interaction)
    }
  }

  const value = interactions.length > 0 ? interactions : null
  return {
    value,
    confidence: warnings.length > 0 ? 'medium' as const : 'high' as const,
    warnings,
    omittedFields: [],
  }
}
