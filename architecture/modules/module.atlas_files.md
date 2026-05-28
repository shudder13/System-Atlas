---
id: module.atlas_files
type: module
name: atlas-files (I/O + scanner)
owner: architecture
status: active
criticality: critical
responsibilities:
  - Read/write architecture/ pack
  - TS-compiler-based code intelligence scan
  - Pack-health + revision hashing
dependencies: []
invariants: []
linked_files:
  - server/atlasFiles.ts
linked_tests:
  - server/atlasFiles.test.ts
risks: []
confidence: manual
notes: ""
tags: []
architecture_level: component
metadata: {}

---

# atlas-files (I/O + scanner)

**Type:** `module` · **Criticality:** critical · **Status:** active · **Confidence:** manual · **Level:** component · **Owner:** architecture

## Responsibilities

- Read/write architecture/ pack
- TS-compiler-based code intelligence scan
- Pack-health + revision hashing

## Linked files

- `server/atlasFiles.ts`

## Linked tests

- `server/atlasFiles.test.ts`
