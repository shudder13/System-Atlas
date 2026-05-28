import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportAtlas } from "../server/atlasFiles";
import { defaultViews, emptyCodeIntelligence } from "../src/lib/atlas";
import type { AtlasEdge, AtlasFlow, AtlasNode, AtlasProject, ViewId } from "../src/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const now = "2026-05-28T18:00:00.000Z";

const layoutsByView: Partial<Record<ViewId, Record<string, { x: number; y: number }>>> = {};

function place(view: ViewId, id: string, x: number, y: number) {
  layoutsByView[view] ??= {};
  layoutsByView[view]![id] = { x, y };
}

function node(partial: Omit<AtlasNode, "owner" | "status" | "confidence" | "responsibilities" | "dependencies" | "invariants" | "linkedFiles" | "linkedTests" | "risks" | "metadata"> & Partial<AtlasNode>): AtlasNode {
  return {
    owner: partial.owner ?? "architecture",
    status: partial.status ?? "active",
    confidence: partial.confidence ?? "manual",
    responsibilities: partial.responsibilities ?? [],
    dependencies: partial.dependencies ?? [],
    invariants: partial.invariants ?? [],
    linkedFiles: partial.linkedFiles ?? [],
    linkedTests: partial.linkedTests ?? [],
    risks: partial.risks ?? [],
    metadata: partial.metadata ?? {},
    ...partial
  } as AtlasNode;
}

function edge(id: string, source: string, target: string, type: AtlasEdge["type"], extras: Partial<AtlasEdge> = {}): AtlasEdge {
  return { id, source, target, type, ...extras };
}

