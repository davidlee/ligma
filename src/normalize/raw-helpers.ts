import type { FigmaNode } from '../figma/types-raw.js'
import type { Confidence } from '../schemas/normalized.js'

export interface AnalysisResult<T> {
  value: T
  confidence: Confidence
  warnings: string[]
}

export interface ExtractorResult<T> extends AnalysisResult<T> {
  omittedFields: string[]
}

/**
 * Access a passthrough field on a FigmaNode (DEC-017).
 * FigmaNode has an index signature `[key: string]: unknown`,
 * so direct indexing returns `unknown` without needing type assertions.
 */
export function getRawProperty(node: FigmaNode, key: string): unknown {
  return node[key]
}

export function getRawString(
  node: FigmaNode, key: string, defaultValue: string,
): string {
  const value = node[key]
  return typeof value === 'string' ? value : defaultValue
}

export function getRawNumber(
  node: FigmaNode, key: string, defaultValue: number,
): number {
  const value = node[key]
  return typeof value === 'number' ? value : defaultValue
}

export function getRawBoolean(
  node: FigmaNode, key: string, defaultValue: boolean,
): boolean {
  const value = node[key]
  return typeof value === 'boolean' ? value : defaultValue
}

export function getRawArray(node: FigmaNode, key: string): unknown[] {
  const value = node[key]
  return Array.isArray(value) ? value : []
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function getRawRecord(
  node: FigmaNode, key: string,
): Record<string, unknown> | undefined {
  const value = node[key]
  return isRecord(value) ? value : undefined
}

export function ok<T>(value: T): ExtractorResult<T> {
  return { value, confidence: 'high', warnings: [], omittedFields: [] }
}

/** Convert Figma RGBA color {r, g, b, a} to hex string (DEC-020). */
export function colorToHex(color: unknown): string | null {
  if (!isRecord(color)) {
    return null
  }
  const { r, g, b, a } = color
  if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
    return null
  }
  const red = Math.round(r * 255).toString(16).padStart(2, '0')
  const green = Math.round(g * 255).toString(16).padStart(2, '0')
  const blue = Math.round(b * 255).toString(16).padStart(2, '0')

  if (typeof a === 'number' && a < 1) {
    const alpha = Math.round(a * 255).toString(16).padStart(2, '0')
    return `#${red}${green}${blue}${alpha}`
  }
  return `#${red}${green}${blue}`
}
