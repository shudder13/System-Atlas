---
id: api.rest
type: api_contract
name: REST API (/api)
owner: architecture
status: active
criticality: high
responsibilities:
  - GET /api/project, /api/templates, /api/code-intelligence, /api/pack-health, /api/project/revision
  - POST /api/draft/validate, /api/export, /api/scan, /api/context-pack, /api/proposal, /api/migration-brief
dependencies: []
invariants: []
linked_files: []
linked_tests: []
risks: []
confidence: manual
notes: ""
tags: []
architecture_level: container
metadata:
  version: "0.1"
  authMode: None (local-only)
  baseUrl: http://localhost:5174
  rateLimitPerMinute: 0
  rateLimitBurst: 0
  rateLimitScope: global
  rateLimitEnforcedAt: none — single-user local-only API

---

<!-- The sections below are GENERATED from the YAML frontmatter above. Edit the frontmatter (or use the UI); body edits are overwritten on the next export. -->

# REST API (/api)

**Type:** `api_contract` · **Criticality:** high · **Status:** active · **Confidence:** manual · **Level:** container · **Owner:** architecture

## Metadata

- **Version:** 0.1
- **Auth Mode:** None (local-only)
- **Base Url:** http://localhost:5174
- **Rate Limit Per Minute:** 0
- **Rate Limit Burst:** 0
- **Rate Limit Scope:** global
- **Rate Limit Enforced At:** none — single-user local-only API

## Responsibilities

- GET /api/project, /api/templates, /api/code-intelligence, /api/pack-health, /api/project/revision
- POST /api/draft/validate, /api/export, /api/scan, /api/context-pack, /api/proposal, /api/migration-brief
