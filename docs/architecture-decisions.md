# System Atlas Architecture Decisions

## 1. The architecture graph is the product core

The canvas is an editor for a typed architecture graph. Diagrams, Markdown, Mermaid, context packs, migration briefs, and validation are generated from that graph.

## 2. Repo files beat an app database for v1

Architecture state is exported into `architecture/` so Git diffs, code review, and external AI agents can inspect it directly. The local API writes only inside the project workspace.

## 3. Observed evidence is separate from intended design

Code scanning produces evidence such as folders, files, tests, migrations, and configs. It does not silently rewrite intended architecture. The architect links or promotes evidence deliberately.

## 4. Proposals are first-class

AI migration briefs are generated from before/after snapshots, not from a loose prompt. This keeps implementation work tied to explicit architecture intent, risks, invariants, and acceptance checks.

## 5. Views own their layouts

The same architecture element can appear in different positions across Overview, Components, Flows, Data, Health, and Proposals. Each view answers a different question, so layout belongs to the view instead of being a single global node property.
