# System Atlas

Local-first architecture workbench. This pack is the dogfooded model of System Atlas itself.

## System Shape

- Stakeholder: 2
- Concern: 3
- System: 1
- Container: 3
- Module: 3
- Component: 6
- Api Contract: 1
- Page: 1
- Tech Choice: 5
- Env Var: 3
- Datastore: 2
- Decision: 6
- Risk: 3
- Quality Scenario: 1
- Threat: 1

## Critical Areas

- Architect (stakeholder, high)
- AI Agent (stakeholder, high)
- Living architecture (concern, critical)
- AI migration safety (concern, critical)
- Local-first + Git-friendly (concern, high)
- System Atlas (system, high)
- Web Client (Vite + React) (container, high)
- API Server (Express) (container, high)
- Architecture Pack (filesystem) (container, critical)
- atlas-core (pure domain) (module, critical)
- Atlas Canvas (component, high)
- Inspector (component, high)
- atlas-files (I/O + scanner) (module, critical)
- workspaces registry (module, high)
- Workspace Picker + Onboarding (component, high)
- REST API (/api) (api_contract, high)
- Workbench (/) (page, high)
- React 19 (tech_choice, high)
- @xyflow/react (tech_choice, high)
- TypeScript strict mode (tech_choice, critical)
- SYSTEM_ATLAS_WORKSPACE (env_var, high)
- Evidence files (datastore, high)
- Workspace registry (per-machine) (datastore, high)
- The architecture graph is the product core (decision, critical)
- Repo files beat an app database for v1 (decision, critical)
- Observed evidence is separate from intended design (decision, high)
- Proposals are first-class (decision, critical)
- Workspace is runtime state, not env-locked (decision, high)
- Default API port 5174 collides with a-private-project (risk, high)
- Pack round-trip fidelity (quality_scenario, high)

## Flows

- Greenfield design → AI implementation: Architect models the intended system, creates a proposal between architecture versions, then hands an AI agent a migration brief.
- Brownfield import → first atlas: Scan an existing repository, promote useful discovered facts into authored nodes, then commit the architecture pack.
- UI edit → autosync export: Edits in the canvas debounce-export the pack and update Pack Health.
- Add a project → switch workspace: A single workbench instance manages many projects. Adding a workspace registers it and makes it current; switching reloads the pack without restart.
- External edit reconciliation: When architecture files change on disk while the UI has unsaved edits, prompt the architect to reload or force-export.

## Validation

- [warning] AI migration safety is critical but has no linked tests.
- [info] REST API (/api) is a contract with no linked tests.
- [warning] TypeScript strict mode is critical but has no linked tests.
- [info] Evidence files has no data ownership, retention, or consistency invariant.
- [info] Workspace registry (per-machine) has no data ownership, retention, or consistency invariant.
- [info] The architecture graph is the product core has no decision rationale notes.
- [warning] The architecture graph is the product core is critical but has no linked tests.
- [info] Repo files beat an app database for v1 has no decision rationale notes.
- [warning] Repo files beat an app database for v1 is critical but has no linked tests.
- [info] Observed evidence is separate from intended design has no decision rationale notes.
- [info] Proposals are first-class has no decision rationale notes.
- [warning] Proposals are first-class is critical but has no linked tests.
- [info] Views own their layouts has no decision rationale notes.
- [info] risks edge e.risk_bundle_to_web should describe what it means.
- [info] risks edge e.risk_monolith_to_core should describe what it means.
- [info] risks edge e.risk_port_to_api should describe what it means.

## AI Notes

Use this atlas as the architecture source of truth. Before implementing a change, inspect affected nodes, flows, invariants, risks, linked files, and proposal diffs.