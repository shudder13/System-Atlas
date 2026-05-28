---
id: tech.express
type: tech_choice
name: Express 5
owner: architecture
status: active
criticality: medium
responsibilities:
  - Tiny JSON API server
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
  category: Backend framework
  version: ^5.1.0
  rationale: Smallest dependency that gives JSON routes; the API has 11 endpoints with no auth/middleware needs
  alternatives:
    - Fastify
    - Hono
    - raw node:http
  reviewCadence: Only if the API grows past ~30 endpoints

---

# Express 5

**Type:** `tech_choice` · **Criticality:** medium · **Status:** active · **Confidence:** manual · **Level:** domain · **Owner:** architecture

## Metadata

- **Category:** Backend framework
- **Version:** ^5.1.0
- **Rationale:** Smallest dependency that gives JSON routes; the API has 11 endpoints with no auth/middleware needs
- **Alternatives:** Fastify, Hono, raw node:http
- **Review Cadence:** Only if the API grows past ~30 endpoints

## Responsibilities

- Tiny JSON API server
