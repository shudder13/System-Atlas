---
id: code.file.server-atlasfiles.test.ts
type: file_group
name: atlasFiles.test.ts
owner: code
status: active
criticality: low
responsibilities:
  - Represents scanned test evidence at server/atlasFiles.test.ts.
dependencies:
  - node:fs/promises
  - node:os
  - node:path
  - vitest
  - ./atlasFiles
invariants: []
linked_files:
  - server/atlasFiles.test.ts
linked_tests:
  - server/atlasFiles.test.ts
risks: []
confidence: observed
notes: |-
  test file
  language: typescript
  115 lines
  imports: node:fs/promises, node:os, node:path, vitest, ./atlasFiles
position:
  x: 80
  y: 1140
tags:
  - generated
  - test
architecture_level: code
metadata:
  generatedBy: workspace-scan
  evidencePath: server/atlasFiles.test.ts
  evidenceKind: test
  language: typescript
  lines: 115
  symbolCount: 3

---

# atlasFiles.test.ts

test file
language: typescript
115 lines
imports: node:fs/promises, node:os, node:path, vitest, ./atlasFiles
