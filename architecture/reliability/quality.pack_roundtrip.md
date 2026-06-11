---
id: quality.pack_roundtrip
type: quality_scenario
name: Pack round-trip fidelity
owner: architecture
status: active
criticality: high
responsibilities:
  - Export → reload → semantic equality of nodes, edges, flows, views, proposals must hold
dependencies: []
invariants: []
linked_files: []
linked_tests: []
risks: []
confidence: manual
notes: ""
tags: []
metadata:
  measurement: Validation passes, semanticDiff returns empty after roundtrip

---

<!-- The sections below are GENERATED from the YAML frontmatter above. Edit the frontmatter (or use the UI); body edits are overwritten on the next export. -->

# Pack round-trip fidelity

**Type:** `quality_scenario` · **Criticality:** high · **Status:** active · **Confidence:** manual · **Owner:** architecture

## Metadata

- **Measurement:** Validation passes, semanticDiff returns empty after roundtrip

## Responsibilities

- Export → reload → semantic equality of nodes, edges, flows, views, proposals must hold
