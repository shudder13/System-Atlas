# AI Context Pack: System Atlas

## Budget

- Scope: standard
- Nodes: 25/25
- Edges: 27/27
- Evidence items: 0
- Flows: 5

## Goal

Implement the next architecture-safe change.

## Affected Architecture

- module.atlas_core: atlas-core (pure domain) (module) owned by architecture; criticality critical
- container.pack: Architecture Pack (filesystem) (container) owned by architecture; criticality critical
- module.atlas_files: atlas-files (I/O + scanner) (module) owned by architecture; criticality critical
- module.workspaces: workspaces registry (module) owned by architecture; criticality high
- concern.living_architecture: Living architecture (concern) owned by architecture; criticality critical
- concern.ai_migration_safety: AI migration safety (concern) owned by architecture; criticality critical
- decision.proposals_first_class: Proposals are first-class (decision) owned by architecture; criticality critical
- decision.repo_files_beat_db: Repo files beat an app database for v1 (decision) owned by architecture; criticality critical
- decision.graph_is_product: The architecture graph is the product core (decision) owned by architecture; criticality critical
- container.api: API Server (Express) (container) owned by architecture; criticality high
- store.evidence: Evidence files (datastore) owned by architecture; criticality high
- quality.pack_roundtrip: Pack round-trip fidelity (quality_scenario) owned by architecture; criticality high
- api.rest: REST API (/api) (api_contract) owned by architecture; criticality high
- system.atlas: System Atlas (system) owned by architecture; criticality high
- container.web: Web Client (Vite + React) (container) owned by architecture; criticality high
- store.workspaces: Workspace registry (per-machine) (datastore) owned by architecture; criticality high
- stakeholder.architect: Architect (stakeholder) owned by architecture; criticality high
- module.canvas: Atlas Canvas (component) owned by architecture; criticality high
- module.inspector: Inspector (component) owned by architecture; criticality high
- concern.local_first: Local-first + Git-friendly (concern) owned by architecture; criticality high
- decision.evidence_separate_from_intent: Observed evidence is separate from intended design (decision) owned by architecture; criticality high
- decision.multi_workspace_runtime: Workspace is runtime state, not env-locked (decision) owned by architecture; criticality high
- risk.atlas_monolith: src/lib/atlas.ts past 2000 lines (risk) owned by architecture; criticality medium
- module.import_review: Import Review (component) owned by architecture; criticality medium
- decision.views_own_layouts: Views own their layouts (decision) owned by architecture; criticality medium

## Relevant Dependencies

- system.atlas contains container.pack
- container.web contains module.atlas_core
- container.api contains module.atlas_files
- container.api contains module.atlas_core
- module.canvas depends_on module.atlas_core
- module.inspector depends_on module.atlas_core
- module.import_review depends_on module.atlas_core
- module.atlas_files depends_on module.atlas_core
- container.api writes container.pack
- container.api reads container.pack
- module.atlas_files writes store.evidence
- container.api contains module.workspaces
- module.workspaces writes store.workspaces
- module.workspaces reads store.workspaces
- module.workspaces exposes api.rest
- decision.multi_workspace_runtime addresses concern.living_architecture
- stakeholder.architect has_concern concern.living_architecture
- stakeholder.architect has_concern concern.ai_migration_safety
- decision.graph_is_product addresses concern.living_architecture
- decision.repo_files_beat_db addresses concern.local_first
- decision.evidence_separate_from_intent addresses concern.ai_migration_safety
- decision.proposals_first_class addresses concern.ai_migration_safety
- decision.views_own_layouts addresses concern.living_architecture
- risk.atlas_monolith risks module.atlas_core
- quality.pack_roundtrip traces_to container.pack
- stakeholder.architect decides decision.repo_files_beat_db
- stakeholder.architect decides decision.proposals_first_class

## Relevant Flows

- flow.greenfield_design: Greenfield design → AI implementation (high); 6 steps
- flow.brownfield_import: Brownfield import → first atlas (high); 5 steps
- flow.autosync: UI edit → autosync export (high); 4 steps
- flow.workspace_switch: Add a project → switch workspace (high); 5 steps
- flow.external_edit_reconcile: External edit reconciliation (high); 3 steps

## Invariants

- No filesystem or network imports in this module
- Writes are atomic (write temp + rename)
- Registry path is per-user, never inside a project

## Risks

- No risks recorded for selected scope.

## Typed Metadata

- concern.living_architecture.category: Operability
- concern.living_architecture.sourceStakeholder: Architect
- concern.living_architecture.priority: Critical
- concern.living_architecture.acceptanceCriteria: Pack Health reports healthy after every commit, Generated files match authored source revision
- concern.ai_migration_safety.category: Reliability
- concern.ai_migration_safety.sourceStakeholder: Architect
- concern.ai_migration_safety.priority: Critical
- concern.ai_migration_safety.acceptanceCriteria: Every migration brief lists forbidden changes and acceptance checks, Validation passes after the AI's commit
- decision.proposals_first_class.adrStatus: Accepted
- decision.repo_files_beat_db.adrStatus: Accepted
- decision.graph_is_product.adrStatus: Accepted
- store.evidence.dataOwner: atlas-files
- store.evidence.retention: Until next Scan rewrites it
- store.evidence.consistency: Overwritten as a unit on Export
- api.rest.version: 0.1
- api.rest.rateLimitPerMinute: 0
- api.rest.rateLimitBurst: 0
- api.rest.rateLimitScope: global
- api.rest.rateLimitEnforcedAt: none — single-user local-only API
- container.web.sla: Dev-only; no production SLA
- container.web.scaling: Single user, single browser tab
- store.workspaces.dataOwner: workspaces module
- store.workspaces.retention: Indefinite per-user
- store.workspaces.consistency: Atomic writes via temp+rename
- store.workspaces.containsPii: false
- stakeholder.architect.role: Software architect / project owner
- stakeholder.architect.influence: Owner
- stakeholder.architect.successCriteria: Atlas stays in sync with repo, AI agents implement migrations without drifting
- concern.local_first.category: Operability
- concern.local_first.sourceStakeholder: Architect
- concern.local_first.priority: High
- concern.local_first.acceptanceCriteria: No hidden app database, Architecture pack is human-readable Markdown + YAML
- decision.evidence_separate_from_intent.adrStatus: Accepted
- decision.multi_workspace_runtime.adrStatus: Accepted
- risk.atlas_monolith.impact: Cognitive load on changes
- risk.atlas_monolith.likelihood: Observed
- decision.views_own_layouts.adrStatus: Accepted

## Linked Files

- src/lib/atlas.ts
- architecture/
- server/atlasFiles.ts
- server/workspaces.ts
- server/index.ts
- architecture/evidence/
- src/
- index.html
- vite.config.ts
- ~/.system-atlas/workspaces.json
- src/components/AtlasCanvas.tsx
- src/components/Inspector.tsx
- src/components/ImportReview.tsx

## Code Evidence

- No scanned code evidence linked to this scope.

## Persistent Code Intelligence

- No persistent code intelligence linked to this scope. Run Scan and Export to persist it.

## Required Tests

- src/lib/atlas.test.ts
- server/atlasFiles.test.ts
- server/workspaces.test.ts

## Forbidden Changes

- Do not bypass owners of data stores or public contracts.
- Do not weaken recorded invariants without updating the architecture proposal.
- Do not introduce undocumented calls to external systems.

## Acceptance Checks

- Architecture validation passes.
- Affected flows retain acceptance coverage.
- Architecture files and generated diagrams are updated with the code change.