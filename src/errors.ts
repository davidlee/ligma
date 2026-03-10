export type ErrorContext = Record<string, unknown>

export interface FigmaErrorOptions extends ErrorOptions {
  context?: ErrorContext
}

export class FigmaError extends Error {
  readonly context?: ErrorContext

  constructor(message: string, options?: FigmaErrorOptions) {
    super(message, options)
    this.name = this.constructor.name
    this.context = options?.context
  }
}

export class FigmaUrlParseError extends FigmaError {}
export class FigmaAuthError extends FigmaError {}
export class FigmaNotFoundError extends FigmaError {}

export interface FigmaRateLimitErrorOptions extends FigmaErrorOptions {
  retryAfter?: number
}

export class FigmaRateLimitError extends FigmaError {
  readonly retryAfter?: number

  constructor(message: string, options?: FigmaRateLimitErrorOptions) {
    super(message, options)
    this.retryAfter = options?.retryAfter
  }
}

export class FigmaRenderError extends FigmaError {}
export class NormalizationError extends FigmaError {} // Defined for hierarchy; used in DE-003+
