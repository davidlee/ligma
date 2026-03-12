# ligma

CLI alternative to the Figma MCP. Fetches a Figma node and emits a
deterministic, token-efficient artifact bundle optimized for code agents.

Made with [spec-driver](https://github.com/davidlee/spec-driver).

## Install

```sh
pnpm install
pnpm build
```

Requires Node >= 18.

### MCP server setup (Claude Code)

Add ligma as an MCP server so Claude can fetch Figma nodes directly:

```sh
claude mcp add ligma -- ligma mcp
```

Set `FIGMA_TOKEN` in your environment, or pass it via the MCP config:

```json
{
  "mcpServers": {
    "ligma": {
      "command": "ligma",
      "args": ["mcp"],
      "env": {
        "FIGMA_TOKEN": "your-figma-token"
      }
    }
  }
}
```

The server exposes 6 tools: `figma_get_node`, `figma_get_outline`, `figma_get_render`, `figma_list_assets`, `figma_get_asset`, `figma_get_assets`.

## Usage

```sh
export FIGMA_TOKEN="<your-figma-personal-access-token>"

ligma <figma-url>
```

Or pass the token inline:

```sh
ligma <figma-url> --token <token>
```

Note: it takes a hot minute and there's no feedback during download. Little spinner coming soon (ironic, eh?).

### Subcommands

#### `list-assets`

List detected export targets as JSON:

```sh
ligma list-assets <figma-url>
```

Outputs a JSON array of `{ nodeId, name, format, reason }` to stdout.

| Flag | Default | Description |
|------|---------|-------------|
| `-t, --token <token>` | `$FIGMA_TOKEN` | Figma personal access token |
| `-d, --depth <n>` | `2` | Node tree depth |
| `--max-assets <n>` | `20` | Maximum assets to list |
| `--no-cache` | | Disable fetch caching |
| `--cache-directory <path>` | `.cache/figma-fetch` | Cache directory path |

#### `get-asset`

Fetch a single asset by node ID and write to disk:

```sh
ligma get-asset <figma-url> <node-id>
```

Writes the asset file and prints the absolute path to stdout.

| Flag | Default | Description |
|------|---------|-------------|
| `-t, --token <token>` | `$FIGMA_TOKEN` | Figma personal access token |
| `-o, --out <dir>` | `./artifacts` | Output directory |
| `-f, --format <fmt>` | `png` | Image format (`png` or `svg`) |
| `--no-cache` | | Disable fetch caching |
| `--cache-directory <path>` | `.cache/figma-fetch` | Cache directory path |

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `-t, --token <token>` | `$FIGMA_TOKEN` | Figma personal access token |
| `-o, --out <dir>` | `./artifacts` | Output directory |
| `-f, --format <fmt>` | `png` | Image format (`png` or `svg`) |
| `-s, --scale <n>` | `2` | Image scale (0.01 – 4.0) |
| `-d, --depth <n>` | `2` | Node tree depth |
| `--include-hidden` | `false` | Include hidden nodes in outline and context |
| `--no-expand` | | Disable selective expansion |
| `--max-expand <n>` | `10` | Maximum expansion targets |
| `--expand-depth <n>` | `2` | Depth for expansion refetches |
| `--max-assets <n>` | `20` | Maximum assets to export |
| `--asset-format <fmt>` | `auto` | Asset export format (`auto`, `png`, `svg`) |
| `--no-cache` | | Disable fetch caching |
| `--cache-directory <path>` | `.cache/figma-fetch` | Cache directory path |

## Project documentation

- [Technical brief](docs/brief.md)
- [PROD-001 — Figma fetch and normalization pipeline](.spec-driver/product/PROD-001/PROD-001.md)

### Design revisions

| DR | Delta | Description |
|----|-------|-------------|
| [DR-001](.spec-driver/deltas/DE-001-prod_001_delivery_planning/DR-001.md) | DE-001 | PROD-001 delivery planning |
| [DR-002](.spec-driver/deltas/DE-002-project_scaffold_and_figma_client/DR-002.md) | DE-002 | Project scaffold and Figma client |
| [DR-003](.spec-driver/deltas/DE-003-core_normalization_engine/DR-003.md) | DE-003 | Core normalization engine |
| [DR-004](.spec-driver/deltas/DE-004-semantic_inference_tokens_and_assets/DR-004.md) | DE-004 | Semantic inference, tokens, and assets |
| [DR-005](.spec-driver/deltas/DE-005-outline_and_context_generation/DR-005.md) | DE-005 | Outline and context generation |
| [DR-006](.spec-driver/deltas/DE-006-selective_expansion_and_caching/DR-006.md) | DE-006 | Selective expansion and caching |
| [DR-007](.spec-driver/deltas/DE-007-adopt_strict_lint_config_from_docs_lint_md/DR-007.md) | DE-007 | Adopt strict lint config |
| [DR-008](.spec-driver/deltas/DE-008-backlog_fixes_individualstrokeweights_and_interaction_extraction/DR-008.md) | DE-008 | Backlog fixes: individualStrokeWeights and interaction extraction |
| [DR-009](.spec-driver/deltas/DE-009-asset_export_pipeline_fetch_and_write_detected_assets_to_disk/DR-009.md) | DE-009 | Asset export pipeline |
