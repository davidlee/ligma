const BASE_URL = 'https://api.figma.com'

export interface NodesEndpointOptions {
  depth?: number
  geometry?: boolean
  pluginData?: string
}

export interface ImagesEndpointOptions {
  format?: 'png' | 'svg'
  scale?: number
}

export function buildNodesEndpoint(
  fileKey: string,
  nodeId: string,
  options?: NodesEndpointOptions,
): string {
  const url = new URL(`${BASE_URL}/v1/files/${fileKey}/nodes`)
  url.searchParams.set('ids', nodeId)
  url.searchParams.set('depth', String(options?.depth ?? 2))

  if (options?.geometry === true) {
    url.searchParams.set('geometry', 'paths')
  }

  if (options?.pluginData !== undefined) {
    url.searchParams.set('plugin_data', options.pluginData)
  }

  return url.toString()
}

export function buildImagesEndpoint(
  fileKey: string,
  nodeId: string,
  options?: ImagesEndpointOptions,
): string {
  const format = options?.format ?? 'png'
  const url = new URL(`${BASE_URL}/v1/images/${fileKey}`)
  url.searchParams.set('ids', nodeId)
  url.searchParams.set('format', format)

  if (format !== 'svg') {
    url.searchParams.set('scale', String(options?.scale ?? 2))
  }

  return url.toString()
}
