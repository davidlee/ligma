#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import { assetFileName, collectExportTargets } from './assets/collect.js'
import { fetchAssets } from './assets/fetch.js'
import { fetchImageCached, fetchNodeCached } from './cache/index.js'
import { resolveConfig } from './config.js'
import { normalize } from './normalize/index.js'
import { buildOutline, outlineToXml } from './normalize/outline.js'
import { generateContextMd } from './output/context-md.js'
import { buildManifest } from './output/manifest.js'
import { createSession } from './session.js'
import { aggregateTokensUsed } from './summary/tokens-used.js'

import type { ExportTarget } from './assets/collect.js'
import type { ImageFetcher } from './assets/fetch.js'
import type { FetchConfig } from './config.js'
import type { Session } from './session.js'

// --- Helpers ---

type ConfigOverrides = Partial<Omit<FetchConfig, 'url' | 'token'>>

/** Strip undefined values so exactOptionalPropertyTypes is satisfied. */
function stripUndefined(object: Record<string, unknown>): ConfigOverrides {
  const result: ConfigOverrides = {}
  for (const [key, value] of Object.entries(object)) {
    if (value !== undefined) {
      Object.assign(result, { [key]: value })
    }
  }
  return result
}

function sessionForUrl(token: string, url: string, overrides: Record<string, unknown> = {}): Session {
  return createSession(resolveConfig({ url, token, ...stripUndefined(overrides) }))
}

async function writeImageToDisk(
  buffer: Buffer,
  fileName: string,
  outputDirectory: string,
): Promise<string> {
  await mkdir(outputDirectory, { recursive: true })
  const filePath = join(outputDirectory, fileName)
  await writeFile(filePath, buffer)
  return filePath
}

function textResult(text: string): { content: { type: 'text'; text: string }[] } {
  return { content: [{ type: 'text', text }] }
}

function resolveAssetFormatOverride(
  assetFormat: 'png' | 'svg' | 'auto',
): 'png' | 'svg' | null {
  return assetFormat === 'auto' ? null : assetFormat
}

const MCP_MANIFEST_OUTPUTS: {
  readonly rawNodeJson: string
  readonly normalizedNodeJson: string
  readonly outlineJson: string
  readonly outlineXml: string
  readonly contextMd: string
  readonly tokensUsedJson: string
  readonly assets: readonly string[]
} = {
  rawNodeJson: 'inline',
  normalizedNodeJson: 'inline',
  outlineJson: 'inline',
  outlineXml: 'inline',
  contextMd: 'inline',
  tokensUsedJson: 'inline',
  assets: [],
}

// --- Param schemas ---

const urlParameter = z.string().describe('Figma URL with node-id query parameter')
const depthParameter = z.number().int().min(1).optional().describe('Node tree depth (default: 2)')
const includeHiddenParameter = z.boolean().optional().describe('Include hidden nodes (default: false)')
const formatParameter = z.enum(['png', 'svg']).optional().describe('Image format (default: png)')
const scaleParameter = z.number().min(0.01).max(4).optional().describe('Image scale (default: 2)')
const outputDirectoryParameter = z.string().optional().describe('Output directory (default: ./artifacts)')
const maxAssetsParameter = z.number().int().min(1).max(100).optional().describe('Maximum assets to export (default: 20)')

// --- Tool registration ---

function registerGetNode(server: McpServer, token: string): void {
  server.registerTool(
    'figma_get_node',
    {
      description: 'Fetch a Figma node and return normalized JSON, context markdown, and token usage summary.',
      inputSchema: { url: urlParameter, depth: depthParameter, includeHidden: includeHiddenParameter },
    },
    async (args) => {
      const session = sessionForUrl(token, args.url, { depth: args.depth, includeHidden: args.includeHidden })
      const { client, cache, parsed, config } = session

      const { response } = await fetchNodeCached(client, cache, parsed.fileKey, parsed.nodeId, {
        depth: config.depth,
        version: null,
      })

      const normalizedNode = normalize(response.document)
      const tokensUsed = aggregateTokensUsed(normalizedNode, parsed.fileKey, parsed.nodeId)
      const { outline, hiddenNodesOmitted } = buildOutline(normalizedNode, {
        includeHidden: config.includeHidden,
      })
      const manifest = buildManifest({
        source: {
          fileKey: parsed.fileKey,
          nodeId: parsed.nodeId,
          fileName: response.name,
          version: response.version,
          lastModified: response.lastModified,
        },
        outputs: MCP_MANIFEST_OUTPUTS,
        errors: [],
      })
      const contextMd = generateContextMd({
        node: normalizedNode,
        manifest,
        tokensUsed,
        outline,
        hiddenNodesOmitted,
      })

      return textResult(JSON.stringify({ normalizedNode, contextMd, tokensUsed }, null, 2))
    },
  )
}

function registerGetOutline(server: McpServer, token: string): void {
  server.registerTool(
    'figma_get_outline',
    {
      description: 'Fetch a Figma node and return its structural outline as JSON and XML.',
      inputSchema: { url: urlParameter, depth: depthParameter, includeHidden: includeHiddenParameter },
    },
    async (args) => {
      const session = sessionForUrl(token, args.url, { depth: args.depth, includeHidden: args.includeHidden })
      const { client, cache, parsed, config } = session

      const { response } = await fetchNodeCached(client, cache, parsed.fileKey, parsed.nodeId, {
        depth: config.depth,
        version: null,
      })

      const normalizedNode = normalize(response.document)
      const { outline } = buildOutline(normalizedNode, { includeHidden: config.includeHidden })
      const xml = outlineToXml(outline)

      return textResult(JSON.stringify({ outline, xml }, null, 2))
    },
  )
}