const nodes: AtlasNode[] = [
  // Stakeholders + concerns
  node({
    id: "stakeholder.architect",
    type: "stakeholder",
    name: "Architect",
    criticality: "high",
    responsibilities: ["Maintain intended architecture", "Author proposals", "Review AI-generated diffs"],
    metadata: { role: "Software architect / project owner", influence: "Owner", successCriteria: ["Atlas stays in sync with repo", "AI agents implement migrations without drifting"] }
  }),
  node({
    id: "stakeholder.ai_agent",
    type: "stakeholder",
    name: "AI Agent",
    criticality: "high",
    responsibilities: ["Read architecture pack before opening source", "Implement proposal diffs", "Update architecture files alongside code"],
    metadata: { role: "Claude Code, Codex, or comparable coding agent", influence: "Implementer" }
  }),
  node({
    id: "concern.living_architecture",
    type: "concern",
    name: "Living architecture",
    criticality: "critical",
    responsibilities: ["The diagrams must not drift from the code"],
    metadata: { category: "Operability", sourceStakeholder: "Architect", priority: "Critical", acceptanceCriteria: ["Pack Health reports healthy after every commit", "Generated files match authored source revision"] }
  }),
  node({
    id: "concern.ai_migration_safety",
    type: "concern",
    name: "AI migration safety",
    criticality: "critical",
    responsibilities: ["AI must not silently weaken invariants when implementing a proposal"],
    metadata: { category: "Reliability", sourceStakeholder: "Architect", priority: "Critical", acceptanceCriteria: ["Every migration brief lists forbidden changes and acceptance checks", "Validation passes after the AI's commit"] }
  }),
  node({
    id: "concern.local_first",
    type: "concern",
    name: "Local-first + Git-friendly",
    criticality: "high",
    responsibilities: ["Architecture state must live in repo files reviewable in Git"],
    metadata: { category: "Operability", sourceStakeholder: "Architect", priority: "High", acceptanceCriteria: ["No hidden app database", "Architecture pack is human-readable Markdown + YAML"] }
  }),

  // System + containers
  node({
    id: "system.atlas",
    type: "system",
    name: "System Atlas",
    criticality: "high",
    architectureLevel: "system",
    responsibilities: ["Edit, validate, and export a typed architecture graph", "Generate Mermaid, Markdown, context packs, and migration briefs for AI agents"]
  }),
  node({
    id: "container.web",
    type: "container",
    name: "Web Client (Vite + React)",
    criticality: "high",
    architectureLevel: "container",
    linkedFiles: ["src/", "index.html", "vite.config.ts"],
    responsibilities: ["React Flow canvas for each architecture view", "Trigger Scan/Validate/Export/Brief via the API"],
    metadata: { sla: "Dev-only; no production SLA", scaling: "Single user, single browser tab" }
  }),
  node({
    id: "container.api",
    type: "container",
    name: "API Server (Express)",
    criticality: "high",
    architectureLevel: "container",
    linkedFiles: ["server/index.ts"],
    responsibilities: ["Serve /api endpoints", "Read and write the architecture/ pack on disk", "Run the workspace scanner"]
  }),
  node({
    id: "container.pack",
    type: "container",
    name: "Architecture Pack (filesystem)",
    criticality: "critical",
    architectureLevel: "data",
    linkedFiles: ["architecture/"],
    responsibilities: ["Hold the authored architecture state and all derived artifacts", "Round-trip cleanly between UI and disk"]
  }),

  // Modules / components
  node({
    id: "module.atlas_core",
    type: "module",
    name: "atlas-core (pure domain)",
    criticality: "critical",
    architectureLevel: "component",
    linkedFiles: ["src/lib/atlas.ts"],
    linkedTests: ["src/lib/atlas.test.ts"],
    responsibilities: ["Validation, layout, Mermaid, overview, context-pack, migration-brief, semantic-diff", "Pure functions — no I/O"],
    invariants: ["No filesystem or network imports in this module"]
  }),
  node({
    id: "module.canvas",
    type: "component",
    name: "Atlas Canvas",
    criticality: "high",
    architectureLevel: "component",
    linkedFiles: ["src/components/AtlasCanvas.tsx"],
    responsibilities: ["React Flow node/edge rendering and selection"]
  }),
  node({
    id: "module.inspector",
    type: "component",
    name: "Inspector",
    criticality: "high",
    architectureLevel: "component",
    linkedFiles: ["src/components/Inspector.tsx"],
    responsibilities: ["Edit selected node/edge/flow properties"]
  }),
  node({
    id: "module.structured_editors",
    type: "component",
    name: "Structured Editors",
    criticality: "medium",
    architectureLevel: "component",
    linkedFiles: ["src/components/StructuredEditors.tsx"],
    responsibilities: ["Typed forms for per-node-type metadata profiles (API contract, schema, runtime, ...)"]
  }),
  node({
    id: "module.import_review",
    type: "component",
    name: "Import Review",
    criticality: "medium",
    architectureLevel: "component",
    linkedFiles: ["src/components/ImportReview.tsx"],
    responsibilities: ["Promote scanned files/classes/routes/schemas into authored atlas nodes"]
  }),
  node({
    id: "module.code_intel_explorer",
    type: "component",
    name: "Code Intelligence Explorer",
    criticality: "medium",
    architectureLevel: "component",
    linkedFiles: ["src/components/CodeIntelligenceExplorer.tsx"],
    responsibilities: ["Browse saved project structure, files, classes, routes, schemas, deps, tests"]
  }),
  node({
    id: "module.atlas_files",
    type: "module",
    name: "atlas-files (I/O + scanner)",
    criticality: "critical",
    architectureLevel: "component",
    linkedFiles: ["server/atlasFiles.ts"],
    linkedTests: ["server/atlasFiles.test.ts"],
    responsibilities: ["Read/write architecture/ pack", "TS-compiler-based code intelligence scan", "Pack-health + revision hashing"]
  }),
  node({
    id: "module.workspaces",
    type: "module",
    name: "workspaces registry",
    criticality: "high",
    architectureLevel: "component",
    linkedFiles: ["server/workspaces.ts"],
    linkedTests: ["server/workspaces.test.ts"],
    responsibilities: ["Per-machine registry of projects the workbench knows about", "Atomic JSON persistence at ~/.system-atlas/workspaces.json (Windows: %APPDATA%/system-atlas/workspaces.json)", "Add/select/rename/remove + env-var bootstrap"],
    invariants: ["Writes are atomic (write temp + rename)", "Registry path is per-user, never inside a project"]
  }),
  node({
    id: "module.workspace_picker",
    type: "component",
    name: "Workspace Picker + Onboarding",
    criticality: "high",
    architectureLevel: "component",
    linkedFiles: ["src/components/WorkspacePicker.tsx", "src/components/WorkspaceOnboarding.tsx"],
    responsibilities: ["Top-bar dropdown to switch between added projects", "Add / rename / remove workspaces inline", "Onboarding screen rendered when registry is empty"]
  }),

  // Contracts
  node({
    id: "api.rest",
    type: "api_contract",
    name: "REST API (/api)",
    criticality: "high",
    architectureLevel: "container",
    responsibilities: ["GET /api/project, /api/templates, /api/code-intelligence, /api/pack-health, /api/project/revision", "POST /api/draft/validate, /api/export, /api/scan, /api/context-pack, /api/proposal, /api/migration-brief"],
    metadata: {
      version: "0.1",
      authMode: "None (local-only)",
      baseUrl: "http://localhost:5174",
      rateLimitPerMinute: 0,
      rateLimitBurst: 0,
      rateLimitScope: "global",
      rateLimitEnforcedAt: "none — single-user local-only API"
    }
  }),

  // Frontend pages (single-page app — one route)
  node({
    id: "page.workbench",
    type: "page",
    name: "Workbench (/)",
    criticality: "high",
    architectureLevel: "component",
    linkedFiles: ["src/App.tsx", "index.html"],
    responsibilities: ["Single-page React app that owns the entire workbench: canvas, inspector, inventory, preview panel"],
    metadata: {
      route: "/",
      layout: "App shell with sidebar inventory, central canvas, and right-side inspector",
      authRequired: false,
      components: ["AtlasCanvas", "Inspector", "Inventory", "PreviewPanel", "ImportReview", "CodeIntelligenceExplorer", "StructuredEditors"],
      dataFetched: ["GET /api/project", "GET /api/templates", "GET /api/pack-health", "GET /api/code-intelligence"],
      ssrMode: "CSR (Vite SPA)",
      seo: "Private/no-index — local dev tool, not deployed"
    }
  }),

  // Tech stack — explicit choices
  node({
    id: "tech.react",
    type: "tech_choice",
    name: "React 19",
    criticality: "high",
    architectureLevel: "domain",
    responsibilities: ["UI rendering framework"],
    metadata: { category: "Frontend framework", version: "^19.0.0", rationale: "Mature ecosystem, React Flow integration, useState/useMemo are enough for this app's state shape", alternatives: ["Svelte", "SolidJS", "Vue"], reviewCadence: "On React 20 release" }
  }),
  node({
    id: "tech.vite",
    type: "tech_choice",
    name: "Vite 6",
    criticality: "medium",
    architectureLevel: "domain",
    responsibilities: ["Frontend dev server and bundler"],
    metadata: { category: "Build tool", version: "^6.0.6", rationale: "Fast HMR, simple config, first-class React plugin", alternatives: ["Next.js", "Webpack", "Parcel"], reviewCadence: "Yearly" }
  }),
  node({
    id: "tech.xyflow",
    type: "tech_choice",
    name: "@xyflow/react",
    criticality: "high",
    architectureLevel: "domain",
    responsibilities: ["Interactive node-and-edge canvas"],
    metadata: { category: "Library", version: "^12.8.5", rationale: "Production-grade graph editor; pan/zoom/select/edge-routing handled out of the box", alternatives: ["react-archer", "reaflow", "custom SVG"], reviewCadence: "Yearly" }
  }),
  node({
    id: "tech.express",
    type: "tech_choice",
    name: "Express 5",
    criticality: "medium",
    architectureLevel: "domain",
    responsibilities: ["Tiny JSON API server"],
    metadata: { category: "Backend framework", version: "^5.1.0", rationale: "Smallest dependency that gives JSON routes; the API has 11 endpoints with no auth/middleware needs", alternatives: ["Fastify", "Hono", "raw node:http"], reviewCadence: "Only if the API grows past ~30 endpoints" }
  }),
  node({
    id: "tech.typescript_strict",
    type: "tech_choice",
    name: "TypeScript strict mode",
    criticality: "critical",
    architectureLevel: "domain",
    responsibilities: ["Type safety across the whole codebase"],
    metadata: { category: "Language", version: "^5.7.2", rationale: "Discriminated unions for NODE_TYPES/EDGE_TYPES/VIEW_IDS make the typed graph self-validating", alternatives: ["JS + JSDoc", "TypeScript without strict"], reviewCadence: "Permanent decision" }
  }),

  // Configuration — env vars
  node({
    id: "env.api_port",
    type: "env_var",
    name: "SYSTEM_ATLAS_API_PORT",
    criticality: "medium",
    architectureLevel: "deployment",
    linkedFiles: ["server/index.ts", "vite.config.ts"],
    responsibilities: ["Port for the Express API"],
    metadata: { scope: "server (Express) + vite proxy", sensitive: false, required: false, defaultValue: "5174", envExamplePath: "README.md (Configuration section)", rotationPolicy: "n/a" }
  }),
  node({
    id: "env.web_port",
    type: "env_var",
    name: "SYSTEM_ATLAS_WEB_PORT",
    criticality: "medium",
    architectureLevel: "deployment",
    linkedFiles: ["vite.config.ts"],
    responsibilities: ["Port for the Vite dev server"],
    metadata: { scope: "vite", sensitive: false, required: false, defaultValue: "5173", envExamplePath: "README.md (Configuration section)", rotationPolicy: "n/a" }
  }),
  node({
    id: "env.workspace",
    type: "env_var",
    name: "SYSTEM_ATLAS_WORKSPACE",
    criticality: "high",
    architectureLevel: "deployment",
    linkedFiles: ["server/index.ts"],
    responsibilities: ["Absolute path to the project whose architecture/ pack should be read and written"],
    metadata: { scope: "server (Express)", sensitive: false, required: false, defaultValue: "process.cwd()", envExamplePath: "README.md (Open a different project)", rotationPolicy: "n/a" }
  }),

  // Datastore (filesystem)
  node({
    id: "store.evidence",
    type: "datastore",
    name: "Evidence files",
    criticality: "high",
    architectureLevel: "data",
    linkedFiles: ["architecture/evidence/"],
    responsibilities: ["Persist scanned code intelligence between sessions"],
    metadata: { dataOwner: "atlas-files", retention: "Until next Scan rewrites it", consistency: "Overwritten as a unit on Export" }
  }),
  node({
    id: "store.workspaces",
    type: "datastore",
    name: "Workspace registry (per-machine)",
    criticality: "high",
    architectureLevel: "data",
    linkedFiles: ["~/.system-atlas/workspaces.json"],
    responsibilities: ["Tracks all projects the workbench is aware of", "Holds currentWorkspaceId so the same browser session can switch between projects without restart"],
    metadata: { dataOwner: "workspaces module", retention: "Indefinite per-user", consistency: "Atomic writes via temp+rename", containsPii: false }
  }),

  // Decisions (transposed from docs/architecture-decisions.md)
  node({
    id: "decision.graph_is_product",
    type: "decision",
    name: "The architecture graph is the product core",
    criticality: "critical",
    responsibilities: ["All derived artifacts (Mermaid, MD, briefs) come from the typed graph, not free-text"],
    metadata: { adrStatus: "Accepted" }
  }),
  node({
    id: "decision.repo_files_beat_db",
    type: "decision",
    name: "Repo files beat an app database for v1",
    criticality: "critical",
    responsibilities: ["Architecture state is exported into architecture/ for Git review"],
    metadata: { adrStatus: "Accepted" }
  }),
  node({
    id: "decision.evidence_separate_from_intent",
    type: "decision",
    name: "Observed evidence is separate from intended design",
    criticality: "high",
    responsibilities: ["Scanner output never silently rewrites the authored atlas"],
    metadata: { adrStatus: "Accepted" }
  }),
  node({
    id: "decision.proposals_first_class",
    type: "decision",
    name: "Proposals are first-class",
    criticality: "critical",
    responsibilities: ["Migration briefs are generated from before/after snapshots, not loose prompts"],
    metadata: { adrStatus: "Accepted" }
  }),
  node({
    id: "decision.views_own_layouts",
    type: "decision",
    name: "Views own their layouts",
    criticality: "medium",
    responsibilities: ["Each view stores its own positions instead of using a single global node position"],
    metadata: { adrStatus: "Accepted" }
  }),
  node({
    id: "decision.multi_workspace_runtime",
    type: "decision",
    name: "Workspace is runtime state, not env-locked",
    criticality: "high",
    responsibilities: ["A single workbench instance manages many projects via an in-UI picker", "Per-machine registry persists across restarts; SYSTEM_ATLAS_WORKSPACE remains a one-shot bootstrap"],
    metadata: { adrStatus: "Accepted" },
    notes: "Earlier design read SYSTEM_ATLAS_WORKSPACE once at server boot. That forced a restart to switch projects. The runtime registry pattern matches what tools like Postman / TablePlus do — launch once, work on any project."
  }),

  // Risks
  node({
    id: "risk.bundle_size",
    type: "risk",
    name: "Client bundle creeping past 500 KB",
    criticality: "medium",
    responsibilities: ["Vite warns; mermaid and React Flow are the heavy ones"],
    metadata: { likelihood: "Observed", impact: "Slower first-load, no functional break", mitigation: "Lazy-load mermaid; consider manualChunks" }
  }),
  node({
    id: "risk.atlas_monolith",
    type: "risk",
    name: "src/lib/atlas.ts past 2000 lines",
    criticality: "medium",
    responsibilities: ["Single file owns validation, layout, generation, diff, import — sustainable for now but watch for further growth"],
    metadata: { likelihood: "Observed", impact: "Cognitive load on changes", mitigation: "Split along natural seams when next major feature lands" }
  }),
  node({
    id: "risk.port_collision",
    type: "risk",
    name: "Default API port 5174 collides with a-private-project",
    criticality: "high",
    responsibilities: ["Without a startup check the API is silently shadowed by whatever already owns the port"],
    metadata: { likelihood: "Observed", impact: "All /api calls 404 against the wrong service", mitigation: "Startup port-conflict check; configurable port via env" }
  }),

  // Quality scenario
  node({
    id: "quality.pack_roundtrip",
    type: "quality_scenario",
    name: "Pack round-trip fidelity",
    criticality: "high",
    responsibilities: ["Export → reload → semantic equality of nodes, edges, flows, views, proposals must hold"],
    metadata: { measurement: "Validation passes, semanticDiff returns empty after roundtrip" }
  }),

  // Threats
  node({
    id: "threat.mermaid_injection",
    type: "threat",
    name: "Mermaid CSS/HTML injection (CVEs)",
    criticality: "medium",
    responsibilities: ["mermaid 11.0–11.14 has open advisories around classDefs / config sanitisation"],
    risks: ["risk.bundle_size"],
    metadata: { mitigation: "npm audit fix to the next patched line; render only architect-authored input" }
  })
];

