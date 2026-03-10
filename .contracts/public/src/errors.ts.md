# errors

## Types

### ErrorContext

```typescript
type ErrorContext = import("/home/david/dev/inlight/ligma/src/errors").ErrorContext
```

### FigmaErrorOptions

```typescript
interface FigmaErrorOptions { context?: ErrorContext }
```

### FigmaRateLimitErrorOptions

```typescript
interface FigmaRateLimitErrorOptions { retryAfter?: number | undefined }
```

## Classes

### FigmaAuthError

**Extends:** `FigmaError`


### FigmaError

**Properties:**
- `context: import("/home/david/dev/inlight/ligma/src/errors").ErrorContext`


### FigmaNotFoundError

**Extends:** `FigmaError`


### FigmaRateLimitError

**Extends:** `FigmaError`

**Properties:**
- `retryAfter: number`


### FigmaRenderError

**Extends:** `FigmaError`


### FigmaUrlParseError

**Extends:** `FigmaError`


### NormalizationError

**Extends:** `FigmaError`

