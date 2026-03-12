import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createMcpServer } from '../src/mcp.js'

// --- Figma mock data ---

const MOCK_NODES_RESPONSE = {
  name: 'Test File',
  lastModified: '2026-03-10T00:00:00Z',
  version: '12345',
  nodes: {
    '0:1': {
      document: { id: '0:1', name: 'Frame', type: 'FRAME', children: [] },
      components: {},
      schemaVersion: 0,
    },
  },
}

const MOCK_IMAGES_RESPONSE = {
  images: { '0:1': 'https://figma-cdn.example.com/rendered.png' },
}

const MOCK_IMAGE_BINARY = Buffer.from([0x89, 0x50, 0x4e, 0x47])

const FIGMA_URL = 'https://www.figma.com/design/abc123/MyFile?node-id=0-1'

// --- Test helpers ---

function mockFetch(): void {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/v1/files/') && url.includes('/nodes')) {
      return Promise.resolve(new Response(JSON.stringify(MOCK_NODES_RESPONSE)))
    }
    if (url.includes('/v1/images/')) {
      return Promise.resolve(new Response(JSON.stringify(MOCK_IMAGES_RESPONSE)))
    }
    if (url.includes('figma-cdn.example.com')) {
      return Promise.resolve(new Response(MOCK_IMAGE_BINARY))
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  }))
}

interface ConnectedPair {
  client: Client
  cleanup: () => Promise<void>
}

async function createConnectedPair(): Promise<ConnectedPair> {
  const server = createMcpServer('test-token')
  const client = new Client({ name: 'test-client', version: '1.0.0' })

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ])

  return {
    client,
    cleanup: async (): Promise<void> => {
      await client.close()
      await server.close()
    },
  }
}

/**
 * Call an MCP tool and extract the first text content.
 * The SDK's index signature (`[x: string]: unknown`) makes typed access verbose;
 * round-tripping through JSON and validating with zod strips it cleanly.
 */
const ToolTextResultSchema = z.object({
  content: z.array(z.object({
    type: z.literal('text'),
    text: z.string(),
  })).nonempty(),
})

async function callToolForText(client: Client, name: string, toolArguments: Record<string, unknown>): Promise<string> {
  const raw = await client.callTool({ name, arguments: toolArguments }, CallToolResultSchema)
  const result = ToolTextResultSchema.parse(JSON.parse(JSON.stringify(raw)))
  return result.content[0].text
}

async function callToolForJson(client: Client, name: string, toolArguments: Record<string, unknown>): Promise<Record<string, unknown>> {
  const text = await callToolForText(client, name, toolArguments)
  return z.record(z.unknown()).parse(JSON.parse(text))
}

// --- Tests ---

describe('MCP server', () => {
  beforeEach(() => {
    mockFetch()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists all 6 tools', async () => {
    const { client, cleanup } = await createConnectedPair()
    try {
      const result = await client.listTools()
      const names = result.tools.map((t) => t.name).sort()

      expect(names).toEqual([
        'figma_get_asset',
        'figma_get_assets',
        'figma_get_node',
        'figma_get_outline',
        'figma_get_render',
        'figma_list_assets',
      ])
    } finally {
      await cleanup()
    }
  })

  describe('figma_get_node', () => {
    it('returns normalized node, context markdown, and tokens used', async () => {
      const { client, cleanup } = await createConnectedPair()
      try {
        const parsed = await callToolForJson(client, 'figma_get_node', { url: FIGMA_URL })

        expect(parsed).toHaveProperty('normalizedNode')
        expect(parsed).toHaveProperty('contextMd')
        expect(parsed).toHaveProperty('tokensUsed')
        expect(parsed).toHaveProperty('normalizedNode.name', 'Frame')
      } finally {
        await cleanup()
      }
    })

    it('accepts optional depth parameter', async () => {
      const { client, cleanup } = await createConnectedPair()
      try {
        const parsed = await callToolForJson(client, 'figma_get_node', { url: FIGMA_URL, depth: 3 })

        expect(parsed).toHaveProperty('normalizedNode')
      } finally {
        await cleanup()
      }
    })
  })

  describe('figma_get_outline', () => {
    it('returns outline JSON and XML', async () => {
      const { client, cleanup } = await createConnectedPair()
      try {
        const parsed = await callToolForJson(client, 'figma_get_outline', { url: FIGMA_URL })

        expect(parsed).toHaveProperty('outline')
        expect(parsed).toHaveProperty('xml')
        expect(parsed).toHaveProperty('outline.name', 'Frame')
        expect(typeof parsed.xml).toBe('string')
        expect(String(parsed.xml)).toContain('<')
      } finally {
        await cleanup()
      }
    })
  })

  describe('figma_get_render', () => {
    it('writes image to disk and returns file path', async () => {
      const { client, cleanup } = await createConnectedPair()
      try {
        const filePath = await callToolForText(client, 'figma_get_render', {
          url: FIGMA_URL,
          outputDir: '/tmp/ligma-test-render',
        })

        expect(filePath).toContain('/tmp/ligma-test-render/visual/')
        expect(filePath).toMatch(/\.png$/)
      } finally {
        await cleanup()
      }
    })
  })

  describe('figma_list_assets', () => {
    it('returns empty array when no export targets exist', async () => {
      const { client, cleanup } = await createConnectedPair()
      try {
        const text = await callToolForText(client, 'figma_list_assets', { url: FIGMA_URL })
        expect(JSON.parse(text)).toEqual([])
      } finally {
        await cleanup()
      }
    })
  })

  describe('figma_get_asset', () => {
    it('writes asset to disk and returns file path', async () => {
      const { client, cleanup } = await createConnectedPair()
      try {
        const filePath = await callToolForText(client, 'figma_get_asset', {
          url: FIGMA_URL,
          nodeId: '0:1',
          outputDir: '/tmp/ligma-test-asset',
        })

        expect(filePath).toContain('/tmp/ligma-test-asset/assets/')
        expect(filePath).toMatch(/\.png$/)
      } finally {
        await cleanup()
      }
    })
  })

  describe('figma_get_assets', () => {
    it('returns empty when no export targets exist', async () => {
      const { client, cleanup } = await createConnectedPair()
      try {
        const parsed = await callToolForJson(client, 'figma_get_assets', { url: FIGMA_URL })

        expect(parsed).toHaveProperty('assets', [])
        expect(parsed).toHaveProperty('message', 'No export-suggested assets found.')
      } finally {
        await cleanup()
      }
    })
  })
})