const edges: AtlasEdge[] = [
  edge("e.sys_contains_web", "system.atlas", "container.web", "contains"),
  edge("e.sys_contains_api", "system.atlas", "container.api", "contains"),
  edge("e.sys_contains_pack", "system.atlas", "container.pack", "contains"),

  edge("e.web_contains_canvas", "container.web", "module.canvas", "contains"),
  edge("e.web_contains_inspector", "container.web", "module.inspector", "contains"),
  edge("e.web_contains_structured", "container.web", "module.structured_editors", "contains"),
  edge("e.web_contains_import", "container.web", "module.import_review", "contains"),
  edge("e.web_contains_codeintel", "container.web", "module.code_intel_explorer", "contains"),
  edge("e.web_contains_atlas_core", "container.web", "module.atlas_core", "contains"),

  edge("e.api_contains_atlas_files", "container.api", "module.atlas_files", "contains"),
  edge("e.api_contains_atlas_core", "container.api", "module.atlas_core", "contains"),

  edge("e.web_calls_api", "container.web", "container.api", "calls", { protocol: "HTTP/JSON", interaction: "sync", auth: "none (local)", description: "Vite dev server proxies /api/* to the Express server" }),
  edge("e.api_exposes_rest", "container.api", "api.rest", "exposes"),
  edge("e.web_consumes_rest", "container.web", "api.rest", "depends_on", { description: "Uses src/lib/api.ts wrapper" }),

  edge("e.canvas_depends_core", "module.canvas", "module.atlas_core", "depends_on"),
  edge("e.inspector_depends_core", "module.inspector", "module.atlas_core", "depends_on"),
  edge("e.import_depends_core", "module.import_review", "module.atlas_core", "depends_on"),
  edge("e.atlas_files_depends_core", "module.atlas_files", "module.atlas_core", "depends_on"),

  edge("e.api_writes_pack", "container.api", "container.pack", "writes", { description: "exportAtlas writes manifest, concept files, views, generated/, evidence/" }),
  edge("e.api_reads_pack", "container.api", "container.pack", "reads", { description: "loadAtlas reads on every /api/project" }),
  edge("e.api_writes_evidence", "module.atlas_files", "store.evidence", "writes"),

  edge("e.api_contains_workspaces", "container.api", "module.workspaces", "contains"),
  edge("e.web_contains_picker", "container.web", "module.workspace_picker", "contains"),
  edge("e.workspaces_writes_store", "module.workspaces", "store.workspaces", "writes"),
  edge("e.workspaces_reads_store", "module.workspaces", "store.workspaces", "reads"),
  edge("e.picker_calls_rest", "module.workspace_picker", "api.rest", "depends_on", { description: "GET/POST/PATCH/DELETE /api/workspaces[/:id[/select]]" }),
  edge("e.rest_exposes_workspaces", "module.workspaces", "api.rest", "exposes"),
  edge("e.architect_decides_multi", "stakeholder.architect", "decision.multi_workspace_runtime", "decides"),
  edge("e.multi_addresses_living", "decision.multi_workspace_runtime", "concern.living_architecture", "addresses"),

  edge("e.architect_has_living", "stakeholder.architect", "concern.living_architecture", "has_concern"),
  edge("e.architect_has_ai_safety", "stakeholder.architect", "concern.ai_migration_safety", "has_concern"),
  edge("e.architect_has_local_first", "stakeholder.architect", "concern.local_first", "has_concern"),

  edge("e.graph_decides_living", "decision.graph_is_product", "concern.living_architecture", "addresses"),
  edge("e.repo_decides_local", "decision.repo_files_beat_db", "concern.local_first", "addresses"),
  edge("e.evidence_decides_safety", "decision.evidence_separate_from_intent", "concern.ai_migration_safety", "addresses"),
  edge("e.proposals_decides_safety", "decision.proposals_first_class", "concern.ai_migration_safety", "addresses"),
  edge("e.views_decides_living", "decision.views_own_layouts", "concern.living_architecture", "addresses"),

  edge("e.risk_bundle_to_web", "risk.bundle_size", "container.web", "risks"),
  edge("e.risk_monolith_to_core", "risk.atlas_monolith", "module.atlas_core", "risks"),
  edge("e.risk_port_to_api", "risk.port_collision", "container.api", "risks"),

  edge("e.threat_mermaid_to_web", "threat.mermaid_injection", "container.web", "threatens"),

  edge("e.quality_roundtrip_pack", "quality.pack_roundtrip", "container.pack", "traces_to"),

  edge("e.architect_decides_graph", "stakeholder.architect", "decision.graph_is_product", "decides"),
  edge("e.architect_decides_repo", "stakeholder.architect", "decision.repo_files_beat_db", "decides"),
  edge("e.architect_decides_evidence", "stakeholder.architect", "decision.evidence_separate_from_intent", "decides"),
  edge("e.architect_decides_proposals", "stakeholder.architect", "decision.proposals_first_class", "decides"),
  edge("e.architect_decides_views", "stakeholder.architect", "decision.views_own_layouts", "decides"),

  edge("e.web_contains_workbench", "container.web", "page.workbench", "contains"),
  edge("e.workbench_consumes_api", "page.workbench", "api.rest", "depends_on", { description: "All workbench data round-trips through /api/* via src/lib/api.ts" }),

  edge("e.web_uses_react", "container.web", "tech.react", "depends_on"),
  edge("e.web_uses_vite", "container.web", "tech.vite", "depends_on"),
  edge("e.web_uses_xyflow", "container.web", "tech.xyflow", "depends_on"),
  edge("e.api_uses_express", "container.api", "tech.express", "depends_on"),
  edge("e.sys_uses_ts", "system.atlas", "tech.typescript_strict", "depends_on"),

  edge("e.api_uses_port_env", "container.api", "env.api_port", "depends_on"),
  edge("e.api_uses_workspace_env", "container.api", "env.workspace", "depends_on"),
  edge("e.web_uses_port_env", "container.web", "env.web_port", "depends_on")
];

