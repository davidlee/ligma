import { z } from 'zod'

// --- Enums ---

export const NormalizedNodeTypeSchema = z.enum([
  'document', 'page', 'frame', 'group',
  'component', 'instance', 'variant-set',
  'text', 'shape', 'vector', 'image', 'line',
  'boolean-operation', 'mask', 'section', 'unknown',
])
export type NormalizedNodeType = z.infer<typeof NormalizedNodeTypeSchema>

export const NormalizedRoleSchema = z.enum([
  'screen', 'container', 'stack', 'grid', 'card',
  'button', 'icon-button', 'label', 'heading', 'body-text',
  'input', 'image', 'icon', 'divider', 'badge', 'avatar',
  'list', 'list-item', 'modal', 'navigation',
])
export type NormalizedRole = z.infer<typeof NormalizedRoleSchema>

export const LayoutModeSchema = z.enum(['none', 'horizontal', 'vertical', 'grid', 'absolute'])
export type LayoutMode = z.infer<typeof LayoutModeSchema>

export const SizingModeSchema = z.enum(['fixed', 'fill', 'hug', 'unknown'])
export type SizingMode = z.infer<typeof SizingModeSchema>

export const MainAlignSchema = z.enum(['start', 'center', 'end', 'space-between', 'unknown'])
export type MainAlign = z.infer<typeof MainAlignSchema>

export const CrossAlignSchema = z.enum(['start', 'center', 'end', 'stretch', 'baseline', 'unknown'])
export type CrossAlign = z.infer<typeof CrossAlignSchema>

export const ConstraintModeSchema = z.enum(['min', 'max', 'center', 'stretch', 'scale', 'unknown'])
export type ConstraintMode = z.infer<typeof ConstraintModeSchema>

export const StrokeAlignSchema = z.enum(['inside', 'outside', 'center'])
export type StrokeAlign = z.infer<typeof StrokeAlignSchema>

export const EffectKindSchema = z.enum([
  'drop-shadow', 'inner-shadow', 'layer-blur', 'background-blur', 'unknown',
])
export type EffectKind = z.infer<typeof EffectKindSchema>

export const PaintKindSchema = z.enum(['solid', 'gradient', 'image', 'video', 'unknown'])
export type PaintKind = z.infer<typeof PaintKindSchema>

export const TextSemanticKindSchema = z.enum([
  'heading', 'label', 'body', 'caption', 'button', 'unknown',
])
export type TextSemanticKind = z.infer<typeof TextSemanticKindSchema>

export const ComponentKindSchema = z.enum(['component', 'instance', 'component-set'])
export type ComponentKind = z.infer<typeof ComponentKindSchema>

export const AssetKindSchema = z.enum(['svg', 'bitmap', 'mixed'])
export type AssetKind = z.infer<typeof AssetKindSchema>

export const ConfidenceSchema = z.enum(['high', 'medium', 'low'])
export type Confidence = z.infer<typeof ConfidenceSchema>

export const DimensionUnitSchema = z.enum(['px', 'percent', 'auto', 'unknown'])
export type DimensionUnit = z.infer<typeof DimensionUnitSchema>

// --- Value Types ---

export const BoundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
})
export type Bounds = z.infer<typeof BoundsSchema>

export const DimensionValueSchema = z.object({
  unit: DimensionUnitSchema,
  value: z.number().nullable(),
})
export type DimensionValue = z.infer<typeof DimensionValueSchema>

export const GradientStopSchema = z.object({
  position: z.number(),
  color: z.string(),
})
export type GradientStop = z.infer<typeof GradientStopSchema>

export const HierarchyEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
})
export type HierarchyEntry = z.infer<typeof HierarchyEntrySchema>

// --- Layout ---

export const NormalizedGridSchema = z.object({
  rows: z.number().nullable(),
  columns: z.number().nullable(),
  rowGap: z.number().nullable(),
  columnGap: z.number().nullable(),
})
export type NormalizedGrid = z.infer<typeof NormalizedGridSchema>

export const NormalizedLayoutSchema = z.object({
  mode: LayoutModeSchema,
  sizing: z.object({ horizontal: SizingModeSchema, vertical: SizingModeSchema }),
  align: z.object({ main: MainAlignSchema, cross: CrossAlignSchema }),
  padding: z.object({
    top: z.number(), right: z.number(), bottom: z.number(), left: z.number(),
  }).nullable(),
  gap: z.number().nullable(),
  wrap: z.boolean().nullable(),
  grid: NormalizedGridSchema.nullable(),
  constraints: z.object({
    horizontal: ConstraintModeSchema, vertical: ConstraintModeSchema,
  }).nullable(),
  position: z.object({
    x: z.number(), y: z.number(), positioning: z.enum(['flow', 'absolute']),
  }).nullable(),
  clipsContent: z.boolean().nullable(),
})
export type NormalizedLayout = z.infer<typeof NormalizedLayoutSchema>

// --- Appearance ---

export const NormalizedPaintSchema = z.object({
  kind: PaintKindSchema,
  visible: z.boolean(),
  color: z.string().nullable(),
  opacity: z.number().nullable(),
  gradientStops: z.array(GradientStopSchema).nullable(),
  tokenRef: z.string().nullable(),
  imageRef: z.string().nullable(),
})
export type NormalizedPaint = z.infer<typeof NormalizedPaintSchema>

export const NormalizedStrokeSchema = NormalizedPaintSchema.extend({
  weight: z.number().nullable(),
  align: StrokeAlignSchema.nullable(),
})
export type NormalizedStroke = z.infer<typeof NormalizedStrokeSchema>

