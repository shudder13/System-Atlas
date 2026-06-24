---
id: concern.living_architecture
type: concern
name: Living architecture
owner: architecture
status: active
criticality: critical
responsibilities:
  - The diagrams must not drift from the code
dependencies: []
invariants: []
linked_files: []
linked_tests:
  - server/atlasFiles.test.ts
risks: []
confidence: manual
notes: ""
tags: []
metadata:
  category: Operability
  sourceStakeholder: Architect
  priority: Critical
  acceptanceCriteria:
    - Pack Health reports healthy after every commit
    - Generated files match authored source revision

---

<!-- The sections below are GENERATED from the YAML frontmatter above. Edit the frontmatter (or use the UI); body edits are overwritten on the next export. -->

# Living architecture

**Type:** `concern` · **Criticality:** critical · **Status:** active · **Confidence:** manual · **Owner:** architecture

## Metadata

- **Category:** Operability
- **Source Stakeholder:** Architect
- **Priority:** Critical
- **Acceptance Criteria:** Pack Health reports healthy after every commit, Generated files match authored source revision

## Responsibilities

- The diagrams must not drift from the code

## Linked tests

- `server/atlasFiles.test.ts`