const flows: AtlasFlow[] = [
  {
    id: "flow.greenfield_design",
    name: "Greenfield design → AI implementation",
    description: "Architect models the intended system, creates a proposal between architecture versions, then hands an AI agent a migration brief.",
    owner: "architecture",
    criticality: "high",
    steps: [
      { id: "s1", label: "Start from blank or generic starter atlas" },
      { id: "s2", label: "Add systems, containers, components, datastores, contracts, risks, decisions", nodeId: "module.atlas_core" },
      { id: "s3", label: "Create a proposal capturing the next architecture change", nodeId: "decision.proposals_first_class" },
      { id: "s4", label: "Generate migration brief via /api/migration-brief", nodeId: "api.rest" },
      { id: "s5", label: "AI agent implements the diff and updates architecture files together", nodeId: "stakeholder.ai_agent" },
      { id: "s6", label: "Architect reviews, validates, resolves conflicts" }
    ],
    failureModes: ["AI silently weakens an invariant", "Proposal acceptance checks are too vague to verify"],
    acceptanceChecks: ["Validation passes after import", "All flows still have linked tests"],
    linkedTests: [],
    notes: ""
  },
  {
    id: "flow.brownfield_import",
    name: "Brownfield import → first atlas",
    description: "Scan an existing repository, promote useful discovered facts into authored nodes, then commit the architecture pack.",
    owner: "architecture",
    criticality: "high",
    steps: [
      { id: "s1", label: "Point System Atlas at the consumer project (SYSTEM_ATLAS_WORKSPACE)", nodeId: "container.api" },
      { id: "s2", label: "Click Scan → /api/scan indexes structure, files, classes, routes, schemas", nodeId: "module.atlas_files" },
      { id: "s3", label: "Review Import Review and promote relevant evidence into authored nodes", nodeId: "module.import_review" },
      { id: "s4", label: "Manually model datastores, contracts, flows, risks, decisions", nodeId: "module.inspector" },
      { id: "s5", label: "Export the pack so the AI agent reads it on the next session", nodeId: "module.atlas_files" }
    ],
    failureModes: ["Scanner mis-classifies a file and adds noise to the atlas", "Architect over-promotes inferred facts without confirming them"],
    acceptanceChecks: ["Inferred nodes carry confidence: inferred until reviewed", "Pack Health reports healthy after Export"],
    linkedTests: ["server/atlasFiles.test.ts"],
    notes: ""
  },
  {
    id: "flow.autosync",
    name: "UI edit → autosync export",
    description: "Edits in the canvas debounce-export the pack and update Pack Health.",
    owner: "architecture",
    criticality: "high",
    steps: [
      { id: "s1", label: "Architect edits a node in the Inspector", nodeId: "module.inspector" },
      { id: "s2", label: "App debounces, calls /api/export with the current baseRevision", nodeId: "api.rest" },
      { id: "s3", label: "exportAtlas writes the changed concept files and regenerates derived files", nodeId: "module.atlas_files" },
      { id: "s4", label: "Pack Health turns healthy; status footer shows synced timestamp" }
    ],
    failureModes: ["External edit happens between debounce and Export → 409 conflict", "Disk write fails mid-export and pack becomes misaligned"],
    acceptanceChecks: ["409 surfaces to the user as 'External changes — reload or force'", "Pack Health flags misalignment within one revision check"],
    linkedTests: [],
    notes: ""
  },
  {
    id: "flow.workspace_switch",
    name: "Add a project → switch workspace",
    description: "A single workbench instance manages many projects. Adding a workspace registers it and makes it current; switching reloads the pack without restart.",
    owner: "architecture",
    criticality: "high",
    steps: [
      { id: "s1", label: "User pastes an absolute project path into the picker (or onboarding card)", nodeId: "module.workspace_picker" },
      { id: "s2", label: "Client POSTs /api/workspaces { path, name? }", nodeId: "api.rest" },
      { id: "s3", label: "workspaces module validates path, dedupes by canonical form, persists atomically", nodeId: "module.workspaces" },
      { id: "s4", label: "Server marks the new workspace current; next /api/project resolves against it" },
      { id: "s5", label: "Client re-fetches project + health and renders the new pack" }
    ],
    failureModes: ["Bad path → 400 path_not_found", "Concurrent writes from two server instances would race the JSON file (single-user assumption holds)"],
    acceptanceChecks: ["After switch, Pack Health and inventory reflect the new project within one render", "Registry survives server restart"],
    linkedTests: ["server/workspaces.test.ts"],
    notes: ""
  },
  {
    id: "flow.external_edit_reconcile",
    name: "External edit reconciliation",
    description: "When architecture files change on disk while the UI has unsaved edits, prompt the architect to reload or force-export.",
    owner: "architecture",
    criticality: "high",
    steps: [
      { id: "s1", label: "API polls architectureRevision()", nodeId: "module.atlas_files" },
      { id: "s2", label: "Web detects the on-disk revision diverged from the loaded one" },
      { id: "s3", label: "User picks Reload (discard UI edits) or Export with force=true" }
    ],
    failureModes: ["User force-exports and loses upstream edits"],
    acceptanceChecks: ["Force path requires explicit confirmation"],
    linkedTests: [],
    notes: ""
  }
];

