import { z } from 'zod'

export const ManifestErrorSchema = z.object({
  type: z.string(),
  message: z.string(),
  nodeId: z.string().optional(),
})

export type ManifestError = z.infer<typeof ManifestErrorSchema>

const ManifestSourceSchema = z.object({
  fileKey: z.string(),
  nodeId: z.string(),
  fileName: z.string().optional(),
  version: z.string().optional(),
  lastModified: z.string().optional(),
})

const ManifestOutputsSchema = z.object({
  rawNodeJson: z.string(),
  png: z.string().optional(),
  svg: z.string().optional(),
  normalizedNodeJson: z.string().optional(),
  outlineJson: z.string().optional(),
  outlineXml: z.string().optional(),
  contextMd: z.string().optional(),
  tokensUsedJson: z.string().optional(),
  assets: z.array(z.string()),
})

export const ManifestSchema = z.object({
  source: ManifestSourceSchema,
  outputs: ManifestOutputsSchema,
  errors: z.array(ManifestErrorSchema),
})

export type Manifest = z.infer<typeof ManifestSchema>
