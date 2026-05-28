---
id: module.atlas_core
type: module
name: atlas-core (pure domain)
owner: architecture
status: active
criticality: critical
responsibilities:
  - Validation, layout, Mermaid, overview, context-pack, migration-brief, semantic-diff
  - Pure functions — no I/O
dependencies: []
invariants:
  - No filesystem or network imports in this module
linked_files:
  - src/lib/atlas.ts
linked_tests:
  - src/lib/atlas.test.ts
risks: []
confidence: manual
notes: ""
tags: []
architecture_level: component
metadata: {}

---

# atlas-core (pure domain)

**Type:** `module` · **Criticality:** critical · **Status:** active · **Confidence:** manual · **Level:** component · **Owner:** architecture

## Responsibilities

- Validation, layout, Mermaid, overview, context-pack, migration-brief, semantic-diff
- Pure functions — no I/O

## Invariants

- No filesystem or network imports in this module

## Linked files

- `src/lib/atlas.ts`

## Linked tests

- `src/lib/atlas.test.ts`
