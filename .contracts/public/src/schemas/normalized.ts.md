# schemas.normalized

## Types

### AssetKind

```typescript
type AssetKind = z.infer<any>
```

### Bounds

```typescript
type Bounds = z.infer<any>
```

### ComponentKind

```typescript
type ComponentKind = z.infer<any>
```

### Confidence

```typescript
type Confidence = z.infer<any>
```

### ConstraintMode

```typescript
type ConstraintMode = z.infer<any>
```

### CornerRadius

```typescript
type CornerRadius = z.infer<any>
```

### CrossAlign

```typescript
type CrossAlign = z.infer<any>
```

### Diagnostics

```typescript
type Diagnostics = z.infer<any>
```

### DimensionUnit

```typescript
type DimensionUnit = z.infer<any>
```

### DimensionValue

```typescript
type DimensionValue = z.infer<any>
```

### EffectKind

```typescript
type EffectKind = z.infer<any>
```

### GradientStop

```typescript
type GradientStop = z.infer<any>
```

### HierarchyEntry

```typescript
type HierarchyEntry = z.infer<any>
```

### LayoutMode

```typescript
type LayoutMode = z.infer<any>
```

### MainAlign

```typescript
type MainAlign = z.infer<any>
```

### NormalizedAppearance

```typescript
type NormalizedAppearance = z.infer<any>
```

### NormalizedAssetInfo

```typescript
type NormalizedAssetInfo = z.infer<any>
```

### NormalizedComponentInfo

```typescript
type NormalizedComponentInfo = z.infer<any>
```

### NormalizedEffect

```typescript
type NormalizedEffect = z.infer<any>
```

### NormalizedGrid

```typescript
type NormalizedGrid = z.infer<any>
```

### NormalizedLayout

```typescript
type NormalizedLayout = z.infer<any>
```

### NormalizedNodeType

```typescript
type NormalizedNodeType = z.infer<any>
```

### NormalizedPaint

```typescript
type NormalizedPaint = z.infer<any>
```

### NormalizedRole

```typescript
type NormalizedRole = z.infer<any>
```

### NormalizedStroke

```typescript
type NormalizedStroke = z.infer<any>
```

### NormalizedText

```typescript
type NormalizedText = z.infer<any>
```

### NormalizedVariableBindings

```typescript
type NormalizedVariableBindings = z.infer<any>
```

### PaintKind

```typescript
type PaintKind = z.infer<any>
```

### Semantics

```typescript
type Semantics = z.infer<any>
```

### SizingMode

```typescript
type SizingMode = z.infer<any>
```

### StrokeAlign

```typescript
type StrokeAlign = z.infer<any>
```

### TextSemanticKind

```typescript
type TextSemanticKind = z.infer<any>
```

### NormalizedNode

```typescript
interface NormalizedNode { id: string; name: string; type: NormalizedNodeType; ... }
```

## Constants

- `const AssetKindSchema: any = z.enum(['svg', 'bitmap', 'mixed'])`
- `const BoundsSchema: any`
- `const ComponentKindSchema: any`
- `const ConfidenceSchema: any = z.enum(['high', 'medium', 'low'])`
- `const ConstraintModeSchema: any`
- `const CornerRadiusSchema: any`
- `const CrossAlignSchema: any`
- `const DiagnosticsSchema: any`
- `const DimensionUnitSchema: any = z.enum(['px', 'percent', 'auto', 'unknown'])`
- `const DimensionValueSchema: any`
- `const EffectKindSchema: any`
- `const GradientStopSchema: any`
- `const HierarchyEntrySchema: any`
- `const LayoutModeSchema: any`
- `const MainAlignSchema: any`
- `const NormalizedAppearanceSchema: any`
- `const NormalizedAssetInfoSchema: any`
- `const NormalizedComponentInfoSchema: any`
- `const NormalizedEffectSchema: any`
- `const NormalizedGridSchema: any`
- `const NormalizedLayoutSchema: any`
- `const NormalizedNodeSchema: z.ZodType<import("/home/david/dev/inlight/ligma/src/schemas/normalized").NormalizedNode>`
- `const NormalizedNodeTypeSchema: any`
- `const NormalizedPaintSchema: any`
- `const NormalizedRoleSchema: any`
- `const NormalizedStrokeSchema: any`
- `const NormalizedTextSchema: any`
- `const NormalizedVariableBindingsSchema: any`
- `const PaintKindSchema: any`
- `const SemanticsSchema: any`
- `const SizingModeSchema: any = z.enum(['fixed', 'fill', 'hug', 'unknown'])`
- `const StrokeAlignSchema: any = z.enum(['inside', 'outside', 'center'])`
- `const TextSemanticKindSchema: any`
