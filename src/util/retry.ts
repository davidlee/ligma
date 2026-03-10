export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  shouldRetry?: (error: unknown) => boolean | RetryDecision
}

export interface RetryDecision {
  retry: boolean
  delayMs?: number
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function resolveDecision(
  result: boolean | RetryDecision,
): RetryDecision {
  if (typeof result === 'boolean') {
    return { retry: result }
  }
  return result
}

function computeDelay(
  decision: RetryDecision,
  attempt: number,
  baseDelay: number,
): number {
  return decision.delayMs ?? baseDelay * 2 ** attempt
}

async function attemptWithBackoff<T>(
  function_: () => Promise<T>,
  shouldRetry: (error: unknown) => boolean | RetryDecision,
  attempt: number,
  maxRetries: number,
  baseDelay: number,
): Promise<T> {
  try {
    return await function_()
  } catch (error: unknown) {
    if (attempt >= maxRetries) {
      throw error
    }

    const decision = resolveDecision(shouldRetry(error))
    if (!decision.retry) {
      throw error
    }

    await delay(computeDelay(decision, attempt, baseDelay))
    return await attemptWithBackoff(function_, shouldRetry, attempt + 1, maxRetries, baseDelay)
  }
}

export async function withRetry<T>(
  function_: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3
  const baseDelay = options?.baseDelay ?? 1000
  const shouldRetry = options?.shouldRetry ?? ((): boolean => false)

  return await attemptWithBackoff(function_, shouldRetry, 0, maxRetries, baseDelay)
}
