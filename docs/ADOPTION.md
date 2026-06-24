# Adopting System Atlas in Another Project

> **Status: proposal / living strategy.** This document describes the *current ad-hoc integration* and prescribes the *recommended model* for how a consumer project adopts System Atlas. Nothing here is auto-applied to other repositories -- rolling any of it out is a human decision. Keep this current as the integration evolves.

## 1. What "adopting System Atlas" gives a project

A project adopts System Atlas when it gains a repo-native `architecture/` pack that is:

- **the source of truth** for the system's structure (services, datastores, contracts, flows, deployment, decisions, risks), versioned in the project's own Git;
- **auto-loaded** into every AI coding session (a compact summary at session start), so an agent starts with the system map instead of re-discovering it from source;
- **importance-weighted**, so load-bearing things (production hosting, deployment topology, data stores, trust boundaries, critical/money paths) are surfaced above incidental ones (a marketing page, a trivial file);
- **navigable by both audiences** -- humans via the System Atlas canvas/diagrams, LLMs via `generated/overview.md`, `generated/atlas.json`, and context packs.

Adoption is not "install a dependency." It is: generate the pack, commit it to the consumer repo, and wire up auto-discovery so every future session uses it.

## 2. The moving parts (current integration)

System Atlas's cross-project integration is currently spread across five mechanisms:

