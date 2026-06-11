---
id: container.api
type: container
name: API Server (Express)
owner: architecture
status: active
criticality: high
responsibilities:
  - Serve /api endpoints
  - Read and write the architecture/ pack on disk
  - Run the workspace scanner
dependencies: []
invariants: []
linked_files:
  - server/index.ts
linked_tests: []
risks: []
confidence: manual
notes: ""
tags: []
architecture_level: container
metadata: {}

---

<!-- The sections below are GENERATED from the YAML frontmatter above. Edit the frontmatter (or use the UI); body edits are overwritten on the next export. -->

# API Server (Express)

**Type:** `container` · **Criticality:** high · **Status:** active · **Confidence:** manual · **Level:** container · **Owner:** architecture

## Responsibilities

- Serve /api endpoints
- Read and write the architecture/ pack on disk
- Run the workspace scanner

## Linked files

- `server/index.ts`
