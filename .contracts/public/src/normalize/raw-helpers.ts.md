# normalize.raw-helpers

## Types

### ExtractorResult

```typescript
interface ExtractorResult { value: T; warnings: string[]; omittedFields: string[] }
```

## Functions

### getRawArray

```typescript
getRawArray(node: z.infer<z.ZodType<FigmaNodeShape>>, key: string): unknown[]
```

### getRawBoolean

```typescript
getRawBoolean(node: z.infer<z.ZodType<FigmaNodeShape>>, key: string, defaultValue: boolean): boolean
```

### getRawNumber

```typescript
getRawNumber(node: z.infer<z.ZodType<FigmaNodeShape>>, key: string, defaultValue: number): number
```

### getRawProperty

```typescript
getRawProperty(node: z.infer<z.ZodType<FigmaNodeShape>>, key: string): unknown
```

Access a passthrough field on a FigmaNode (DEC-017).
FigmaNode has an index signature `[key: string]: unknown`,
so direct indexing returns `unknown` without needing type assertions.

### getRawRecord

```typescript
getRawRecord(node: z.infer<z.ZodType<FigmaNodeShape>>, key: string): Record<string, unknown>
```

### getRawString

```typescript
getRawString(node: z.infer<z.ZodType<FigmaNodeShape>>, key: string, defaultValue: string): string
```

### isRecord

```typescript
isRecord(value: unknown): boolean
```

### ok

```typescript
ok(value: T): import("/home/david/dev/inlight/ligma/src/normalize/raw-helpers").ExtractorResult<T>
```
