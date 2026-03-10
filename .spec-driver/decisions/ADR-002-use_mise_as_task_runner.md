---
id: ADR-002
title: 'ADR-002: Use mise as task runner'
status: accepted
created: '2026-03-10'
updated: '2026-03-10'
reviewed: '2026-03-10'
owners: []
supersedes: []
superseded_by: []
policies: []
specs: []
requirements: []
deltas: []
revisions: []
audits: []
related_decisions:
  - ADR-001
related_policies: []
tags:
  - tooling
  - quality
summary: mise is the canonical task runner. `mise run` is the quality gate before task completion and commits.
---

# ADR-002: Use mise as task runner

## Context

Need a single command to run all quality checks (typecheck, test, lint) as a gate before commits and task completion.

## Decision

- `mise` is the canonical task runner (`mise.toml` defines tasks)
- `mise run` (default task) runs `mise check` → typecheck + test + lint
- `mise run` must pass before declaring any task complete or committing code changes

## Consequences

### Positive
- Single command quality gate — no forgetting individual checks
- Task definitions live in `mise.toml`, not scattered across package.json scripts

### Negative
- Requires mise in the development environment

## Verification
- `mise run` exits 0

## References
- `mise.toml`
- ADR-001 (zero-tolerance lint — enforced via `mise run lint`)
