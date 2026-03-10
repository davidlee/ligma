import type { FigmaFileResponseSchema, FigmaImagesResponseSchema, FigmaNodeSchema } from '../schemas/raw.js'
import type { z } from 'zod'

export type FigmaNode = z.infer<typeof FigmaNodeSchema>

export type FigmaFileResponse = z.infer<typeof FigmaFileResponseSchema>

export type FigmaImagesResponse = z.infer<typeof FigmaImagesResponseSchema>
