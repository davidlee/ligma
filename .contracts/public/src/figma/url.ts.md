# figma.url

## Types

### ParsedFigmaUrl

```typescript
interface ParsedFigmaUrl { fileKey: string; nodeId: string; originalUrl: string }
```

## Functions

### parseFigmaUrl

```typescript
parseFigmaUrl(url: string): import("/home/david/dev/inlight/ligma/src/figma/url").ParsedFigmaUrl
```

Parse a Figma URL into { fileKey, nodeId, originalUrl }.
Converts node IDs from URL format (123-456) to API format (123:456).
Throws FigmaUrlParseError on invalid input.
