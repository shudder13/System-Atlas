# System Atlas

System Atlas is a local-first architecture workbench for building reliable software with LLMs.

It is inspired by C4, arc42, model-driven architecture, DDD, threat modeling, and architecture decision records, but adapted for the era of AI-assisted development. Instead of treating diagrams as stale documentation, System Atlas treats the architecture model as a living source of truth: systems, containers, components, code evidence, data stores, contracts, flows, decisions, threats, risks, invariants, linked files, and tests are represented as a typed graph that both humans and AI agents can inspect.

The goal is not to generate an entire application mechanically from UML. The goal is to let a software architect describe the intended system visually, keep that model close to the repository, and give LLMs precise migration context when the code needs to move from one architecture version to another.

```text
Architecture model + diagrams + invariants + code evidence
        -> proposal / before-after architecture diff
        -> AI migration brief
        -> implementation work
        -> validation against the intended architecture
```

System Atlas is for medium and large projects where vibe coding starts to break down because the AI loses the system map. It gives the architect a place to maintain that map.

## Core Ideas

- **Architecture as source of truth**: the system model lives in repo-native files under `architecture/`, not inside a hidden app database.
- **Multiple views over one model**: C4, class, API surface, runtime, deployment, schema/data, domain, security, health, decision, and proposal views are different lenses over the same architecture graph.
- **Code evidence links**: architecture concepts can point to real files, folders, tests, contracts, and generated evidence.
- **Proposal-driven change**: future designs are modeled as before/after proposals, then turned into implementation briefs.
- **Version checkpoints**: accepted architecture states can be saved and restored as explicit repository artifacts.
- **LLM-ready context**: migration briefs tell an AI what changed, which files are affected, what invariants must hold, what risks matter, and which tests should protect the change.
- **Local-first by default**: the MVP is single-user, Git-friendly, and designed to work from the project folder.

## Why This Exists

LLMs are very good at producing local code changes, but they do not automatically understand the long-term architecture of a real system. They may miss ownership boundaries, critical flows, data invariants, external integration risks, or regression-prone areas.

System Atlas gives the architect a durable mental map that can be shared with AI tools. The architect updates the model, reviews stakeholder concerns and proposed architecture changes, and exports a context pack that helps an LLM implement the change without drifting from the design.

This is closer to **AI-assisted Model-Driven Development** than classic diagramming. The diagrams are not just pictures; they are views of a structured model that can drive review, validation, and migration work.

## What is included

- React + TypeScript Vite client
- Local Node/Express API
- React Flow canvas with separate layouts per architecture view
- C4-inspired context, container, component, code, and class diagram views
- API surface, deployment, schema model, data, domain, security, decision, health, and proposal view families
- Mermaid and Markdown generation
- Repo-native `architecture/` export pack
- Blank and generic starter atlases
- Validation, semantic diffs, context packs, migration briefs, and lightweight code scanning
- TypeScript/JavaScript evidence indexing for project structure, file summaries, classes, methods, attributes, routes, symbols, dependencies, tests, file sizes, and line counts

## Architecture Pack

System Atlas exports architecture state into the repository:

```text
architecture/
  manifest.yaml
  modules/*.md
  services/*.md
  flows/*.md
  stakeholders/*.md
  concerns/*.md
  datastores/*.md
  integrations/*.md
  contracts/*.md
  deployment/*.md
  security/*.md
  reliability/*.md
  decisions/*.md
  views/*.yaml
  versions/*.yaml
  proposals/*/
  evidence/metadata.json
  evidence/code-map.json
  evidence/code-intelligence.json
  evidence/project-structure.json
  evidence/file-summaries.json
  evidence/classes.json
  evidence/code-symbols.json
  evidence/routes.json
  evidence/schemas.json
  evidence/dependencies.json
  evidence/test-map.json
  generated/metadata.json
  generated/atlas.json
  generated/overview.md
  generated/diagrams/*.mmd
```

Each concept file uses structured frontmatter plus Markdown notes, so it can be reviewed in Git, passed to AI agents, or edited outside the app.
The generated and evidence metadata files share an `exportId`, `generatedAt`, and `architectureSourceRevision` so humans and AI agents can tell which derived files were produced together.

## Current MVP

The MVP focuses on manual architecture modeling first:

- Create architecture nodes and typed edges visually.
- Link concepts to files, folders, tests, contracts, flows, and risks.
- Model stakeholders and concerns explicitly, then trace which architecture elements address them.
- Switch between architecture views without duplicating the underlying model.
- Create proposals and generate semantic before/after diffs.
- Create and restore architecture checkpoints.
- Generate AI migration briefs for implementation work.
- Generate focused, standard, or expanded AI context packs depending on available model context.
- Run Scan to index the repository into the current in-memory atlas: project structure, file summaries, classes, symbols, API routes/contracts, SQL/Prisma schemas, dependencies, and test maps.
- Use the Classes view to inspect saved class/interface facts, attributes, methods, inheritance, implementation edges, files, and tests from code intelligence.
- Use the API Surface view to inspect modeled API contracts alongside discovered routes, handlers, auth metadata, linked tests, and implementing services.
- Use the Schema Model view to inspect discovered SQL/Prisma schema facts and model database schemas, entities, columns, keys, indexes, constraints, relations, migrations, replicas, and read/write ownership.
- Promote generated class, route, and migration facts into authored atlas nodes when the architect wants them to become durable source-of-truth concepts.
- Edit API contracts with structured endpoint fields for method, path, auth, request, response, status codes, handler, and tests.
- Edit schemas/entities with structured columns, keys, indexes, constraints, foreign keys, relations, and migration policy.
- Browse scanned code intelligence without rereading the whole codebase every AI session.
- Keep API routes from OpenAPI files, common TypeScript route conventions, and database schema evidence from SQL migrations or Prisma schemas in persistent evidence files.
- Sync UI edits to a repo-native architecture pack, including durable `architecture/evidence/*.json` files.
- Preserve saved code intelligence during ordinary autosaves, and rewrite it only after a fresh Scan changes the code index.
- Load the large saved code index on demand for Code Intel and AI context instead of putting it in every project load.
- Use fresh in-memory Scan results for AI context until that newer code index is safely persisted.
- Show Pack Health so the architect can see whether generated files and evidence metadata match the current architecture source revision.
- Detect external edits to `architecture/` and ask the architect to reload or explicitly overwrite when there are unsaved UI changes.

