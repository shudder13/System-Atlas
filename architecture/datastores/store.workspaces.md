---
id: store.workspaces
type: datastore
name: Workspace registry (per-machine)
owner: architecture
status: active
criticality: high
responsibilities:
  - Tracks all projects the workbench is aware of
  - Holds currentWorkspaceId so the same browser session can switch between projects without restart
dependencies: []
invariants: []
linked_files:
  - ~/.system-atlas/workspaces.json
linked_tests: []
risks: []
confidence: manual
notes: ""
tags: []
architecture_level: data
metadata:
  dataOwner: workspaces module
  retention: Indefinite per-user
  consistency: Atomic writes via temp+rename
  containsPii: false

---

# Workspace registry (per-machine)

**Type:** `datastore` · **Criticality:** high · **Status:** active · **Confidence:** manual · **Level:** data · **Owner:** architecture

## Metadata

- **Data Owner:** workspaces module
- **Retention:** Indefinite per-user
- **Consistency:** Atomic writes via temp+rename
- **Contains Pii:** no

## Responsibilities

- Tracks all projects the workbench is aware of
- Holds currentWorkspaceId so the same browser session can switch between projects without restart

## Linked files

- `~/.system-atlas/workspaces.json`
