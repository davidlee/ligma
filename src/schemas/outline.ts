import { z } from 'zod'

import { NormalizedNodeTypeSchema, NormalizedRoleSchema } from './normalized.js'

export interface OutlineNode {
  id: string
  name: string
  type: string
  role: string | null
  visible: boolean
  bounds: { x: number; y: number; width: number; height: number } | null
  childCount: number
  children: OutlineNode[]
}

export const OutlineNodeSchema: z.ZodType<OutlineNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    type: NormalizedNodeTypeSchema,
    role: NormalizedRoleSchema.nullable(),
    visible: z.boolean(),
    bounds: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }).nullable(),
    childCount: z.number().int().min(0),
    children: z.array(OutlineNodeSchema),
  }),
)
