---
id: module.workspaces
type: module
name: workspaces registry
owner: architecture
status: active
criticality: high
responsibilities:
  - Per-machine registry of projects the workbench knows about
  - "Atomic JSON persistence at ~/.system-atlas/workspaces.json (Windows: %APPDATA%/system-atlas/workspaces.json)"
  - Add/select/rename/remove + env-var bootstrap
dependencies: []
invariants:
  - Writes are atomic (write temp + rename)
  - Registry path is per-user, never inside a project
linked_files:
  - server/workspaces.ts
linked_tests:
  - server/workspaces.test.ts
risks: []
confidence: manual
notes: ""
tags: []
architecture_level: component
metadata: {}

---

# workspaces registry

**Type:** `module` · **Criticality:** high · **Status:** active · **Confidence:** manual · **Level:** component · **Owner:** architecture

## Responsibilities

- Per-machine registry of projects the workbench knows about
- Atomic JSON persistence at ~/.system-atlas/workspaces.json (Windows: %APPDATA%/system-atlas/workspaces.json)
- Add/select/rename/remove + env-var bootstrap

## Invariants

- Writes are atomic (write temp + rename)
- Registry path is per-user, never inside a project

## Linked files

- `server/workspaces.ts`

## Linked tests

- `server/workspaces.test.ts`
