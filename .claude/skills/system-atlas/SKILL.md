---
name: system-atlas
description: Use when the user says "/system-atlas [path]" to enter the architecture workbench, or passively while working in a repo whose root contains an architecture/ pack. Detects the target workspace from the explicit path → CWD → confirmation prompt. Mode-aware - if the target has no architecture/manifest.yaml, runs BUILD mode (reads README/CLAUDE.md/ARCHITECTURE.md/docker-compose/dependency manifests, interviews for implicit facts, writes a scripts/build-<slug>-atlas.ts regenerator that calls exportAtlas()). If the pack exists, runs EXISTING-PACK mode (ingests manifest + overview into context, offers review / edit / create-proposal / open-in-UI). Also covers the AI-agent reading protocol used during regular coding work in atlas-described repos.
---

# System Atlas

System Atlas stores architecture knowledge in `architecture/` so humans and coding agents share the same mental map of a software system.

A `SessionStart` hook in `.claude/settings.json` auto-injects a compact summary of the pack (manifest header, overview, generated/evidence metadata) at the top of every session, so you start each conversation with the system map already in context. If the hook output is missing or the user is in a project without a pack, follow the workflow below.

## Operator entry point — `/system-atlas [path]`

When the user invokes this skill explicitly (typed `/system-atlas` or asked you to "open the atlas", "build an atlas", "show me the architecture", "edit the atlas", etc.), follow these steps in order. Do not skip steps.

### Step 1 — Determine the target workspace

Use the **first** rule that applies:

1. **Explicit path** — user passed `/system-atlas <path>` or named a project in the message. Use it verbatim. Resolve to an absolute path.
2. **CWD contains a pack** — `<cwd>/architecture/manifest.yaml` exists. Use `cwd`. Tell the user: *"Working on the atlas at `<cwd>/architecture/`."*
3. **CWD looks like a project root** — `<cwd>` contains *any* of `README.md`, `CLAUDE.md`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `docker-compose.yml`. Ask once via `AskUserQuestion`: *"Target this project for atlas work?"* with options "Yes — use `<cwd>`" / "No — different path".
4. **CWD doesn't look like a project root** — ask: *"Which project's atlas? Give me an absolute path."* via free-text.

Do **not** assume the System Atlas repo itself is the target unless the user is explicitly working on System Atlas. The architect almost always wants the atlas of *their consumer project*, not System Atlas itself.

If the System Atlas dev server is already running, you can also add the resolved path through the workspace API (`POST http://localhost:5174/api/workspaces` with `{path, name?}`) and it will appear in the in-UI workspace picker. The registry persists at `~/.system-atlas/workspaces.json` so projects survive restarts.

### Step 2 — Detect mode

Once `<target>` is set:

- **`<target>/architecture/manifest.yaml` exists** → **EXISTING-PACK mode** (jump to that section below)
- **`<target>/architecture/` is absent or empty** → **BUILD mode** (jump to that section below)

State the detected mode in one sentence to the user before proceeding.

---

## EXISTING-PACK mode

The pack is there. Load enough into context to be useful, then ask what the user wants to do — don't assume.

### Phase E1 — Ingest the pack summary

In parallel, read:

