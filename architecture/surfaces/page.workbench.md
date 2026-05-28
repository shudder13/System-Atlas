---
id: page.workbench
type: page
name: Workbench (/)
owner: architecture
status: active
criticality: high
responsibilities:
  - "Single-page React app that owns the entire workbench: canvas, inspector, inventory, preview panel"
dependencies: []
invariants: []
linked_files:
  - src/App.tsx
  - index.html
linked_tests: []
risks: []
confidence: manual
notes: ""
tags: []
architecture_level: component
metadata:
  route: /
  layout: App shell with sidebar inventory, central canvas, and right-side inspector
  authRequired: false
  components:
    - AtlasCanvas
    - Inspector
    - Inventory
    - PreviewPanel
    - ImportReview
    - CodeIntelligenceExplorer
    - StructuredEditors
  dataFetched:
    - GET /api/project
    - GET /api/templates
    - GET /api/pack-health
    - GET /api/code-intelligence
  ssrMode: CSR (Vite SPA)
  seo: Private/no-index — local dev tool, not deployed

---

# Workbench (/)

**Type:** `page` · **Criticality:** high · **Status:** active · **Confidence:** manual · **Level:** component · **Owner:** architecture

## Metadata

- **Route:** /
- **Layout:** App shell with sidebar inventory, central canvas, and right-side inspector
- **Auth Required:** no
- **Components:**
  - AtlasCanvas
  - Inspector
  - Inventory
  - PreviewPanel
  - ImportReview
  - CodeIntelligenceExplorer
  - StructuredEditors
- **Data Fetched:**
  - GET /api/project
  - GET /api/templates
  - GET /api/pack-health
  - GET /api/code-intelligence
- **Ssr Mode:** CSR (Vite SPA)
- **Seo:** Private/no-index — local dev tool, not deployed

## Responsibilities

- Single-page React app that owns the entire workbench: canvas, inspector, inventory, preview panel

## Linked files

- `src/App.tsx`
- `index.html`
