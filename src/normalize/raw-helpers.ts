import type { FigmaNode } from '../figma/types-raw.js'

export interface ExtractorResult<T> {
  value: T
  warnings: string[]
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
  return { value, warnings: [], omittedFields: [] }
}
