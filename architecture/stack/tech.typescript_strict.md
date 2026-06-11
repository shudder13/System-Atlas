---
id: tech.typescript_strict
type: tech_choice
name: TypeScript strict mode
owner: architecture
status: active
criticality: critical
responsibilities:
  - Type safety across the whole codebase
dependencies: []
invariants: []
linked_files: []
linked_tests: []
risks: []
confidence: manual
notes: ""
tags: []
architecture_level: domain
metadata:
  category: Language
  version: ^5.7.2
  rationale: Discriminated unions for NODE_TYPES/EDGE_TYPES/VIEW_IDS make the typed graph self-validating
  alternatives:
    - JS + JSDoc
    - TypeScript without strict
  reviewCadence: Permanent decision

---

<!-- The sections below are GENERATED from the YAML frontmatter above. Edit the frontmatter (or use the UI); body edits are overwritten on the next export. -->

# TypeScript strict mode

**Type:** `tech_choice` · **Criticality:** critical · **Status:** active · **Confidence:** manual · **Level:** domain · **Owner:** architecture

## Metadata

- **Category:** Language
- **Version:** ^5.7.2
- **Rationale:** Discriminated unions for NODE_TYPES/EDGE_TYPES/VIEW_IDS make the typed graph self-validating
- **Alternatives:** JS + JSDoc, TypeScript without strict
- **Review Cadence:** Permanent decision

## Responsibilities

- Type safety across the whole codebase
