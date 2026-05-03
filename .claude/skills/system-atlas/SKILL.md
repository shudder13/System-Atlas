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
5. `architecture/evidence/code-map.json` for file evidence.
6. `architecture/proposals/*` for before/after architecture changes and migration briefs.

Do not treat generated diagrams as the only source of truth. Mermaid files under `architecture/generated/diagrams/` are derived views.

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

Keep the summary compact. For large systems, prefer critical and high-risk paths first.

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

## Context Budget

When context must stay below roughly 100k tokens:

1. Start with `overview.md`, the active proposal/migration brief, and the selected flow or node.
2. Include only affected concepts and their first-degree edges.
3. Include linked file paths and short summaries before reading full source files.
4. Read full files only for changed modules, tests, contracts, or invariants.
5. Avoid loading generated Mermaid diagrams unless the visual layout itself is relevant.

## Expected Output

For atlas-aware work, report:

- architecture concepts changed
- code files changed
- tests run
- validation/build result
- any drift between the implemented code and the atlas
