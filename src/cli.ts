#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { Command } from 'commander'

import { assetFileName, collectExportTargets, toAssetListEntry } from './assets/collect.js'
import { fetchImageCached, fetchNodeCached } from './cache/index.js'
import { resolveConfig } from './config.js'
import { FigmaError } from './errors.js'
import { normalize } from './normalize/index.js'
import { orchestrate } from './orchestrate.js'
import { writeOutput } from './output/write.js'
import { createSession } from './session.js'
import { log } from './util/log.js'

import type { ErrorContext } from './errors.js'

function formatContext(context: ErrorContext): string {
  return JSON.stringify(context, null, 2)
}

function handleError(error: unknown): never {
  if (error instanceof FigmaError) {
    log.error(error.message)
    if (error.context !== undefined) {
      log.error(formatContext(error.context))
    }
  } else if (error instanceof Error) {
    log.error(error.message)
  } else {
    log.error('An unexpected error occurred')
  }
  process.exit(1)
}

function resolveToken(options: { token?: string }): string {
  const token = options.token !== undefined && options.token !== ''
    ? options.token
    : process.env.FIGMA_TOKEN
  if (token === undefined || token === '') {
    log.error('Missing Figma token. Pass --token or set FIGMA_TOKEN.')
    process.exit(1)
  }
  return token
}

function parseAssetFormat(value: string): 'auto' | 'png' | 'svg' {
  if (value === 'auto' || value === 'png' || value === 'svg') {
    return value
  }
  log.error(`Invalid asset format "${value}". Must be auto, png, or svg.`)
  process.exit(1)
}

// --- Options interfaces ---

interface DefaultOptions {
  token?: string
  out: string
  format: string
  scale: string
  depth: string
  includeHidden: boolean
  noExpand: boolean
  maxExpand: string
  expandDepth: string
  noCache: boolean
  cacheDirectory: string
  maxAssets: string
  assetFormat: string
}

interface ListAssetsOptions {
  token?: string
  depth: string
  noCache: boolean
  cacheDirectory: string
  maxAssets: string
}

interface GetAssetOptions {
  token?: string
  out: string
  format: string
  noCache: boolean
  cacheDirectory: string
}

// --- Default command ---

const program = new Command()
  .name('ligma')
  .description('Fetch a Figma node and export artifacts')

program
  .argument('<url>', 'Figma URL with node-id query parameter')
  .option('-t, --token <token>', 'Figma personal access token (or set FIGMA_TOKEN)')
  .option('-o, --out <dir>', 'Output directory', './artifacts')
  .option('-f, --format <format>', 'Image format (png or svg)', 'png')
  .option('-s, --scale <number>', 'Image scale (0.01-4.0)', '2')
  .option('-d, --depth <number>', 'Node tree depth', '2')
  .option('--include-hidden', 'Include hidden nodes in outline JSON/XML and context.md notes', false)
  .option('--no-expand', 'Disable selective expansion')
  .option('--max-expand <number>', 'Maximum expansion targets', '10')
  .option('--expand-depth <number>', 'Depth for expansion refetches', '2')
  .option('--no-cache', 'Disable fetch caching')
  .option('--cache-directory <path>', 'Cache directory path', '.cache/figma-fetch')
  .option('--max-assets <number>', 'Maximum assets to export', '20')
  .option('--asset-format <format>', 'Asset export format: auto, png, svg', 'auto')
  .action(async (url: string, options: DefaultOptions) => {
    const token = resolveToken(options)
    const config = resolveConfig({
      url,
      token,
      outputDir: options.out,
      format: options.format === 'svg' ? 'svg' : 'png',
      scale: Number(options.scale),
      depth: Number(options.depth),
      includeHidden: options.includeHidden,
      expansionEnabled: !options.noExpand,
      maxExpansionTargets: Number(options.maxExpand),
      expansionDepth: Number(options.expandDepth),
      cacheEnabled: !options.noCache,
      cacheDirectory: options.cacheDirectory,
      maxAssets: Number(options.maxAssets),
      assetFormat: parseAssetFormat(options.assetFormat),
    })
    const session = createSession(config)
    const result = await orchestrate(session)
    await writeOutput(config.outputDir, result)
    log.info(`Artifacts written to ${config.outputDir}`)
  })

// --- list-assets subcommand ---

program
  .command('list-assets')
  .description('List detected export targets as JSON')
  .argument('<url>', 'Figma URL with node-id query parameter')
  .option('-t, --token <token>', 'Figma personal access token (or set FIGMA_TOKEN)')
  .option('-d, --depth <number>', 'Node tree depth', '2')
  .option('--no-cache', 'Disable fetch caching')
  .option('--cache-directory <path>', 'Cache directory path', '.cache/figma-fetch')
  .option('--max-assets <number>', 'Maximum assets to export', '20')
  .action(async (url: string, options: ListAssetsOptions) => {
    const token = resolveToken(options)
    const config = resolveConfig({
      url,
      token,
      depth: Number(options.depth),
      cacheEnabled: !options.noCache,
      cacheDirectory: options.cacheDirectory,
      maxAssets: Number(options.maxAssets),
    })
    const session = createSession(config)
    const { response } = await fetchNodeCached(
      session.client, session.cache, session.parsed.fileKey, session.parsed.nodeId,
      { depth: config.depth, version: null },
    )
    const normalizedNode = normalize(response.document)
    const targets = collectExportTargets(normalizedNode, config.maxAssets)
    const entries = targets.map(toAssetListEntry)
    process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`)
  })

// --- get-asset subcommand ---

program
  .command('get-asset')
  .description('Fetch a single asset by node ID and write to disk')
  .argument('<url>', 'Figma URL with node-id query parameter')
  .argument('<node-id>', 'Figma node ID of the asset to fetch')
  .option('-t, --token <token>', 'Figma personal access token (or set FIGMA_TOKEN)')
  .option('-o, --out <dir>', 'Output directory', './artifacts')
  .option('-f, --format <format>', 'Image format (png or svg)', 'png')
  .option('--no-cache', 'Disable fetch caching')
  .option('--cache-directory <path>', 'Cache directory path', '.cache/figma-fetch')
  .action(async (url: string, nodeId: string, options: GetAssetOptions) => {
    const token = resolveToken(options)
    const format = options.format === 'svg' ? 'svg' as const : 'png' as const
    const config = resolveConfig({
      url,
      token,
      outputDir: options.out,
      format,
      cacheEnabled: !options.noCache,
      cacheDirectory: options.cacheDirectory,
    })
    const session = createSession(config)
    const { result } = await fetchImageCached(
      session.client, session.cache, session.parsed.fileKey, nodeId,
      { format: config.format, version: null },
    )
    const target = { nodeId, nodeName: nodeId, kind: 'bitmap' as const, reason: null }
    const fileName = assetFileName(target, result.format)
    const directory = join(config.outputDir, 'assets')
    await mkdir(directory, { recursive: true })
    const filePath = join(directory, fileName)
    await writeFile(filePath, result.buffer)
    process.stdout.write(`${resolve(filePath)}\n`)
  })

program.parseAsync(process.argv).catch(handleError)
