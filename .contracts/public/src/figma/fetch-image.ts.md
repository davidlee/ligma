# figma.fetch-image

## Types

### FetchImageResult

```typescript
interface FetchImageResult { format: 'png' | 'svg'; buffer: Buffer; sourceUrl: string }
```

## Functions

### fetchImage

```typescript
async fetchImage(client: import("/home/david/dev/inlight/ligma/src/figma/client").FigmaClient, fileKey: string, nodeId: string, options: import("/home/david/dev/inlight/ligma/src/figma/endpoints").ImagesEndpointOptions): Promise<import("/home/david/dev/inlight/ligma/src/figma/fetch-image").FetchImageResult>
```
