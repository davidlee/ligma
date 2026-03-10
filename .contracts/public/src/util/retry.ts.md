# util.retry

## Types

### RetryDecision

```typescript
interface RetryDecision { retry: boolean; delayMs?: number }
```

### RetryOptions

```typescript
interface RetryOptions { maxRetries?: number; baseDelay?: number; shouldRetry?: (error: unknown) => boolean | RetryDecision }
```

## Functions

### withRetry

```typescript
async withRetry(function_: () => Promise<T>, options: import("/home/david/dev/inlight/ligma/src/util/retry").RetryOptions): Promise<T>
```
