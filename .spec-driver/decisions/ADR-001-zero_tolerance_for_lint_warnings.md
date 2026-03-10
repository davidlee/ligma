---
id: ADR-001
title: 'ADR-001: Zero tolerance for lint warnings'
status: accepted
created: '2026-03-10'
updated: '2026-03-10'
reviewed: '2026-03-10'
owners: []
supersedes: []
superseded_by: []
policies: []
specs:
  - SPEC-001
requirements: []
deltas: []
revisions: []
audits: []
related_decisions: []
related_policies: []
tags:
  - lint
  - quality
summary: All code must pass eslint with zero warnings. No warning-level rules — every rule is error or off.
---

# ADR-001: Zero tolerance for lint warnings

## Context

Lint warnings accumulate silently and erode code quality over time. Agents and humans both learn to ignore yellow output. A strict lint gate prevents degradation and makes CI pass/fail binary.

## Decision

- All eslint rules are configured as `error` or `off` — never `warn`.
- `pnpm lint` must exit 0 with zero diagnostics before any commit containing source changes.
- The lint configuration is defined in `docs/lint.md` and implemented in `eslint.config.js`.

## Consequences

### Positive
- Binary pass/fail — no ambiguity about build health
- Prevents warning debt accumulation
- Agents get immediate, actionable feedback

### Negative
- Stricter rules may slow initial scaffolding (mitigated by targeted relaxation documented in `docs/lint.md`)

### Neutral
- Lint config becomes a first-class project artefact requiring its own delta to change

## Verification
- `pnpm lint` exits 0 in CI and before commits
- No `warn` severity rules in `eslint.config.js`

## References
- `docs/lint.md` — canonical lint configuration
