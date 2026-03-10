# figma.endpoints

## Types

### ImagesEndpointOptions

```typescript
interface ImagesEndpointOptions { format?: 'png' | 'svg'; scale?: number }
```

### NodesEndpointOptions

```typescript
interface NodesEndpointOptions { depth?: number; geometry?: boolean; pluginData?: string }
```

## Functions

### buildImagesEndpoint

```typescript
buildImagesEndpoint(fileKey: string, nodeId: string, options: import("/home/david/dev/inlight/ligma/src/figma/endpoints").ImagesEndpointOptions): string
```

### buildNodesEndpoint

```typescript
buildNodesEndpoint(fileKey: string, nodeId: string, options: import("/home/david/dev/inlight/ligma/src/figma/endpoints").NodesEndpointOptions): string
```
