---
id: decision.multi_workspace_runtime
type: decision
name: Workspace is runtime state, not env-locked
owner: architecture
status: active
criticality: high
responsibilities:
  - A single workbench instance manages many projects via an in-UI picker
  - Per-machine registry persists across restarts; SYSTEM_ATLAS_WORKSPACE remains a one-shot bootstrap
dependencies: []
invariants: []
linked_files: []
linked_tests: []
risks: []
confidence: manual
notes: Earlier design read SYSTEM_ATLAS_WORKSPACE once at server boot. That forced a restart to switch projects. The runtime registry pattern matches what tools like Postman / TablePlus do — launch once, work on any project.
tags: []
metadata:
  adrStatus: Accepted

---

<!-- The sections below are GENERATED from the YAML frontmatter above. Edit the frontmatter (or use the UI); body edits are overwritten on the next export. -->

# Workspace is runtime state, not env-locked

**Type:** `decision` · **Criticality:** high · **Status:** active · **Confidence:** manual · **Owner:** architecture

## Notes

Earlier design read SYSTEM_ATLAS_WORKSPACE once at server boot. That forced a restart to switch projects. The runtime registry pattern matches what tools like Postman / TablePlus do — launch once, work on any project.

## Metadata

- **Adr Status:** Accepted

## Responsibilities

- A single workbench instance manages many projects via an in-UI picker
- Per-machine registry persists across restarts; SYSTEM_ATLAS_WORKSPACE remains a one-shot bootstrap
