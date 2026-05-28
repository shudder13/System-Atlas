---
id: risk.bundle_size
type: risk
name: Client bundle creeping past 500 KB
owner: architecture
status: active
criticality: medium
responsibilities:
  - Vite warns; mermaid and React Flow are the heavy ones
dependencies: []
invariants: []
linked_files: []
linked_tests: []
risks: []
confidence: manual
notes: ""
tags: []
metadata:
  likelihood: Observed
  impact: Slower first-load, no functional break
  mitigation: Lazy-load mermaid; consider manualChunks

---

# Client bundle creeping past 500 KB

**Type:** `risk` · **Criticality:** medium · **Status:** active · **Confidence:** manual · **Owner:** architecture

## Metadata

- **Likelihood:** Observed
- **Impact:** Slower first-load, no functional break
- **Mitigation:** Lazy-load mermaid; consider manualChunks

## Responsibilities

- Vite warns; mermaid and React Flow are the heavy ones
