# output.manifest

## Types

### ManifestInput

```typescript
interface ManifestInput { readonly source: {
    readonly fileKey: string
    readonly nodeId: string
    readonly fileName?: string | undefined
    readonly version?: string | undefined
    readonly lastModified?: string | undefined
  }; readonly outputs: {
    readonly rawNodeJson: string
    readonly png?: string | undefined
    readonly svg?: string | undefined
    readonly assets: readonly string[]
  }; readonly errors: readonly ManifestError[] }
```

## Functions

### buildManifest

```typescript
buildManifest(input: import("/home/david/dev/inlight/ligma/src/output/manifest").ManifestInput): z.infer<any>
```

Builds a complete Manifest from core fetch results.
Fields not present in ManifestInput (normalizedNodeJson, outlineJson, etc.)
are omitted from output. Later deltas extend ManifestInput — not the builder.
