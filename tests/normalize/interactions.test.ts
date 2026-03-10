import { describe, expect, it } from 'vitest'

import { extractInteractions } from '../../src/normalize/interactions.js'
import { FigmaNodeSchema } from '../../src/schemas/raw.js'

function makeNode(extra: Record<string, unknown> = {}): ReturnType<typeof FigmaNodeSchema.parse> {
  return FigmaNodeSchema.parse({ id: '1:1', name: 'Test', type: 'FRAME', ...extra })
}

describe('extractInteractions (VT-020)', () => {
  describe('absent / empty', () => {
    it('returns null when no interactions field', () => {
      expect(extractInteractions(makeNode()).value).toBeNull()
    })

    it('returns null for empty interactions array', () => {
      expect(extractInteractions(makeNode({ interactions: [] })).value).toBeNull()
    })
  })

  describe('trigger mapping', () => {
    it('maps ON_HOVER to hover', () => {
      const node = makeNode({
        interactions: [{ trigger: { type: 'ON_HOVER' }, actions: [] }],
      })
      expect(extractInteractions(node).value?.[0]?.trigger).toBe('hover')
    })

    it('maps ON_CLICK to click', () => {
      const node = makeNode({
        interactions: [{ trigger: { type: 'ON_CLICK' }, actions: [] }],
      })
      expect(extractInteractions(node).value?.[0]?.trigger).toBe('click')
    })

    it('maps ON_PRESS to press', () => {
      const node = makeNode({
        interactions: [{ trigger: { type: 'ON_PRESS' }, actions: [] }],
      })
      expect(extractInteractions(node).value?.[0]?.trigger).toBe('press')
    })

    it('maps ON_DRAG to drag', () => {
      const node = makeNode({
        interactions: [{ trigger: { type: 'ON_DRAG' }, actions: [] }],
      })
      expect(extractInteractions(node).value?.[0]?.trigger).toBe('drag')
    })

    it('maps MOUSE_ENTER to mouse-enter', () => {
      const node = makeNode({
        interactions: [{ trigger: { type: 'MOUSE_ENTER' }, actions: [] }],
      })
      expect(extractInteractions(node).value?.[0]?.trigger).toBe('mouse-enter')
    })

    it('maps AFTER_TIMEOUT to after-timeout', () => {
      const node = makeNode({
        interactions: [{ trigger: { type: 'AFTER_TIMEOUT' }, actions: [] }],
      })
      expect(extractInteractions(node).value?.[0]?.trigger).toBe('after-timeout')
    })

    it('maps ON_MEDIA_HIT to unknown with warning', () => {
      const node = makeNode({
        interactions: [{ trigger: { type: 'ON_MEDIA_HIT' }, actions: [] }],
      })
      const result = extractInteractions(node)
      expect(result.value?.[0]?.trigger).toBe('unknown')
      expect(result.warnings).toContain('Unsupported interaction trigger: ON_MEDIA_HIT')
    })

    it('maps unrecognized trigger to unknown with warning', () => {
      const node = makeNode({
        interactions: [{ trigger: { type: 'FUTURE_TRIGGER' }, actions: [] }],
      })
      const result = extractInteractions(node)
      expect(result.value?.[0]?.trigger).toBe('unknown')
      expect(result.warnings).toContain('Unknown interaction trigger: FUTURE_TRIGGER')
    })
  })

  describe('action mapping — direct types', () => {
    it('maps BACK action', () => {
      const node = makeNode({
        interactions: [{
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'BACK' }],
        }],
      })
      const action = extractInteractions(node).value?.[0]?.actions[0]
      expect(action).toEqual({ kind: 'back', destinationId: null, url: null })
    })

    it('maps CLOSE action', () => {
      const node = makeNode({
        interactions: [{
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'CLOSE' }],
        }],
      })
      const action = extractInteractions(node).value?.[0]?.actions[0]
      expect(action).toEqual({ kind: 'close', destinationId: null, url: null })
    })

    it('maps URL action with url field', () => {
      const node = makeNode({
        interactions: [{
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'URL', url: 'https://example.com' }],
        }],
      })
      const action = extractInteractions(node).value?.[0]?.actions[0]
      expect(action).toEqual({ kind: 'url', destinationId: null, url: 'https://example.com' })
    })

    it('maps OPEN_URL action', () => {
      const node = makeNode({
        interactions: [{
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'OPEN_URL', url: 'https://example.com' }],
        }],
      })
      const action = extractInteractions(node).value?.[0]?.actions[0]
      expect(action?.kind).toBe('url')
    })
  })

  describe('action mapping — navigation-derived', () => {
    it('derives navigate from navigation field', () => {
      const node = makeNode({
        interactions: [{
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'NODE', navigation: 'NAVIGATE', destinationId: '100:200' }],
        }],
      })
      const action = extractInteractions(node).value?.[0]?.actions[0]
      expect(action).toEqual({ kind: 'navigate', destinationId: '100:200', url: null })
    })

    it('derives change-to from navigation field', () => {
      const node = makeNode({
        interactions: [{
          trigger: { type: 'ON_HOVER' },
          actions: [{ type: 'NODE', navigation: 'CHANGE_TO', destinationId: '200:300' }],
        }],
      })
      const action = extractInteractions(node).value?.[0]?.actions[0]
      expect(action).toEqual({ kind: 'change-to', destinationId: '200:300', url: null })
    })

    it('derives overlay from navigation field', () => {
      const node = makeNode({
        interactions: [{
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'NODE', navigation: 'OVERLAY', destinationId: '300:400' }],
        }],
      })
      expect(extractInteractions(node).value?.[0]?.actions[0]?.kind).toBe('overlay')
    })

    it('derives swap-overlay from navigation field', () => {
      const node = makeNode({
        interactions: [{
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'NODE', navigation: 'SWAP_OVERLAY', destinationId: '400:500' }],
        }],
      })
      expect(extractInteractions(node).value?.[0]?.actions[0]?.kind).toBe('swap-overlay')
    })

    it('derives scroll-to from navigation field', () => {
      const node = makeNode({
        interactions: [{
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'NODE', navigation: 'SCROLL_TO', destinationId: '500:600' }],
        }],
      })
      expect(extractInteractions(node).value?.[0]?.actions[0]?.kind).toBe('scroll-to')
    })

    it('maps unknown navigation type with warning', () => {
      const node = makeNode({
        interactions: [{
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'NODE', navigation: 'FUTURE_NAV', destinationId: '1:1' }],
        }],
      })
      const result = extractInteractions(node)
      expect(result.value?.[0]?.actions[0]?.kind).toBe('unknown')
      expect(result.warnings).toContain('Unknown navigation type: FUTURE_NAV')
    })
  })

  describe('action mapping — unsupported types', () => {
    it('maps SET_VARIABLE to unknown with warning', () => {
      const node = makeNode({
        interactions: [{
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'SET_VARIABLE' }],
        }],
      })
      const result = extractInteractions(node)
      expect(result.value?.[0]?.actions[0]?.kind).toBe('unknown')
      expect(result.warnings).toContain('Unsupported interaction action: SET_VARIABLE')
    })

    it('maps CONDITIONAL to unknown with warning', () => {
      const node = makeNode({
        interactions: [{
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'CONDITIONAL' }],
        }],
      })
      const result = extractInteractions(node)
      expect(result.value?.[0]?.actions[0]?.kind).toBe('unknown')
      expect(result.warnings).toContain('Unsupported interaction action: CONDITIONAL')
    })
  })

  describe('multiple interactions and actions', () => {
    it('extracts multiple interactions on one node', () => {
      const node = makeNode({
        interactions: [
          { trigger: { type: 'ON_HOVER' }, actions: [{ type: 'NODE', navigation: 'CHANGE_TO', destinationId: '1:2' }] },
          { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', navigation: 'NAVIGATE', destinationId: '3:4' }] },
        ],
      })
      const result = extractInteractions(node)
      expect(result.value).toHaveLength(2)
      expect(result.value?.[0]?.trigger).toBe('hover')
      expect(result.value?.[1]?.trigger).toBe('click')
    })

    it('extracts multiple actions within one interaction', () => {
      const node = makeNode({
        interactions: [{
          trigger: { type: 'ON_CLICK' },
          actions: [
            { type: 'NODE', navigation: 'NAVIGATE', destinationId: '1:2' },
            { type: 'URL', url: 'https://example.com' },
          ],
        }],
      })
      const actions = extractInteractions(node).value?.[0]?.actions
      expect(actions).toHaveLength(2)
      expect(actions?.[0]?.kind).toBe('navigate')
      expect(actions?.[1]?.kind).toBe('url')
    })
  })

  describe('malformed entries', () => {
    it('skips entry with missing trigger', () => {
      const node = makeNode({
        interactions: [{ actions: [{ type: 'BACK' }] }],
      })
      const result = extractInteractions(node)
      expect(result.value).toBeNull()
      expect(result.warnings).toContain('Malformed interaction trigger — skipping entry')
    })

    it('skips entry with trigger missing type field', () => {
      const node = makeNode({
        interactions: [{ trigger: {}, actions: [{ type: 'BACK' }] }],
      })
      const result = extractInteractions(node)
      expect(result.value).toBeNull()
      expect(result.warnings).toContain('Interaction trigger missing type — skipping entry')
    })

    it('skips entry with non-object trigger', () => {
      const node = makeNode({
        interactions: [{ trigger: 'ON_CLICK', actions: [] }],
      })
      const result = extractInteractions(node)
      expect(result.value).toBeNull()
      expect(result.warnings).toContain('Malformed interaction trigger — skipping entry')
    })

    it('skips non-object interaction entries', () => {
      const node = makeNode({
        interactions: ['bad', null, 42],
      })
      const result = extractInteractions(node)
      expect(result.value).toBeNull()
      expect(result.warnings.filter((w) => w.includes('Malformed interaction entry'))).toHaveLength(3)
    })
  })

  describe('confidence', () => {
    it('returns high confidence when no warnings', () => {
      const node = makeNode({
        interactions: [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'BACK' }] }],
      })
      expect(extractInteractions(node).confidence).toBe('high')
    })

    it('returns medium confidence when warnings present', () => {
      const node = makeNode({
        interactions: [{ trigger: { type: 'UNKNOWN_TRIGGER' }, actions: [] }],
      })
      expect(extractInteractions(node).confidence).toBe('medium')
    })
  })
})
