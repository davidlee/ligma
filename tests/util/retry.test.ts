import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { withRetry } from '../../src/util/retry.js'

function rejectWith(error: Error): () => Promise<string> {
  return () => Promise.reject(error)
}

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns result on first successful call', async () => {
    const function_ = vi.fn<() => Promise<string>>().mockResolvedValue('ok')
    const result = await withRetry(function_)
    expect(result).toBe('ok')
    expect(function_).toHaveBeenCalledOnce()
  })

  it('retries on failure and returns result on eventual success', async () => {
    const function_ = vi.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('ok')

    const promise = withRetry(function_, { shouldRetry: () => true })
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise

    expect(result).toBe('ok')
    expect(function_).toHaveBeenCalledTimes(3)
  })

  it('throws after exhausting all retries', async () => {
    let callCount = 0
    const function_ = vi.fn<() => Promise<string>>().mockImplementation(() => {
      callCount++
      return rejectWith(new Error('always fails'))()
    })

    const promise = withRetry(function_, {
      maxRetries: 2,
      shouldRetry: () => true,
    })
    const resultPromise = promise.catch((error: unknown) => error)

    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)

    const error = await resultPromise
    expect(error).toBeInstanceOf(Error)
    expect((error instanceof Error) ? error.message : '').toBe('always fails')
    expect(callCount).toBe(3)
  })

  it('does not retry when shouldRetry returns false', async () => {
    const error = new Error('non-retriable')
    const function_ = vi.fn<() => Promise<string>>().mockImplementation(
      () => rejectWith(error)(),
    )

    await expect(
      withRetry(function_, { shouldRetry: () => false }),
    ).rejects.toThrow('non-retriable')

    expect(function_).toHaveBeenCalledOnce()
  })

  it('uses exponential backoff delays', async () => {
    const function_ = vi.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValue('ok')

    const promise = withRetry(function_, {
      baseDelay: 100,
      shouldRetry: () => true,
    })

    await vi.advanceTimersByTimeAsync(50)
    expect(function_).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(50)
    expect(function_).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(200)
    const result = await promise
    expect(result).toBe('ok')
    expect(function_).toHaveBeenCalledTimes(3)
  })

  it('respects custom maxRetries', async () => {
    let callCount = 0
    const function_ = vi.fn<() => Promise<string>>().mockImplementation(() => {
      callCount++
      return rejectWith(new Error('fail'))()
    })

    const promise = withRetry(function_, {
      maxRetries: 1,
      shouldRetry: () => true,
    })
    const resultPromise = promise.catch((error: unknown) => error)

    await vi.advanceTimersByTimeAsync(1000)

    const error = await resultPromise
    expect(error).toBeInstanceOf(Error)
    expect(callCount).toBe(2)
  })

  it('defaults to 3 max retries', async () => {
    let callCount = 0
    const function_ = vi.fn<() => Promise<string>>().mockImplementation(() => {
      callCount++
      return rejectWith(new Error('fail'))()
    })

    const promise = withRetry(function_, { shouldRetry: () => true })
    const resultPromise = promise.catch((error: unknown) => error)

    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(4000)

    const error = await resultPromise
    expect(error).toBeInstanceOf(Error)
    expect(callCount).toBe(4)
  })

  it('passes the error to shouldRetry', async () => {
    const specificError = new Error('specific')
    const function_ = vi.fn<() => Promise<string>>().mockImplementation(
      () => rejectWith(specificError)(),
    )
    const shouldRetry = vi.fn<(error: unknown) => boolean>().mockReturnValue(false)

    await expect(
      withRetry(function_, { shouldRetry }),
    ).rejects.toThrow('specific')

    expect(shouldRetry).toHaveBeenCalledWith(specificError)
  })

  it('respects overrideDelay from shouldRetry', async () => {
    const function_ = vi.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('rate limited'))
      .mockResolvedValue('ok')

    const promise = withRetry(function_, {
      baseDelay: 100,
      shouldRetry: () => ({ retry: true, delayMs: 5000 }),
    })

    await vi.advanceTimersByTimeAsync(100)
    expect(function_).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(4900)
    const result = await promise
    expect(result).toBe('ok')
    expect(function_).toHaveBeenCalledTimes(2)
  })
})
