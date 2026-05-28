---
id: risk.port_collision
type: risk
name: Default API port 5174 collides with QuantFlow
owner: architecture
status: active
criticality: high
responsibilities:
  - Without a startup check the API is silently shadowed by whatever already owns the port
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
  impact: All /api calls 404 against the wrong service
  mitigation: Startup port-conflict check; configurable port via env

---

# Default API port 5174 collides with QuantFlow

**Type:** `risk` · **Criticality:** high · **Status:** active · **Confidence:** manual · **Owner:** architecture

## Metadata

- **Likelihood:** Observed
- **Impact:** All /api calls 404 against the wrong service
- **Mitigation:** Startup port-conflict check; configurable port via env

## Responsibilities

- Without a startup check the API is silently shadowed by whatever already owns the port
