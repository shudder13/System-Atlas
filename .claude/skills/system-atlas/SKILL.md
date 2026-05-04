---
name: system-atlas
description: Use when working with System Atlas architecture packs, loading an application map into context, updating architecture files, reviewing proposal diffs, or implementing code changes from one architecture version to the next.
---

# System Atlas Skill

System Atlas stores architecture knowledge in `architecture/` so humans and coding agents can share the same mental map of a software system.

Use this skill when the user asks you to understand a system through its atlas, update architecture files, generate or consume migration briefs, or implement code that moves the system from one architecture version to another.

## Source Files

Prefer these files in this order:

1. `architecture/generated/atlas.json` for the full current snapshot when it exists and is fresh.
2. `architecture/manifest.yaml` for system metadata and graph edges.
3. Authored concept files:
   - `architecture/services/*.md`
   - `architecture/modules/*.md`
   - `architecture/flows/*.md`
   - `architecture/datastores/*.md`
   - `architecture/integrations/*.md`
   - `architecture/contracts/*.md`
   - `architecture/deployment/*.md`
   - `architecture/security/*.md`
   - `architecture/reliability/*.md`
   - `architecture/decisions/*.md`
4. `architecture/views/*.yaml` for per-view layout and view-specific information.
5. `architecture/evidence/code-map.json` for flat file evidence.
6. Persistent code intelligence files:
   - `architecture/evidence/code-intelligence.json`
   - `architecture/evidence/project-structure.json`
   - `architecture/evidence/file-summaries.json`
   - `architecture/evidence/classes.json`
   - `architecture/evidence/code-symbols.json`
   - `architecture/evidence/routes.json`
   - `architecture/evidence/dependencies.json`
   - `architecture/evidence/test-map.json`
7. `architecture/proposals/*` for before/after architecture changes and migration briefs.
8. `architecture/versions/*.yaml` for named architecture checkpoints.

Do not treat generated diagrams as the only source of truth. Mermaid files under `architecture/generated/diagrams/` are derived views.
`architecture/evidence/code-map.json` may include scanned imports, exports, routes, symbols, line counts, and generated node links for Code view context. The richer `code-intelligence.json` and split evidence files are the durable memory for project structure, classes, methods, routes, dependencies, and tests.
Proposal records may have `status: draft`, `status: applied`, or `status: superseded`. Draft proposals describe a future architecture; applied proposals are historical evidence of how the main atlas moved.
Version checkpoints capture accepted architecture states. Use them to compare historical/current architecture before assuming the latest files describe the requested baseline.

## Load The System Map

When asked to understand the whole app:

1. Read `architecture/generated/overview.md` if present.
2. Read `architecture/manifest.yaml`.
3. Read `architecture/generated/atlas.json` if present.
4. If the snapshot is missing or stale, read the authored concept files and reconstruct the model.
5. Summarize the system by:
   - actors and entry points
   - systems, containers, components, and code evidence
   - apps/services/modules/workers/schedulers
   - deployment environments, regions, nodes, and replicas
   - datastores, schemas, entities, queues, caches, replicas
   - external systems, API contracts, and event contracts
   - critical flows
   - security threats, invariants, risks, decisions, and linked tests
   - linked source files
   - scanned symbols, imports, exports, routes, classes, dependencies, and tests from persistent code intelligence

Keep the summary compact. For large systems, prefer critical and high-risk paths first.

## Brownfield Import

When asked to create an atlas for an existing project:

1. Run or ask the user to run Scan in System Atlas.
2. Treat `architecture/evidence/code-intelligence.json` as the first durable code memory.
3. Use project structure, file summaries, classes, routes, dependencies, and tests to draft the initial architecture model.
4. Create high-level systems, containers, modules, datastores, contracts, flows, risks, and decisions from the evidence.
5. Link architecture nodes to source files, tests, routes, classes, and external dependencies.
6. Mark inferred concepts as `confidence: inferred` until the architect confirms them.
7. Do not re-read the whole codebase in every future session. Start from the atlas and persistent evidence, then open raw code only for changed files.

## Update The Atlas

When asked to edit the architecture:

1. Preserve stable ids unless the concept truly changes identity.
2. Update authored files first, not only generated files.
3. Keep edges in `architecture/manifest.yaml`.
4. Keep node frontmatter fields consistent:
   - `id`
   - `type`
   - `name`
   - `owner`
   - `status`
   - `criticality`
   - `responsibilities`
   - `dependencies`
   - `invariants`
   - `linked_files`
   - `linked_tests`
   - `risks`
   - `confidence`
   - `architecture_level`
   - `metadata`
5. Add or update linked files and linked tests whenever architecture changes touch implementation.
6. Record risks and invariants for critical paths, datastores, schemas, contracts, threats, decisions, and external systems.

After editing architecture files, tell the user to reload the System Atlas UI if it did not auto-reload.

## Implement A Proposal Diff

When asked to implement a before/after architecture change:

1. Locate the active proposal under `architecture/proposals/`.
2. Read `proposal.yaml`, `before.yaml`, `after.yaml`, and `migration-brief.md`.
3. Identify affected nodes, edges, flows, linked files, linked tests, invariants, forbidden changes, and acceptance checks.
4. Inspect only the code needed for the affected scope before editing.
5. Implement code changes to satisfy the proposed architecture.
6. Update tests or add tests required by the migration brief.
7. Update the atlas if implementation details differ from the proposed architecture.
8. Run the relevant validation/build/test commands.

Do not weaken invariants, remove tests, bypass owners of datastores/contracts, or introduce undocumented external calls without calling that out explicitly.

## Proposal Lifecycle

Use proposals as architecture branches:

1. Treat `before.yaml` as the accepted current architecture at proposal creation time.
2. Treat `after.yaml` as the proposed future architecture.
3. Use `migration-brief.md` as the implementation contract, not as a vague prompt.
4. After implementation, compare the resulting code and tests to `after.yaml`.
5. If implementation differs from the proposal, update the proposal or the atlas explicitly instead of silently drifting.
6. Once the proposal is accepted, the app may apply `after.yaml` back into the main atlas and mark the proposal `status: applied`.

Do not implement an old applied proposal as if it were still a requested future change. Use applied proposals as history and rationale.

## Editing With The UI Open

The System Atlas UI polls the `architecture/` pack and reloads when files change and there are no unsaved UI edits.

When editing atlas files directly:

1. Keep changes small enough that the UI can reload and the architect can inspect them visually.
2. Prefer editing authored concept files, proposal files, and manifest edges over generated diagrams.
3. Run export/validation from the UI after larger edits so generated files and diagrams catch up.
4. If the UI reports unsaved edits, ask the user whether the disk or UI version should win before overwriting architecture files.

## Context Budget

When context must stay below roughly 100k tokens:

1. Prefer a focused context pack for single-node or small change work.
2. Use a standard context pack for normal implementation work across several related nodes.
3. Use an expanded context pack only for broad refactors or design reviews.
4. Start with `overview.md`, the active proposal/migration brief, and the selected flow or node.
5. Include only affected concepts and their first-degree edges before expanding.
6. Include linked file paths and short summaries before reading full source files.
7. Read full files only for changed modules, tests, contracts, or invariants.
8. Avoid loading generated Mermaid diagrams unless the visual layout itself is relevant.

## Expected Output

For atlas-aware work, report:

- architecture concepts changed
- code files changed
- tests run
- validation/build result
- any drift between the implemented code and the atlas
