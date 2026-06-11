---
id: env.api_port
type: env_var
name: SYSTEM_ATLAS_API_PORT
owner: architecture
status: active
criticality: medium
responsibilities:
  - Port for the Express API
dependencies: []
invariants: []
linked_files:
  - server/index.ts
  - vite.config.ts
linked_tests: []
risks: []
confidence: manual
notes: ""
tags: []
architecture_level: deployment
metadata:
  scope: server (Express) + vite proxy
  sensitive: false
  required: false
  defaultValue: "5174"
  envExamplePath: README.md (Configuration section)
  rotationPolicy: n/a

---

<!-- The sections below are GENERATED from the YAML frontmatter above. Edit the frontmatter (or use the UI); body edits are overwritten on the next export. -->

# SYSTEM_ATLAS_API_PORT

**Type:** `env_var` · **Criticality:** medium · **Status:** active · **Confidence:** manual · **Level:** deployment · **Owner:** architecture

## Metadata

- **Scope:** server (Express) + vite proxy
- **Sensitive:** no
- **Required:** no
- **Default Value:** 5174
- **Env Example Path:** README.md (Configuration section)
- **Rotation Policy:** n/a

## Responsibilities

- Port for the Express API

## Linked files

- `server/index.ts`
- `vite.config.ts`
