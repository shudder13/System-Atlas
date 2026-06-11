---
id: concern.ai_migration_safety
type: concern
name: AI migration safety
owner: architecture
status: active
criticality: critical
responsibilities:
  - AI must not silently weaken invariants when implementing a proposal
dependencies: []
invariants: []
linked_files: []
linked_tests: []
risks: []
confidence: manual
notes: ""
tags: []
metadata:
  category: Reliability
  sourceStakeholder: Architect
  priority: Critical
  acceptanceCriteria:
    - Every migration brief lists forbidden changes and acceptance checks
    - Validation passes after the AI's commit

---

<!-- The sections below are GENERATED from the YAML frontmatter above. Edit the frontmatter (or use the UI); body edits are overwritten on the next export. -->

# AI migration safety

**Type:** `concern` · **Criticality:** critical · **Status:** active · **Confidence:** manual · **Owner:** architecture

## Metadata

- **Category:** Reliability
- **Source Stakeholder:** Architect
- **Priority:** Critical
- **Acceptance Criteria:** Every migration brief lists forbidden changes and acceptance checks, Validation passes after the AI's commit

## Responsibilities

- AI must not silently weaken invariants when implementing a proposal
