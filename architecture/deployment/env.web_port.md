---
id: env.web_port
type: env_var
name: SYSTEM_ATLAS_WEB_PORT
owner: architecture
status: active
criticality: medium
responsibilities:
  - Port for the Vite dev server
dependencies: []
invariants: []
linked_files:
  - vite.config.ts
linked_tests: []
risks: []
confidence: manual
notes: ""
tags: []
architecture_level: deployment
metadata:
  scope: vite
  sensitive: false
  required: false
  defaultValue: "5173"
  envExamplePath: README.md (Configuration section)
  rotationPolicy: n/a

---

# SYSTEM_ATLAS_WEB_PORT

**Type:** `env_var` · **Criticality:** medium · **Status:** active · **Confidence:** manual · **Level:** deployment · **Owner:** architecture

## Metadata

- **Scope:** vite
- **Sensitive:** no
- **Required:** no
- **Default Value:** 5173
- **Env Example Path:** README.md (Configuration section)
- **Rotation Policy:** n/a

## Responsibilities

- Port for the Vite dev server

## Linked files

- `vite.config.ts`