place("overview", "stakeholder.architect", 80, 80);
place("overview", "stakeholder.ai_agent", 80, 220);
place("overview", "concern.living_architecture", 80, 360);
place("overview", "concern.ai_migration_safety", 80, 480);
place("overview", "concern.local_first", 80, 600);
place("overview", "system.atlas", 420, 80);
place("overview", "container.web", 420, 240);
place("overview", "container.api", 700, 240);
place("overview", "container.pack", 980, 240);

place("containers", "container.web", 80, 100);
place("containers", "container.api", 420, 100);
place("containers", "container.pack", 760, 100);
place("containers", "api.rest", 420, 280);

place("components", "container.web", 60, 60);
place("components", "module.canvas", 60, 220);
place("components", "module.inspector", 300, 220);
place("components", "module.structured_editors", 540, 220);
place("components", "module.import_review", 780, 220);
place("components", "module.code_intel_explorer", 1020, 220);
place("components", "module.workspace_picker", 1260, 220);
place("components", "module.atlas_core", 540, 60);
place("components", "container.api", 60, 420);
place("components", "module.atlas_files", 300, 420);
place("components", "module.workspaces", 540, 420);

place("data", "store.workspaces", 800, 100);

place("api_surface", "api.rest", 320, 120);
place("api_surface", "container.web", 60, 120);
place("api_surface", "container.api", 620, 120);

