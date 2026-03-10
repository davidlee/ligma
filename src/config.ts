export interface FetchConfig {
  readonly url: string
  readonly token: string
  readonly outputDir: string
  readonly format: 'png' | 'svg'
  readonly scale: number
  readonly depth: number
}

type RequiredConfigFields = Pick<FetchConfig, 'url' | 'token'>
type OptionalConfigFields = Partial<Omit<FetchConfig, 'url' | 'token'>>

const DEFAULTS: Omit<FetchConfig, 'url' | 'token'> = {
  outputDir: './artifacts',
  format: 'png',
  scale: 2,
  depth: 2,
}

export function resolveConfig(
  partial: RequiredConfigFields & OptionalConfigFields,
): FetchConfig {
  return {
    ...DEFAULTS,
    ...partial,
  }
}
