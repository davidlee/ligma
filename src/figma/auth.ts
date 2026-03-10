import { FigmaAuthError } from '../errors.js'

export interface FigmaAuth {
  readonly token: string
  header(): Record<string, string>
}

export function createAuth(token: string): FigmaAuth {
  if (token === '') {
    throw new FigmaAuthError('Token must not be empty')
  }

  return {
    token,
    header(): Record<string, string> {
      return { 'X-Figma-Token': token }
    },
  }
}