place("data", "container.api", 60, 100);
place("data", "container.pack", 320, 100);
place("data", "store.evidence", 600, 100);

place("flows", "container.web", 60, 80);
place("flows", "container.api", 320, 80);
place("flows", "module.atlas_files", 580, 80);
place("flows", "api.rest", 320, 220);
place("flows", "module.inspector", 60, 220);
place("flows", "module.import_review", 60, 360);
place("flows", "stakeholder.ai_agent", 580, 360);

place("decisions", "decision.graph_is_product", 60, 80);
place("decisions", "decision.repo_files_beat_db", 360, 80);
place("decisions", "decision.evidence_separate_from_intent", 660, 80);
place("decisions", "decision.proposals_first_class", 60, 240);
place("decisions", "decision.views_own_layouts", 360, 240);
place("decisions", "tech.react", 660, 240);
place("decisions", "tech.vite", 960, 240);
place("decisions", "tech.xyflow", 60, 400);
place("decisions", "tech.express", 360, 400);
place("decisions", "tech.typescript_strict", 660, 400);

place("components", "page.workbench", 60, 420);

place("api_surface", "page.workbench", 60, 280);

place("deployment", "env.api_port", 60, 100);
place("deployment", "env.web_port", 320, 100);
place("deployment", "env.workspace", 580, 100);

