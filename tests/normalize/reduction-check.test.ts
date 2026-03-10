import { readFileSync } from 'node:fs'

import { describe, it } from 'vitest'

import { normalize } from '../../src/normalize/index.js'
import { FigmaNodeSchema } from '../../src/schemas/raw.js'

describe('check', () => {
  it('measure', () => {
    const fixture: unknown = JSON.parse(readFileSync('/tmp/figma-fixture.json', 'utf8'))
    const raw = FigmaNodeSchema.parse(fixture)
    const rawSize = JSON.stringify(raw).length
    const normalized = normalize(raw)
    const normSize = JSON.stringify(normalized).length
    const reduction = 1 - normSize / rawSize
    // eslint-disable-next-line no-console -- diagnostic output for manual verification
    console.log(`Raw: ${String(rawSize)}  Normalized: ${String(normSize)}  Reduction: ${(reduction * 100).toFixed(1)}%`)
  })
})
