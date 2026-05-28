---
id: code.file.server-atlasfiles.ts
type: file_group
name: atlasFiles.ts
owner: code
status: active
criticality: medium
responsibilities:
  - Represents scanned source evidence at server/atlasFiles.ts.
dependencies:
  - node:fs/promises
  - node:path
  - node:crypto
  - typescript
  - yaml
  - ../src/types
  - ../src/lib/atlas
invariants: []
linked_files:
  - server/atlasFiles.ts
linked_tests: []
risks: []
confidence: observed
notes: |-
  source file
  language: typescript
  1560 lines
  exports: loadAtlas, exportAtlas, architectureRevision, architectureSourceRevision, packHealth, loadCodeIntelligence, scanWorkspace
  imports: node:fs/promises, node:path, node:crypto, typescript, yaml, ../src/types, ../src/lib/atlas
position:
  x: 80
  y: 240
tags:
  - generated
  - source
architecture_level: code
metadata:
  generatedBy: workspace-scan
  evidencePath: server/atlasFiles.ts
  evidenceKind: source
  language: typescript
  lines: 1560
  symbolCount: 80

---

# atlasFiles.ts

source file
language: typescript
1560 lines
exports: loadAtlas, exportAtlas, architectureRevision, architectureSourceRevision, packHealth, loadCodeIntelligence, scanWorkspace
imports: node:fs/promises, node:path, node:crypto, typescript, yaml, ../src/types, ../src/lib/atlas
