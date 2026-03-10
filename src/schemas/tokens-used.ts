import { z } from 'zod'

// --- Location ---

export const EncounteredLocationSchema = z.object({
  nodeId: z.string(),
  nodeName: z.string(),
  field: z.string(),
})
export type EncounteredLocation = z.infer<typeof EncounteredLocationSchema>

// --- Token Reference ---

export const TokenReferenceSchema = z.object({
  tokenId: z.string(),
  tokenName: z.string().nullable(),
  collectionId: z.string().nullable(),
  resolvedType: z.enum(['color', 'number', 'string', 'boolean', 'unknown']),
  encounteredOn: z.array(EncounteredLocationSchema),
})
export type TokenReference = z.infer<typeof TokenReferenceSchema>

// --- Style Reference (forward-compatibility placeholder) ---

export const StyleReferenceSchema = z.object({
  type: z.enum(['fill', 'stroke', 'text', 'effect', 'grid']),
  id: z.string(),
  name: z.string().nullable(),
  encounteredOn: z.array(EncounteredLocationSchema),
})
export type StyleReference = z.infer<typeof StyleReferenceSchema>

// --- Summary ---

export const TokensUsedSummarySchema = z.object({
  scope: z.object({
    fileKey: z.string(),
    rootNodeId: z.string(),
    isFullInventory: z.literal(false),
  }),
  variables: z.array(TokenReferenceSchema),
  styles: z.array(StyleReferenceSchema),
  counts: z.object({
    colors: z.number(),
    typography: z.number(),
    numbers: z.number(),
    other: z.number(),
  }),
})
export type TokensUsedSummary = z.infer<typeof TokensUsedSummarySchema>
