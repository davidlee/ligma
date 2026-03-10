# normalize.node

## Types

### NormalizeContext

```typescript
interface NormalizeContext { parentId: string | null; depth: number; path: { id: string; name: string; type: string }[] }
```

## Functions

### normalizeNode

```typescript
normalizeNode(raw: z.infer<z.ZodType<FigmaNodeShape>>, context: import("/home/david/dev/inlight/ligma/src/normalize/node").NormalizeContext): import("/home/david/dev/inlight/ligma/src/schemas/normalized").NormalizedNode
```
