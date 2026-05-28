---
id: risk.atlas_monolith
type: risk
name: src/lib/atlas.ts past 2000 lines
owner: architecture
status: active
criticality: medium
responsibilities:
  - Single file owns validation, layout, generation, diff, import — sustainable for now but watch for further growth
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
  impact: Cognitive load on changes
  mitigation: Split along natural seams when next major feature lands

---

# src/lib/atlas.ts past 2000 lines

**Type:** `risk` · **Criticality:** medium · **Status:** active · **Confidence:** manual · **Owner:** architecture

## Metadata

- **Likelihood:** Observed
- **Impact:** Cognitive load on changes
- **Mitigation:** Split along natural seams when next major feature lands

## Responsibilities

- Single file owns validation, layout, generation, diff, import — sustainable for now but watch for further growth
