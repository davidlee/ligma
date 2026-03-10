# config

## Types

### FetchConfig

```typescript
interface FetchConfig { readonly url: string; readonly token: string; readonly outputDir: string; ... }
```

## Functions

### resolveConfig

```typescript
resolveConfig(partial: RequiredConfigFields & Partial<Omit<import("/home/david/dev/inlight/ligma/src/config").FetchConfig, "url" | "token">>): import("/home/david/dev/inlight/ligma/src/config").FetchConfig
```
