---
id: concern.local_first
type: concern
name: Local-first + Git-friendly
owner: architecture
status: active
criticality: high
responsibilities:
  - Architecture state must live in repo files reviewable in Git
dependencies: []
invariants: []
linked_files: []
linked_tests: []
risks: []
confidence: manual
notes: ""
tags: []
metadata:
  category: Operability
  sourceStakeholder: Architect
  priority: High
  acceptanceCriteria:
    - No hidden app database
    - Architecture pack is human-readable Markdown + YAML

---

# Local-first + Git-friendly

**Type:** `concern` · **Criticality:** high · **Status:** active · **Confidence:** manual · **Owner:** architecture

## Metadata

- **Category:** Operability
- **Source Stakeholder:** Architect
- **Priority:** High
- **Acceptance Criteria:** No hidden app database, Architecture pack is human-readable Markdown + YAML

## Responsibilities

- Architecture state must live in repo files reviewable in Git
