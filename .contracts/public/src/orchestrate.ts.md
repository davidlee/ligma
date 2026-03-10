# orchestrate

## Types

### OrchestrateResult

```typescript
interface OrchestrateResult { readonly manifest: Manifest; readonly rawNode: unknown; readonly normalizedNode: NormalizedNode; ... }
```

## Functions

### orchestrate

```typescript
async orchestrate(config: import("/home/david/dev/inlight/ligma/src/config").FetchConfig): Promise<import("/home/david/dev/inlight/ligma/src/orchestrate").OrchestrateResult>
```

Orchestrates a complete Figma fetch: parse URL, authenticate, fetch node
and image in parallel, build manifest. Returns data only — no I/O.

Image failure is non-fatal (recorded in manifest errors).
Node failure is fatal (throws).
