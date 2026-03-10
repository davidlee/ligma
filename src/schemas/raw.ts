import { z } from 'zod'

interface FigmaNodeShape {
  id: string
  name: string
  type: string
  children?: FigmaNodeShape[] | undefined
  [key: string]: unknown
}

export const FigmaNodeSchema: z.ZodType<FigmaNodeShape> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    children: z.array(FigmaNodeSchema).optional(),
  }).passthrough(),
)

export const FigmaFileResponseSchema = z.object({
  name: z.string(),
  lastModified: z.string(),
  version: z.string(),
  document: FigmaNodeSchema,
}).passthrough()

const FigmaNodeEntrySchema = z.object({
  document: FigmaNodeSchema,
}).passthrough()

export const FigmaNodesResponseSchema = z.object({
  nodes: z.record(z.string(), FigmaNodeEntrySchema),
  name: z.string(),
  lastModified: z.string(),
  version: z.string(),
}).passthrough()

export const FigmaImagesResponseSchema = z.object({
  images: z.record(z.string(), z.string().nullable()),
}).passthrough()
