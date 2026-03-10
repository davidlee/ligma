# figma.client

## Types

### FigmaClient

```typescript
interface FigmaClient { request(url: string): Promise<unknown> }
```

### FigmaClientOptions

```typescript
interface FigmaClientOptions { auth: FigmaAuth; concurrency?: number }
```

## Functions

### createClient

```typescript
createClient(options: import("/home/david/dev/inlight/ligma/src/figma/client").FigmaClientOptions): import("/home/david/dev/inlight/ligma/src/figma/client").FigmaClient
```
