#!/usr/bin/env node

import { Command } from 'commander'

import { resolveConfig } from './config.js'
import { FigmaError } from './errors.js'
import { orchestrate } from './orchestrate.js'
import { writeOutput } from './output/write.js'
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

interface CliOptions {
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

const program = new Command()
  .name('ligma')
  .description('Fetch a Figma node and export artifacts')
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
  .action(async (url: string, options: CliOptions) => {
    const token = options.token !== undefined && options.token !== ''
      ? options.token
      : process.env.FIGMA_TOKEN
    if (token === undefined || token === '') {
      log.error('Missing Figma token. Pass --token or set FIGMA_TOKEN.')
      process.exit(1)
    }
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
    const result = await orchestrate(config)
    await writeOutput(config.outputDir, result)
    log.info(`Artifacts written to ${config.outputDir}`)
  })

function parseAssetFormat(value: string): 'auto' | 'png' | 'svg' {
  if (value === 'auto' || value === 'png' || value === 'svg') {
    return value
  }
  log.error(`Invalid asset format "${value}". Must be auto, png, or svg.`)
  process.exit(1)
}

program.parseAsync(process.argv).catch(handleError)
