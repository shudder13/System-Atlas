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
- **Multiple views over one model**: C4, runtime, deployment, data, domain, security, health, decision, and proposal views are different lenses over the same architecture graph.
- **Code evidence links**: architecture concepts can point to real files, folders, tests, contracts, and generated evidence.
- **Proposal-driven change**: future designs are modeled as before/after proposals, then turned into implementation briefs.
- **LLM-ready context**: migration briefs tell an AI what changed, which files are affected, what invariants must hold, what risks matter, and which tests should protect the change.
- **Local-first by default**: the MVP is single-user, Git-friendly, and designed to work from the project folder.

## Why This Exists

LLMs are very good at producing local code changes, but they do not automatically understand the long-term architecture of a real system. They may miss ownership boundaries, critical flows, data invariants, external integration risks, or regression-prone areas.

System Atlas gives the architect a durable mental map that can be shared with AI tools. The architect updates the model, reviews proposed architecture changes, and exports a context pack that helps an LLM implement the change without drifting from the design.

This is closer to **AI-assisted Model-Driven Development** than classic diagramming. The diagrams are not just pictures; they are views of a structured model that can drive review, validation, and migration work.

## What is included

- React + TypeScript Vite client
- Local Node/Express API
- React Flow canvas with separate layouts per architecture view
- C4-inspired context, container, component, and code views
- Deployment, data, domain, security, decision, health, and proposal view families
- Mermaid and Markdown generation
- Repo-native `architecture/` export pack
- Blank and generic starter atlases
- Validation, semantic diffs, context packs, migration briefs, and lightweight code scanning
- TypeScript/JavaScript evidence indexing for imports, exports, routes, top-level symbols, file sizes, and line counts

## Architecture Pack

System Atlas exports architecture state into the repository:

```text
architecture/
  manifest.yaml
  modules/*.md
  services/*.md
  flows/*.md
  datastores/*.md
  integrations/*.md
  contracts/*.md
  deployment/*.md
  security/*.md
  reliability/*.md
  decisions/*.md
  views/*.yaml
  proposals/*/
  evidence/code-map.json
  generated/overview.md
  generated/diagrams/*.mmd
```

Each concept file uses structured frontmatter plus Markdown notes, so it can be reviewed in Git, passed to AI agents, or edited outside the app.

## Current MVP

The MVP focuses on manual architecture modeling first:

- Create architecture nodes and typed edges visually.
- Link concepts to files, folders, tests, contracts, flows, and risks.
- Switch between architecture views without duplicating the underlying model.
- Create proposals and generate semantic before/after diffs.
- Generate AI migration briefs for implementation work.
- Run Scan to create a capped Code view from repository files and symbols.
- Export a repo-native architecture pack.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

The API runs on `http://localhost:5174` and writes architecture files under this project folder only.
