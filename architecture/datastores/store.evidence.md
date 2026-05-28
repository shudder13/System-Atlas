---
id: store.evidence
type: datastore
name: Evidence files
owner: architecture
status: active
criticality: high
responsibilities:
  - Persist scanned code intelligence between sessions
dependencies: []
invariants: []
linked_files:
  - architecture/evidence/
linked_tests: []
risks: []
confidence: manual
notes: ""
tags: []
architecture_level: data
metadata:
  dataOwner: atlas-files
  retention: Until next Scan rewrites it
  consistency: Overwritten as a unit on Export

---

# Evidence files

**Type:** `datastore` · **Criticality:** high · **Status:** active · **Confidence:** manual · **Level:** data · **Owner:** architecture

## Metadata

- **Data Owner:** atlas-files
- **Retention:** Until next Scan rewrites it
- **Consistency:** Overwritten as a unit on Export

## Responsibilities

- Persist scanned code intelligence between sessions

## Linked files

- `architecture/evidence/`
