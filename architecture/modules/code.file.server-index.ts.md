---
id: code.file.server-index.ts
type: file_group
name: index.ts
owner: code
status: active
criticality: high
responsibilities:
  - Represents scanned source evidence at server/index.ts.
dependencies:
  - express
  - node:net
  - node:path
  - ../src/data/templates
  - ../src/lib/atlas
  - ../src/types
  - ./atlasFiles
invariants: []
linked_files:
  - server/index.ts
linked_tests: []
risks: []
confidence: observed
notes: |-
  source file
  language: typescript
  208 lines
  routes: GET /api/templates, GET /api/project, GET /api/code-intelligence, GET /api/pack-health, POST /api/draft/validate, POST /api/export, GET /api/project/revision, POST /api/scan
  imports: express, node:net, node:path, ../src/data/templates, ../src/lib/atlas, ../src/types, ./atlasFiles
position:
  x: 600
  y: 90
tags:
  - generated
  - source
architecture_level: code
metadata:
  generatedBy: workspace-scan
  evidencePath: server/index.ts
  evidenceKind: source
  language: typescript
  lines: 208
  symbolCount: 19

---

# index.ts

source file
language: typescript
208 lines
routes: GET /api/templates, GET /api/project, GET /api/code-intelligence, GET /api/pack-health, POST /api/draft/validate, POST /api/export, GET /api/project/revision, POST /api/scan
imports: express, node:net, node:path, ../src/data/templates, ../src/lib/atlas, ../src/types, ./atlasFiles
