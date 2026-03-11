export interface FetchConfig {
  readonly url: string
  readonly token: string
  readonly outputDir: string
  readonly format: 'png' | 'svg'
  readonly scale: number
  readonly depth: number
  readonly includeHidden: boolean
  readonly expansionEnabled: boolean
  readonly maxExpansionTargets: number
  readonly expansionDepth: number
  readonly cacheEnabled: boolean
  readonly cacheDirectory: string
}

type RequiredConfigFields = Pick<FetchConfig, 'url' | 'token'>
type OptionalConfigFields = Partial<Omit<FetchConfig, 'url' | 'token'>>

const DEFAULTS: Omit<FetchConfig, 'url' | 'token'> = {
  outputDir: './artifacts',
  format: 'png',
  scale: 2,
  depth: 2,
  includeHidden: false,
  expansionEnabled: true,
  maxExpansionTargets: 10,
  expansionDepth: 2,
  cacheEnabled: true,
  cacheDirectory: '.cache/figma-fetch',
}

function validateConfig(config: FetchConfig): void {
  if (config.depth < 1) {
    throw new Error('depth must be >= 1')
  }
  if (config.expansionDepth < 1) {
    throw new Error('expansionDepth must be >= 1')
  }
  if (config.maxExpansionTargets < 0) {
    throw new Error('maxExpansionTargets must be >= 0')
  }
  if (config.scale <= 0) {
    throw new Error('scale must be > 0')
  }
}

export function resolveConfig(
  partial: RequiredConfigFields & OptionalConfigFields,
): FetchConfig {
  const config: FetchConfig = {
    ...DEFAULTS,
    ...partial,
  }
  validateConfig(config)
  return config
}