function registerGetRender(server: McpServer, token: string): void {
  server.registerTool(
    'figma_get_render',
    {
      description: 'Render a Figma node as an image, write to disk, and return the file path. May be slow — consider backgrounding.',
      inputSchema: { url: urlParameter, format: formatParameter, scale: scaleParameter, outputDir: outputDirectoryParameter },
    },
    async (args) => {
      const session = sessionForUrl(token, args.url, { format: args.format, scale: args.scale, outputDir: args.outputDir })
      const { client, cache, parsed, config } = session

      const { result } = await fetchImageCached(client, cache, parsed.fileKey, parsed.nodeId, {
        format: config.format,
        scale: config.scale,
        version: null,
      })

      const fileName = `${parsed.nodeId.replaceAll(':', '-')}.${result.format}`
      const directory = join(config.outputDir, 'visual')
      const filePath = await writeImageToDisk(result.buffer, fileName, directory)

      return textResult(filePath)
    },
  )
}

function registerListAssets(server: McpServer, token: string): void {
  server.registerTool(
    'figma_list_assets',
    {
      description: 'Discover export-suggested assets in a Figma node subtree. Returns a JSON list of asset targets.',
      inputSchema: { url: urlParameter, depth: depthParameter, maxAssets: maxAssetsParameter },
    },
    async (args) => {
      const session = sessionForUrl(token, args.url, { depth: args.depth, maxAssets: args.maxAssets })
      const { client, cache, parsed, config } = session

      const { response } = await fetchNodeCached(client, cache, parsed.fileKey, parsed.nodeId, {
        depth: config.depth,
        version: null,
      })

      const normalizedNode = normalize(response.document)
      const targets = collectExportTargets(normalizedNode, config.maxAssets)

      return textResult(JSON.stringify(targets, null, 2))
    },
  )
}

function registerGetAsset(server: McpServer, token: string): void {
  server.registerTool(
    'figma_get_asset',
    {
      description: 'Fetch a single asset by node ID, write to disk, and return the file path. May be slow — consider backgrounding.',
      inputSchema: {
        url: urlParameter,
        nodeId: z.string().describe('The Figma node ID of the asset to fetch'),
        format: formatParameter,
        outputDir: outputDirectoryParameter,
      },
    },
    async (args) => {
      const session = sessionForUrl(token, args.url, { format: args.format, outputDir: args.outputDir })
      const { client, cache, parsed, config } = session

      const { result } = await fetchImageCached(client, cache, parsed.fileKey, args.nodeId, {
        format: config.format,
        version: null,
      })

      const target: ExportTarget = { nodeId: args.nodeId, nodeName: args.nodeId, kind: 'bitmap' }
      const fileName = assetFileName(target, result.format)
      const directory = join(config.outputDir, 'assets')
      const filePath = await writeImageToDisk(result.buffer, fileName, directory)

      return textResult(filePath)
    },
  )
}

function registerGetAssets(server: McpServer, token: string): void {
  server.registerTool(
    'figma_get_assets',
    {
      description: 'Discover and fetch all export-suggested assets from a Figma node subtree. Writes to disk and returns paths. Fetches up to 20 assets. May be slow — consider backgrounding.',
      inputSchema: {
        url: urlParameter,
        depth: depthParameter,
        format: z.enum(['png', 'svg', 'auto']).optional().describe('Asset format override (default: auto)'),
        outputDir: outputDirectoryParameter,
        maxAssets: maxAssetsParameter,
      },
    },
    async (args) => {
      const session = sessionForUrl(token, args.url, { depth: args.depth, outputDir: args.outputDir, maxAssets: args.maxAssets })
      const { client, cache, parsed, config } = session

      const { response } = await fetchNodeCached(client, cache, parsed.fileKey, parsed.nodeId, {
        depth: config.depth,
        version: null,
      })

      const normalizedNode = normalize(response.document)
      const targets = collectExportTargets(normalizedNode, config.maxAssets)

      if (targets.length === 0) {
        return textResult(JSON.stringify({ assets: [], message: 'No export-suggested assets found.' }))
      }

      const formatOverride = resolveAssetFormatOverride(args.format ?? config.assetFormat)
      const fetcher: ImageFetcher = (nid, fmt) =>
        fetchImageCached(client, cache, parsed.fileKey, nid, { format: fmt, version: null })
          .then((r) => r.result.buffer)

      const result = await fetchAssets(fetcher, targets, formatOverride)

      const directory = join(config.outputDir, 'assets')
      await mkdir(directory, { recursive: true })

      const paths: string[] = []
      for (const asset of result.fetched) {
        const fileName = assetFileName(asset.target, asset.format)
        const filePath = join(directory, fileName)
        await writeFile(filePath, asset.buffer)
        paths.push(filePath)
      }

      return textResult(JSON.stringify({ assets: paths, errors: result.errors }, null, 2))
    },
  )
}

// --- Server factory ---

export function createMcpServer(token: string): McpServer {
  const server = new McpServer({ name: 'ligma', version: '0.1.0' })

  registerGetNode(server, token)
  registerGetOutline(server, token)
  registerGetRender(server, token)
  registerListAssets(server, token)
  registerGetAsset(server, token)
  registerGetAssets(server, token)

  return server
}

// --- Main ---

async function main(): Promise<void> {
  const token = process.env.FIGMA_TOKEN
  if (token === undefined || token === '') {
    console.error('FIGMA_TOKEN environment variable is required.')
    process.exit(1)
  }

  const server = createMcpServer(token)
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error: unknown) => {
  console.error('Fatal:', error)
  process.exit(1)
})