| # | Mechanism | Where it lives | Role |
|---|---|---|---|
| 1 | **`architecture/` pack** | the **consumer** repo | The content: typed graph + generated views. Presence of `architecture/manifest.yaml` = "this repo is adopted." |
| 2 | **Regenerator** `scripts/build-<slug>-atlas.ts` | the **System Atlas** repo | Typed, reproducible source for a consumer's pack. `npx tsx scripts/build-<slug>-atlas.ts` from this repo writes into the consumer's `architecture/`. |
| 3 | **SessionStart auto-load hook** | the **consumer** repo's `.claude/settings.json` + `.claude/hooks/inject-atlas-summary.mjs` | Injects the pack summary at the top of every session so agents start with the map. |
| 4 | **`system-atlas` skill** | **global** `~/.claude/skills/system-atlas/` (plus a dev copy in this repo's `.claude/skills/`) | The operator/agent protocol: BUILD mode (no pack yet), EXISTING-PACK mode, and the reading/updating protocol. |
| 5 | **Global CLAUDE.md "System Atlas architecture packs" section** | `~/.claude/CLAUDE.md` | Cross-repo instruction: when a repo has `architecture/`, treat it as source of truth and read it before re-discovering from source. |

**Honest gaps in this ad-hoc state:**

- **No single entrypoint.** Discovery relies on three overlapping things (hook + global CLAUDE.md + skill). A repo with the pack but *without* the hook only auto-discovers via the global CLAUDE.md -- which is per-machine, not committed with the project, so it's invisible to a teammate.
- **The regenerator lives centrally, not with the pack.** A consumer repo cannot regenerate its own `architecture/` without the System Atlas repo (the script + `exportAtlas` live here). The pack is portable; the means to refresh it is not.
- **The skill is duplicated** (global + this repo's `.claude/skills/`). Only the global one is reachable from consumer repos.
- **Onboarding is tribal knowledge.** The steps exist only inside the skill's BUILD-mode Phase B5; there is no consumer-facing checklist.

## 3. Recommended entrypoint

**Recommendation: the `architecture/` convention + the SessionStart hook are the primary entrypoint, backed by a short standard `CLAUDE.md` "Architecture" stanza.**

The strongest discovery is the one that needs no agent initiative. The SessionStart hook injects the map automatically and is committed *with the consumer repo*, so it works for any teammate/agent regardless of global config. The `CLAUDE.md` stanza is the human- and non-hook-agent-readable pointer. The `architecture/` folder itself is the convention key everything else recognizes.

### Alternatives considered

| Entrypoint | Pros | Cons | Verdict |
|---|---|---|---|
| **SessionStart hook + `architecture/` convention** | Zero-initiative auto-load; committed with the repo; works every session | Requires copying the hook + script into each consumer repo | **Primary** |
| **`CLAUDE.md` "Architecture" stanza** (short pointer to pack + skill) | Committed with repo; human-readable; works without the hook | Relies on the agent reading CLAUDE.md and following the pointer | **Secondary (always include)** |
| **`docs/` pointer** (`docs/ARCHITECTURE.md` -> `architecture/generated/ARCHITECTURE.md`) | Familiar location for humans browsing docs | Another file to keep from drifting; doesn't help agents find the typed graph | Optional, human doc-browsing only |
| **Global `~/.claude/CLAUDE.md` section only** | One place; already exists | Per-machine, not committed with the project; invisible to teammates | **Fallback only** |

The recommended model layers these: the hook (auto), the CLAUDE.md stanza (committed pointer), and the global CLAUDE.md section (cross-repo fallback). The generated `architecture/generated/ARCHITECTURE.md` (the human+LLM-readable doc this repo's exporter produces) is the natural target for any `docs/` pointer a project wants.

## 4. Skills: what's needed and how it's wired

- **Canonical: the global skill** at `~/.claude/skills/system-atlas/SKILL.md`. Being global, it is available in *every* repo on the machine with no per-project install. A consumer repo needs **no** skill files of its own.
- **The copy in this repo's `.claude/skills/system-atlas/`** exists for developing System Atlas itself and as the source to sync to global. Consumers should not need it.
- **Plugin packaging (future option):** to share the skill across machines/teammates without manual `~/.claude` copying, package `system-atlas` as a Claude Code plugin -- distributable + versioned, at the cost of another published artifact (see section 8).

So **adoption requires no skill changes in the consumer repo** -- only that the global (or plugin) skill is installed on whoever's machine runs Claude there.

## 5. Agent-discovery protocol (how an agent in a consumer repo uses the pack)

1. **Session start:** the hook (`inject-atlas-summary.mjs`) injects the manifest header + `generated/overview.md` + generated/evidence metadata. The agent has the system shape and critical areas in context without reading anything.
2. **On demand, in priority order** (from the skill's reading protocol): `generated/metadata.json` + `evidence/metadata.json` (check `exportId` alignment -> stale?), then `generated/atlas.json` (full graph if fresh), then `manifest.yaml`, then authored concept files under `architecture/<area>/*.md`, then `views/*.yaml`, then `evidence/*.json`, then `proposals/*`.
3. **Importance first:** for large systems, read critical and high-criticality paths before incidental ones.
4. **Never treat generated Mermaid as source** -- it is derived.
5. **Updating during implementation:** edit authored files (not generated), keep edges in `manifest.yaml`, update `linked_files`/`linked_tests`, then prefer re-running the regenerator over hand-editing generated output.

This protocol already lives in `.claude/skills/system-atlas/SKILL.md` ("AI Agent reading protocol") and the README ("AI Agent Workflow"); adoption just ensures the agent is *pointed at it* (hook + CLAUDE.md stanza).

## 6. The regenerator coupling (the main open tension)

Today a consumer's pack is regenerated by `scripts/build-<slug>-atlas.ts` **in the System Atlas repo**, which imports this repo's `exportAtlas`. Consequences:

- **Pro:** one typed source per consumer, reproducible, always uses the current `exportAtlas` (no format skew across consumers); the consumer repo stays clean (just the `architecture/` output).
- **Con:** the consumer repo *cannot refresh its own pack* without the System Atlas repo checked out alongside it; "edit the script and re-run" (per the global CLAUDE.md guidance) means editing a file in a *different* repo.

**Recommendation:** keep the regenerator central for now (reproducibility + no version skew win while the exporter format is still evolving), but **document the dependency explicitly** in each consumer's CLAUDE.md stanza ("regenerate via `npx tsx scripts/build-<slug>-atlas.ts` in the System Atlas repo"). Revisit if/when consumers need to self-regenerate (section 8).

## 7. Adoption checklist (onboard a new consumer project)

Given a consumer project at `<target>`:

1. **Build the pack.** From the System Atlas repo, follow the skill's BUILD mode: read the consumer's README/CLAUDE.md/docker-compose/manifests, interview for the implicit facts (deployment, reliability, cost, decisions), write `scripts/build-<slug>-atlas.ts` (modeled on `dogfood-atlas.ts`), and run `npx tsx scripts/build-<slug>-atlas.ts` -> it writes `<target>/architecture/`.
2. **Verify.** Point the UI at `<target>` (`SYSTEM_ATLAS_WORKSPACE=<target> SYSTEM_ATLAS_WEB_PORT=5176 SYSTEM_ATLAS_API_PORT=5177 npm run dev`, open `http://127.0.0.1:5176`). Confirm Pack Health is healthy and the critical areas are weighted right.
3. **Wire auto-load.** Copy this repo's SessionStart hook into the consumer: the `SessionStart` entry in `.claude/settings.json` (`node .claude/hooks/inject-atlas-summary.mjs`) and the `.claude/hooks/inject-atlas-summary.mjs` script.
4. **Add the pointer.** Add a short "Architecture" stanza to the consumer's `CLAUDE.md`: the pack is the source of truth, read `architecture/generated/overview.md` first, the full graph is `architecture/generated/atlas.json`, regenerate via the central script, use the `/system-atlas` skill. (Optional: a `docs/ARCHITECTURE.md` pointer to `architecture/generated/ARCHITECTURE.md` for human doc-browsing.)
5. **Commit** `<target>/architecture/`, the `.claude/` hook wiring, and the CLAUDE.md stanza to the consumer repo.
6. **Confirm discovery.** Start a fresh Claude session in the consumer repo; the SessionStart summary should appear.

## 8. Open decisions (human, not auto-applied)

- **Vendor the regenerator into consumers?** Would let a consumer self-regenerate, at the cost of duplicating `exportAtlas` (format-skew risk). Keep central until the exporter format stabilizes.
- **Package the skill + hook as a Claude Code plugin?** A distributable, versioned adoption unit vs. another published artifact. Strong candidate once the model is stable.
- **Standardize the CLAUDE.md "Architecture" stanza** as a copy-paste snippet (or generator) so every consumer's pointer is identical.
- **Converge on one canonical discovery** so there is exactly one answer to "if `architecture/` exists, here's what happens" (today: hook + global CLAUDE.md + skill overlap).

---

*Files referenced:* pack at `<consumer>/architecture/`; regenerator at `<system-atlas>/scripts/build-<slug>-atlas.ts`; hook at `<consumer>/.claude/hooks/inject-atlas-summary.mjs` wired in `<consumer>/.claude/settings.json`; skill at `~/.claude/skills/system-atlas/SKILL.md`; cross-repo instruction in `~/.claude/CLAUDE.md`.
