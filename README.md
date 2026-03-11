# ligma

CLI alternative to the Figma MCP. Fetches a Figma node and emits a
deterministic, token-efficient artifact bundle optimized for code agents.

## Install

```sh
pnpm install
pnpm build
```

Requires Node >= 18.

## Usage

```sh
export FIGMA_TOKEN="<your-figma-personal-access-token>"

ligma <figma-url>
```

Or pass the token inline:

```sh
ligma <figma-url> --token <token>
```

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
