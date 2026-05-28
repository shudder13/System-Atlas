---
id: threat.mermaid_injection
type: threat
name: Mermaid CSS/HTML injection (CVEs)
owner: architecture
status: active
criticality: medium
responsibilities:
  - mermaid 11.0–11.14 has open advisories around classDefs / config sanitisation
dependencies: []
invariants: []
linked_files: []
linked_tests: []
risks:
  - risk.bundle_size
confidence: manual
notes: ""
tags: []
metadata:
  mitigation: npm audit fix to the next patched line; render only architect-authored input

---

# Mermaid CSS/HTML injection (CVEs)

**Type:** `threat` · **Criticality:** medium · **Status:** active · **Confidence:** manual · **Owner:** architecture

## Metadata

- **Mitigation:** npm audit fix to the next patched line; render only architect-authored input

## Responsibilities

- mermaid 11.0–11.14 has open advisories around classDefs / config sanitisation

## Risks

- risk.bundle_size
