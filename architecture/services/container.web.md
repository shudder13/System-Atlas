---
id: container.web
type: container
name: Web Client (Vite + React)
owner: architecture
status: active
criticality: high
responsibilities:
  - React Flow canvas for each architecture view
  - Trigger Scan/Validate/Export/Brief via the API
dependencies: []
invariants: []
linked_files:
  - src/
  - index.html
  - vite.config.ts
linked_tests: []
risks: []
confidence: manual
notes: ""
tags: []
architecture_level: container
metadata:
  sla: Dev-only; no production SLA
  scaling: Single user, single browser tab

---

# Web Client (Vite + React)

**Type:** `container` · **Criticality:** high · **Status:** active · **Confidence:** manual · **Level:** container · **Owner:** architecture

## Metadata

- **Sla:** Dev-only; no production SLA
- **Scaling:** Single user, single browser tab

## Responsibilities

- React Flow canvas for each architecture view
- Trigger Scan/Validate/Export/Brief via the API

## Linked files

- `src/`
- `index.html`
- `vite.config.ts`
