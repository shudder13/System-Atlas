---
id: container.pack
type: container
name: Architecture Pack (filesystem)
owner: architecture
status: active
criticality: critical
responsibilities:
  - Hold the authored architecture state and all derived artifacts
  - Round-trip cleanly between UI and disk
dependencies: []
invariants: []
linked_files:
  - architecture/
linked_tests:
  - server/atlasFiles.test.ts
risks: []
confidence: manual
notes: ""
tags: []
architecture_level: data
metadata: {}

---

<!-- The sections below are GENERATED from the YAML frontmatter above. Edit the frontmatter (or use the UI); body edits are overwritten on the next export. -->

# Architecture Pack (filesystem)

**Type:** `container` · **Criticality:** critical · **Status:** active · **Confidence:** manual · **Level:** data · **Owner:** architecture

## Responsibilities

- Hold the authored architecture state and all derived artifacts
- Round-trip cleanly between UI and disk

## Linked files

- `architecture/`

## Linked tests

- `server/atlasFiles.test.ts`
