---
id: env.workspace
type: env_var
name: SYSTEM_ATLAS_WORKSPACE
owner: architecture
status: active
criticality: high
responsibilities:
  - Absolute path to the project whose architecture/ pack should be read and written
dependencies: []
invariants: []
linked_files:
  - server/index.ts
linked_tests: []
risks: []
confidence: manual
notes: ""
tags: []
architecture_level: deployment
metadata:
  scope: server (Express)
  sensitive: false
  required: false
  defaultValue: process.cwd()
  envExamplePath: README.md (Open a different project)
  rotationPolicy: n/a

---

<!-- The sections below are GENERATED from the YAML frontmatter above. Edit the frontmatter (or use the UI); body edits are overwritten on the next export. -->

# SYSTEM_ATLAS_WORKSPACE

**Type:** `env_var` · **Criticality:** high · **Status:** active · **Confidence:** manual · **Level:** deployment · **Owner:** architecture

## Metadata

- **Scope:** server (Express)
- **Sensitive:** no
- **Required:** no
- **Default Value:** process.cwd()
- **Env Example Path:** README.md (Open a different project)
- **Rotation Policy:** n/a

## Responsibilities

- Absolute path to the project whose architecture/ pack should be read and written

## Linked files

- `server/index.ts`
