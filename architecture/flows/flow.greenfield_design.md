---
id: flow.greenfield_design
name: Greenfield design → AI implementation
description: Architect models the intended system, creates a proposal between architecture versions, then hands an AI agent a migration brief.
owner: architecture
criticality: high
steps:
  - id: s1
    label: Start from blank or generic starter atlas
  - id: s2
    label: Add systems, containers, components, datastores, contracts, risks, decisions
    nodeId: module.atlas_core
  - id: s3
    label: Create a proposal capturing the next architecture change
    nodeId: decision.proposals_first_class
  - id: s4
    label: Generate migration brief via /api/migration-brief
    nodeId: api.rest
  - id: s5
    label: AI agent implements the diff and updates architecture files together
    nodeId: stakeholder.ai_agent
  - id: s6
    label: Architect reviews, validates, resolves conflicts
failureModes:
  - AI silently weakens an invariant
  - Proposal acceptance checks are too vague to verify
acceptanceChecks:
  - Validation passes after import
  - All flows still have linked tests
linkedTests: []
notes: ""

---

# Greenfield design → AI implementation

Architect models the intended system, creates a proposal between architecture versions, then hands an AI agent a migration brief.

## Steps

- Start from blank or generic starter atlas
- Add systems, containers, components, datastores, contracts, risks, decisions (module.atlas_core)
- Create a proposal capturing the next architecture change (decision.proposals_first_class)
- Generate migration brief via /api/migration-brief (api.rest)
- AI agent implements the diff and updates architecture files together (stakeholder.ai_agent)
- Architect reviews, validates, resolves conflicts