## Supported Workflows

- **Greenfield design**: model the intended system first, create proposals between architecture versions, then give AI agents migration briefs to implement the diff.
- **Brownfield import**: scan an existing repository, review scanned evidence and generated Code view nodes, export code intelligence under `architecture/evidence/`, then use the same proposal/version workflow for future changes.

## How To Use It

For a new system:

1. Start from a blank or generic atlas.
2. Add systems, containers, components, datastores, queues, external systems, contracts, risks, and decisions.
3. Add flows that describe important user journeys or background processes.
4. Link architecture nodes to planned files, tests, contracts, and invariants.
5. Create a proposal for the next architecture change.
6. Generate a migration brief and give it to an AI coding agent.
7. Validate the updated architecture pack and use Export when you want an immediate save instead of waiting for autosync.

For an existing system:

1. Run Scan to index the repository into the current atlas.
2. Review the Code view and Code Intel preview.
3. Review the Classes, API Surface, and Schema Model views, then promote or manually model important files, classes, routes, datastores, queues, contracts, flows, risks, and decisions as explicit architecture concepts.
4. Mark inferred concepts as `confidence: inferred` until an architect confirms them.
5. Let autosync write the architecture pack, or use Export for an immediate save, so future AI sessions can load the saved model and code intelligence first.
6. Use proposals and migration briefs for future changes instead of asking an AI to rediscover the whole codebase each time.

## AI Agent Workflow

When Claude Code, Codex, or another AI agent needs to understand the project, it should start from the atlas before opening source files broadly:

1. Read `.claude/skills/system-atlas/SKILL.md` when present.
2. Read `architecture/manifest.yaml`.
3. Read `architecture/generated/overview.md` for quick orientation when it exists.
4. Read the relevant concept files under `architecture/services/`, `architecture/modules/`, `architecture/flows/`, `architecture/contracts/`, `architecture/datastores/`, `architecture/integrations/`, `architecture/deployment/`, `architecture/security/`, `architecture/reliability/`, and `architecture/decisions/`.
5. Read `architecture/views/*.yaml` for view-specific layouts and navigation.
6. Read `architecture/evidence/code-intelligence.json` or the split files under `architecture/evidence/` for saved project structure, files, classes, routes, schemas, dependencies, and tests.
7. Read `architecture/proposals/*` when implementing a planned before/after change.
8. Open raw source files only for the specific files affected by the requested change.

The current MVP loop is:

```text
architect updates atlas
        -> proposal captures the desired future system
        -> AI receives a migration brief
        -> AI changes code and architecture files together
        -> System Atlas reloads disk edits when safe
        -> architect reviews, validates, and resolves conflicts if needed
```

## Glossary

- **Atlas**: the full structured model of the system.
- **Concept**: a modeled architecture element, such as a service, component, datastore, queue, contract, flow, risk, threat, or decision.
- **View**: a lens over the same model, such as C4 context, containers, components, classes, API surface, deployment, schema model, data, security, health, or proposals.
- **Criticality**: the business or operational importance of a concept. `medium` means normal importance, `high` means changes need careful review, and `critical` means failure or regression can seriously affect users, money, data, compliance, or core operations.
- **Confidence**: how trustworthy the architecture knowledge is. `manual` means architect-maintained, `inferred` means scanner- or AI-derived, `observed` means backed by runtime or external evidence, and `stale` means it may no longer match reality.
- **Invariant**: a rule that must remain true, such as ownership boundaries, consistency rules, security requirements, or data retention constraints.
- **Proposal**: a planned architecture change with before/after state and a migration brief.
- **Checkpoint**: a named accepted architecture version.
- **Code intelligence**: saved repository evidence such as files, classes, methods, API routes, SQL/Prisma schemas, dependencies, tests, and summaries.

## Current Limitations

- The MVP is local-first and single-user.
- Collaboration currently happens through Git diffs of the `architecture/` pack.
- Scan is lightweight evidence indexing, not a full compiler-grade reverse-engineering engine.
- Scan updates the in-app atlas; autosync and Export write durable architecture files.
- Built-in AI chat and hosted LLM calls are out of scope for the current MVP.
- Runtime telemetry, cloud inventory, external documentation syncers, and deep cross-language reverse engineering are not fully implemented yet.

## Roadmap

- Richer conflict resolution for simultaneous UI edits and direct `architecture/` file edits.
- Deeper database reverse-engineering beyond SQL/Prisma, richer API contract import, infrastructure inventory, and dependency diagrams.
- Brownfield import wizard that turns scanned code intelligence into a reviewed initial atlas.
- Schema-aware metadata for SLAs, RTO/RPO, auth, scaling assumptions, ownership, compliance, and operational concerns.
- First-class AI agent instructions for understanding the atlas, implementing proposal diffs, and updating architecture files with code changes.
- Proposal branch mode for multiple independent future designs.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

The API runs on `http://localhost:5174` and writes architecture files under this project folder only.