place("domain", "tech.react", 60, 80);
place("domain", "tech.vite", 360, 80);
place("domain", "tech.xyflow", 660, 80);
place("domain", "tech.express", 60, 240);
place("domain", "tech.typescript_strict", 360, 240);

place("concerns", "stakeholder.architect", 60, 80);
place("concerns", "stakeholder.ai_agent", 60, 220);
place("concerns", "concern.living_architecture", 360, 80);
place("concerns", "concern.ai_migration_safety", 360, 220);
place("concerns", "concern.local_first", 360, 360);
place("concerns", "decision.graph_is_product", 660, 80);
place("concerns", "decision.proposals_first_class", 660, 220);
place("concerns", "decision.repo_files_beat_db", 660, 360);

place("health", "risk.bundle_size", 60, 80);
place("health", "risk.atlas_monolith", 360, 80);
place("health", "risk.port_collision", 660, 80);
place("health", "quality.pack_roundtrip", 60, 240);
place("health", "container.web", 360, 240);
place("health", "container.api", 660, 240);
place("health", "module.atlas_core", 960, 80);

place("security", "threat.mermaid_injection", 60, 80);
place("security", "container.web", 360, 80);

const views = defaultViews().map((view) => ({
  ...view,
  positions: layoutsByView[view.id] ?? {}
}));

const project: AtlasProject = {
  manifest: {
    schemaVersion: 1,
    name: "System Atlas",
    description: "Local-first architecture workbench. This pack is the dogfooded model of System Atlas itself.",
    owner: "architecture",
    updatedAt: now
  },
  nodes,
  edges,
  flows,
  views,
  proposals: [],
  versions: [],
  evidence: [],
  intelligence: emptyCodeIntelligence()
};

async function main() {
  const result = await exportAtlas(repoRoot, project);
  const errors = result.issues.filter((issue) => issue.severity === "error");
  const warnings = result.issues.filter((issue) => issue.severity === "warning");
  console.log(`Wrote ${result.files.length} files under ${path.join(repoRoot, "architecture")}`);
  console.log(`Validation: ${errors.length} errors, ${warnings.length} warnings`);
  if (errors.length) {
    for (const issue of errors) console.log(`  ERROR ${issue.code}: ${issue.message}${issue.targetId ? ` (${issue.targetId})` : ""}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