export const CornerRadiusSchema = z.discriminatedUnion('uniform', [
  z.object({ uniform: z.literal(true), radius: z.number() }),
  z.object({
    uniform: z.literal(false),
    topLeft: z.number(),
    topRight: z.number(),
    bottomRight: z.number(),
    bottomLeft: z.number(),
  }),
])
export type CornerRadius = z.infer<typeof CornerRadiusSchema>

export const NormalizedEffectSchema = z.object({
  kind: EffectKindSchema,
  visible: z.boolean(),
  color: z.string().nullable(),
  offset: z.object({ x: z.number(), y: z.number() }).nullable(),
  radius: z.number().nullable(),
  spread: z.number().nullable(),
})
export type NormalizedEffect = z.infer<typeof NormalizedEffectSchema>

export const NormalizedAppearanceSchema = z.object({
  fills: z.array(NormalizedPaintSchema),
  strokes: z.array(NormalizedStrokeSchema),
  cornerRadius: CornerRadiusSchema.nullable(),
  effects: z.array(NormalizedEffectSchema),
  blendMode: z.string().nullable(),
  opacity: z.number().nullable(),
})
export type NormalizedAppearance = z.infer<typeof NormalizedAppearanceSchema>

// --- Text ---

export const NormalizedTextSchema = z.object({
  content: z.string(),
  charactersLength: z.number(),
  style: z.object({
    fontFamily: z.string().nullable(),
    fontWeight: z.number().nullable(),
    fontSize: z.number().nullable(),
    lineHeight: DimensionValueSchema.nullable(),
    letterSpacing: DimensionValueSchema.nullable(),
    textCase: z.string().nullable(),
    textAlignHorizontal: z.string().nullable(),
    textAlignVertical: z.string().nullable(),
  }),
  color: z.string().nullable(),
  tokenRefs: z.array(z.string()),
  semanticKind: TextSemanticKindSchema,
  truncation: z.object({
    maxLines: z.number().nullable(),
    ellipsis: z.boolean().nullable(),
  }).nullable(),
})
export type NormalizedText = z.infer<typeof NormalizedTextSchema>

// --- DE-004 Placeholders ---

export const NormalizedComponentInfoSchema = z.object({
  kind: ComponentKindSchema,
  componentId: z.string().nullable(),
  componentName: z.string().nullable(),
  componentSetId: z.string().nullable(),
  propertyValues: z.record(z.string(), z.string()),
  propertyReferences: z.record(z.string(), z.string()),
  isReusable: z.boolean(),
})
export type NormalizedComponentInfo = z.infer<typeof NormalizedComponentInfoSchema>

export const NormalizedVariableBindingsSchema = z.object({
  bindings: z.array(z.object({
    field: z.string(),
    tokenId: z.string(),
    tokenName: z.string().nullable(),
    collectionId: z.string().nullable(),
    modeId: z.string().nullable(),
    resolvedType: z.enum(['color', 'number', 'string', 'boolean', 'unknown']),
  })),
  explicitModes: z.record(z.string(), z.string()),
})
export type NormalizedVariableBindings = z.infer<typeof NormalizedVariableBindingsSchema>

export const NormalizedAssetInfoSchema = z.object({
  kind: AssetKindSchema,
  exportSuggested: z.boolean(),
  reason: z.string().nullable(),
  exportNodeIds: z.array(z.string()),
  imageRefs: z.array(z.string()),
})
export type NormalizedAssetInfo = z.infer<typeof NormalizedAssetInfoSchema>

// --- Semantics ---

export const SemanticsSchema = z.object({
  likelyInteractive: z.boolean(),
  likelyTextInput: z.boolean(),
  likelyIcon: z.boolean(),
  likelyImage: z.boolean(),
  likelyMask: z.boolean(),
  likelyReusableComponent: z.boolean(),
})
export type Semantics = z.infer<typeof SemanticsSchema>

// --- Diagnostics ---

export const DiagnosticsSchema = z.object({
  sourceNodeType: z.string(),
  omittedFields: z.array(z.string()),
  warnings: z.array(z.string()),
  confidence: ConfidenceSchema,
})
export type Diagnostics = z.infer<typeof DiagnosticsSchema>

// --- NormalizedNode (recursive) ---

export const NormalizedNodeSchema: z.ZodType<NormalizedNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    type: NormalizedNodeTypeSchema,
    role: NormalizedRoleSchema.nullable(),
    visible: z.boolean(),
    bounds: BoundsSchema.nullable(),
    rotation: z.number().nullable(),
    hierarchy: z.object({
      parentId: z.string().nullable(),
      depth: z.number(),
      childCount: z.number(),
      path: z.array(HierarchyEntrySchema),
    }),
    layout: NormalizedLayoutSchema.nullable(),
    appearance: NormalizedAppearanceSchema.nullable(),
    text: NormalizedTextSchema.nullable(),
    component: NormalizedComponentInfoSchema.nullable(),
    variables: NormalizedVariableBindingsSchema.nullable(),
    asset: NormalizedAssetInfoSchema.nullable(),
    semantics: SemanticsSchema,
    children: z.array(NormalizedNodeSchema),
    diagnostics: DiagnosticsSchema,
  }),
)

export interface NormalizedNode {
  id: string
  name: string
  type: NormalizedNodeType
  role: NormalizedRole | null
  visible: boolean
  bounds: Bounds | null
  rotation: number | null
  hierarchy: {
    parentId: string | null
    depth: number
    childCount: number
    path: HierarchyEntry[]
  }
  layout: NormalizedLayout | null
  appearance: NormalizedAppearance | null
  text: NormalizedText | null
  component: NormalizedComponentInfo | null
  variables: NormalizedVariableBindings | null
  asset: NormalizedAssetInfo | null
  semantics: Semantics
  children: NormalizedNode[]
  diagnostics: Diagnostics
}