- `<target>/architecture/manifest.yaml` (first ~40 lines is enough — name, description, nodes count, edges)
- `<target>/architecture/generated/overview.md` (full — it's already budgeted)
- `<target>/architecture/generated/metadata.json` and `<target>/architecture/evidence/metadata.json` to check `exportId` alignment

Output a 5-line summary to the user: project name, node-type counts, critical-areas count, any pack-health red flags (exportId mismatch → stale generated files → ask whether to re-export).

### Phase E2 — Offer actions

Ask via `AskUserQuestion` what they want:

| Action | What you do |
|---|---|
| **Review** | Read `generated/overview.md` + `generated/context-pack.md`, list critical areas + open risks + open alerts in conversation. Don't open files unless they ask for detail. |
| **Edit a specific node** | Ask which one. Open the .md file. Edit either the YAML frontmatter or the prose body. After editing, remind the user to verify in the UI or re-run their regenerator script (see below). |
| **Create a proposal** | Open the UI (`SYSTEM_ATLAS_WORKSPACE=<target> npm run dev` from the System Atlas repo). Walk the user through clicking Proposal → editing in the proposal workspace → Apply Proposal. Then read the generated `architecture/proposals/<id>/migration-brief.md` for the next coding session. |
| **Open in UI** | Run the dev server as above. Tell them the URL (default `http://localhost:5176` after the `SYSTEM_ATLAS_WEB_PORT=5176` env override). |
| **Nothing — just keep loaded** | The summary is already in your context. Confirm and stop. |
| **Re-run regenerator** | If a `scripts/build-<slug>-atlas.ts` exists in the System Atlas repo, run `npx tsx scripts/build-<slug>-atlas.ts` from there. |

### Phase E3 — Editing rules

When the user asks you to edit the atlas directly (rather than via the UI):

- Prefer editing the regenerator script (`scripts/build-<slug>-atlas.ts` in the System Atlas repo) and re-running it. This keeps the pack reproducible and lets the architect maintain a single typed source of truth.
- Only edit pack files in place when (a) no regenerator exists, OR (b) the change is a tiny one-off note that doesn't warrant a re-run.
- Preserve stable IDs. Renames are migrations — they break `linked_files` and edge references elsewhere in the pack.
- Keep node frontmatter fields consistent: `id`, `type`, `name`, `owner`, `status`, `criticality`, `responsibilities`, `dependencies`, `invariants`, `linked_files`, `linked_tests`, `risks`, `confidence`, `architecture_level`, `metadata`.
- After editing files directly, watch the UI status bar. If it reports external changes, the architect must choose disk-wins or UI-wins before overwriting.

---

## BUILD mode

The target has no pack yet. Follow this five-phase workflow to produce a first authored atlas. Don't shortcut — the order matters because architect time is the scarce resource.

### Phase B1 — Read the explicit knowledge (no questions yet)

In parallel, read these if they exist at `<target>`:

1. `README.md` — project intent, quickstart, surface description.
2. `CLAUDE.md` — project conventions, architectural rules, pitfalls.
3. `docs/ARCHITECTURE.md` — system diagram, services, networks, tech stack.
4. `docs/API.md` (or equivalent) — route inventory.
5. `docs/DATABASE.md` (or equivalent) — schema, tables, hypertables, indexes. **High-value: each `### N. table_name` heading typically maps to one `data_entity` or `schema` node.**
6. `docs/REDIS_SCHEMA.md` (or equivalent) — cache key patterns → `cache` node + entity sub-nodes.
7. `docker/docker-compose.yml` or root `docker-compose.yml` — service inventory, container names, network membership, depends_on edges.
8. `pyproject.toml` / `package.json` / `Cargo.toml` / `go.mod` — `tech_choice` nodes with versions.
9. `alembic/versions/` or `migrations/` — count + most recent migration → datastore metadata.
10. `.env.example` — `env_var` nodes with `sensitive` heuristic (anything containing PASSWORD, KEY, SECRET, TOKEN).
11. `docs/strategies/`, `docs/features/`, `docs/runbooks/` — `flow` + `runbook` nodes.

For each, extract structured facts. Do **not** invent — if the file doesn't say it, don't write it.

### Phase B2 — Run Scan (optional)

Start System Atlas if it isn't already running:

```bash
# from the System Atlas repo
SYSTEM_ATLAS_API_PORT=5177 SYSTEM_ATLAS_WEB_PORT=5176 npm run dev
```

Then add the target through the UI workspace picker (or via `POST /api/workspaces { path: "<target>" }`). Once it's the current workspace, POST `/api/scan` (or click Scan in the UI). The scanner writes `architecture/evidence/*.json`: project structure, file summaries, classes, routes, schemas (SQL + Prisma), dependencies, tests. These are *observed evidence*, separate from the authored atlas.

Do not promote scan results into authored nodes automatically. The architect promotes via the Import Review UI (or you do it for them, explicitly, with their approval).

### Phase B3 — Interview for the implicit facts

The atlas's value comes from the things only the architect knows. Group questions; never ask one-at-a-time.

**Deployment & topology** — Where does this run in production? Cloud / VPS / k8s / serverless? Reverse proxy or load balancer (Caddy / Nginx / Cloudflare / ALB)? Between public and app — CDN, WAF, Zero Trust, VPN, mTLS? Networking quirks (Tailnet, private subnets, peered VPC, VPN containers)?

**Reliability** — Top alerts: trigger, severity, channel, owner. Existing runbooks (formal or informal). Backup cadence + last restore-test date. Idempotency boundaries (which routes / queue handlers / data jobs are idempotent).

**Cost & ownership** — Rough monthly cost per major component (VPS, DB, third-party APIs, LLM APIs). Owner per critical service.

**Quality posture** — Type-checker(s) + strictness level. Pre-commit hooks list. Critical paths that must have test coverage; coverage tool. Structured-logging library + log destination.

**Decisions** — Last 3–5 architecture decisions: why TimescaleDB over plain Postgres, why Caddy over Nginx, etc.

Use `AskUserQuestion` for the highest-impact 3–4 questions. Fill the rest with `confidence: inferred` placeholders the architect can correct.

### Phase B4 — Write the regenerator script

Create `<system-atlas-repo>/scripts/build-<slug>-atlas.ts` modeled on `scripts/build-quantflow-atlas.ts`. Structure:

```ts
import path from "node:path";
import { exportAtlas } from "../server/atlasFiles";
import { defaultViews, emptyCodeIntelligence } from "../src/lib/atlas";
import type { AtlasEdge, AtlasFlow, AtlasNode, AtlasProject, ViewId } from "../src/types";

// IMPORTANT: target the CONSUMER project, not the System Atlas repo
const targetRoot = path.resolve("<absolute-path-to-consumer-project>");

// ... node() / edge() / place() helpers identical to build-quantflow-atlas.ts ...

const nodes: AtlasNode[] = [
  // Stakeholders + concerns FIRST — they're why the system exists
  // System + containers — physical decomposition
  // Modules / components — logical decomposition
  // Contracts (api_contract, event_contract) — surfaces
  // Datastores + schemas + data_entities — persistence
  // External_systems + integrations — boundary
  // Pages — frontend surfaces
  // Tech_choices — explicit stack picks
  // Env_vars — runtime config
  // Deployment_nodes + environments + regions — physical topology
  // Decisions (ADRs) — rationale
  // Risks + threats + quality_scenarios — assurance
  // Alerts + runbooks — operability
];

const edges: AtlasEdge[] = [ /* ... */ ];
const flows: AtlasFlow[] = [ /* ... */ ];

const project: AtlasProject = {
  manifest: { schemaVersion: 1, name: "<Project>", description: "...", owner: "architecture", updatedAt: new Date().toISOString() },
  nodes, edges, flows,
  views: defaultViews().map(v => ({ ...v, positions: layoutsByView[v.id] ?? {} })),
  proposals: [], versions: [], evidence: [],
  intelligence: emptyCodeIntelligence()
};

async function main() {
  const result = await exportAtlas(targetRoot, project);
  // ... same validation / exit-on-error block as build-quantflow-atlas.ts
}

main().catch(e => { console.error(e); process.exit(1); });
```

**Run it** from the System Atlas repo: `npx tsx scripts/build-<slug>-atlas.ts`. This writes `<target>/architecture/` directly.

### Phase B5 — Validate + verify

1. The script exits non-zero on validation errors. Warnings are acceptable — they're honest signals (e.g. critical concepts without linked tests).
2. Open the UI pointed at the target. Confirm Pack Health is `healthy`, all major views render, Mermaid in `architecture/generated/diagrams/` looks right.
3. Tell the architect to commit `<target>/architecture/` to the consumer project's git.
4. Suggest copying System Atlas's `.claude/settings.json` + `.claude/hooks/inject-atlas-summary.mjs` into the consumer project so future Claude sessions there get the atlas auto-loaded.

### Default node-type budget for skeleton mode

A skeleton pack should hit roughly:

| Type family | Count |
|---|---|
| Stakeholders + concerns | 2–4 |
| System | 1 |
| Containers | 5–15 |
| Modules / components | 5–10 (only the load-bearing ones) |
| API contracts | 1–3 (the surfaces, not every endpoint) |
| Datastores + caches + queues | 2–5 |
| Schemas / data_entities | 3–8 (the most-touched tables) |
| External systems | 3–8 |
| Pages | 0–5 |
| Tech choices | 5–10 |
| Env vars | 3–6 (load-bearing ones, not every line of .env.example) |
| Deployment_nodes + environments + regions | 2–5 |
| Decisions | 3–6 |
| Alerts + runbooks | 2–5 |
| Risks + threats | 1–3 |
| Flows | 3–5 |

Skeleton total: **~50–80 authored nodes**. If you're past 100, push the rest into a follow-up.

---

## AI Agent reading protocol (passive trigger)

This section applies when you're doing **regular implementation work** in a repo that has an `architecture/` pack (not the operator entry point above). You probably already have the SessionStart hook summary in context; use the rest of the pack on demand.

### Source files (in priority order)

1. `architecture/generated/metadata.json` + `architecture/evidence/metadata.json` — verify `exportId` alignment (mismatch means stale generated files).
2. `architecture/generated/atlas.json` — lightweight current architecture snapshot when fresh.
3. `architecture/manifest.yaml` — system metadata and graph edges.
4. Authored concept files (one .md per node with YAML frontmatter + prose body):
   - `architecture/services/*.md` — system, container, service, app, worker, scheduler, load_balancer
   - `architecture/modules/*.md` — module, component, code_symbol, file_group, actor, team
   - `architecture/flows/*.md` — flows with steps, failure modes, acceptance checks
   - `architecture/stakeholders/*.md`, `architecture/concerns/*.md`
   - `architecture/datastores/*.md` — datastore, queue, cache, schema, data_entity, migration
   - `architecture/integrations/*.md` — external_system
   - `architecture/contracts/*.md` — contract, api_contract, event_contract
   - `architecture/deployment/*.md` — environment, region, deployment_node, env_var
   - `architecture/surfaces/*.md` — page
   - `architecture/stack/*.md` — tech_choice
   - `architecture/security/*.md` — threat
   - `architecture/reliability/*.md` — risk, quality_scenario
   - `architecture/alerts/*.md`, `architecture/runbooks/*.md`
   - `architecture/decisions/*.md` — ADRs with status + rationale
5. `architecture/views/*.yaml` — per-view layout and view-specific notes.
6. `architecture/evidence/code-intelligence.json` and split files (`project-structure.json`, `file-summaries.json`, `classes.json`, `code-symbols.json`, `routes.json`, `schemas.json`, `dependencies.json`, `test-map.json`) — observed code memory.
7. `architecture/proposals/*` — before/after architecture changes + migration briefs.
8. `architecture/versions/*.yaml` — named architecture checkpoints.

Do not treat generated Mermaid (`architecture/generated/diagrams/*.mmd`) as source of truth — they're derived.

Proposal records may have `status: draft`, `status: applied`, or `status: superseded`. Draft proposals describe a future architecture; applied proposals are historical evidence of how the main atlas moved.

### Loading the system map

When asked to understand the whole app:

1. Read `architecture/generated/metadata.json` + `architecture/evidence/metadata.json`.
2. Read `architecture/generated/overview.md`.
3. Read `architecture/manifest.yaml`.
4. Read `architecture/generated/atlas.json` if fresh; otherwise reconstruct from authored files.
5. Summarize the system by: actors + entry points; stakeholders + concerns + drivers; systems/containers/components; apps/services/workers; deployment; datastores/schemas/queues; external systems; class facts; API surface; schema model; critical flows; security threats; risks; decisions; linked files.

Keep summaries compact. For large systems, prefer critical and high-risk paths first.

### Updating the atlas during implementation

1. Preserve stable IDs unless the concept truly changes identity.
2. Update authored files first, not generated files.
3. Keep edges in `architecture/manifest.yaml`.
4. Add or update `linked_files` and `linked_tests` whenever architecture changes touch implementation.
5. Record stakeholders and concerns when the reason for a change comes from a user, team, quality driver, regulatory need, operational need, or business outcome.
6. Record risks and invariants for critical paths, datastores, schemas, contracts, threats, decisions, and external systems.
7. Preserve structured API metadata when changing public contracts: endpoint method, path, auth, request, response, status codes, handler, tests, rate limits, idempotency.
8. Preserve structured schema metadata when changing persistence: columns, primary keys, indexes, constraints, foreign keys, relations, migration policy.

After editing architecture files directly, tell the user to check the System Atlas UI. It should auto-reload when there are no unsaved UI edits; if the UI reports external changes, the architect chooses disk-wins or UI-wins.

### Implementing a proposal diff

1. Locate the active proposal under `architecture/proposals/`.
2. Read `proposal.yaml`, `before.yaml`, `after.yaml`, `migration-brief.md`.
3. Identify affected nodes, edges, flows, linked files, linked tests, invariants, forbidden changes, acceptance checks.
4. Inspect only the code needed for the affected scope before editing.
5. Implement to satisfy the proposed architecture.
6. Update tests or add tests required by the migration brief.
7. Update the atlas if implementation details differ from the proposed architecture.
8. Run the relevant validation / build / test commands.

Do not weaken invariants, remove tests, bypass owners of datastores/contracts, or introduce undocumented external calls without explicit acknowledgement in your output.

### Proposal lifecycle

1. `before.yaml` = accepted current architecture at proposal creation time.
2. `after.yaml` = proposed future architecture.
3. `migration-brief.md` = implementation contract, not vague prompt.
4. After implementation, compare resulting code + tests to `after.yaml`.
5. If implementation differs, update the proposal or the atlas explicitly — do not silently drift.
6. Once accepted, the app applies `after.yaml` back into the main atlas and marks the proposal `status: applied`. An auto-checkpoint is created in `architecture/versions/`.

Do not implement an old applied proposal as if it were still a requested future change. Applied proposals are history and rationale.

### Context budget

When context must stay below roughly 100k tokens:

1. Focused context pack for single-node or small change work.
2. Standard context pack for normal implementation across several related nodes.
3. Expanded context pack only for broad refactors or design reviews.
4. Start with `generated/overview.md`, the active proposal/migration brief, and the selected flow or node.
5. Include only affected concepts and their first-degree edges before expanding.
6. Include linked file paths and short summaries before reading full source files.
7. Read full files only for changed modules, tests, contracts, or invariants.
8. Avoid loading generated Mermaid diagrams unless layout itself is relevant.

### Expected output for atlas-aware work

Report:

- Architecture concepts changed
- Code files changed
- Tests run
- Validation / build result
- Any drift between the implemented code and the atlas

---

## Pitfalls

- **Don't invent metadata.** If you don't know the rate limit, leave the field empty. A wrong fact is worse than a missing one because the LLM trusts the pack.
- **Don't blindly promote scan results.** Scan output lives in `architecture/evidence/`, separate by design. Only promote a discovered class/route/schema if the architect would consider it source-of-truth.
- **Skeleton beats full when in doubt.** A 50-node atlas the architect maintains beats a 200-node atlas that drifts within a month.
- **Use `confidence: inferred` for anything not directly stated by the architect or a doc.**
- **Don't model what fits a CLAUDE.md note better.** Conventions and pitfalls belong in CLAUDE.md; the atlas is for typed structural facts.
- **Don't run the dev server pointed at the wrong workspace.** Always set `SYSTEM_ATLAS_WORKSPACE=<absolute-path>` explicitly when working on consumer projects, or you'll edit System Atlas's own pack by mistake.
