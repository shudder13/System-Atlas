export const NODE_TYPES = [
  "system",
  "container",
  "component",
  "code_symbol",
  "actor",
  "app",
  "service",
  "module",
  "worker",
  "scheduler",
  "load_balancer",
  "datastore",
  "replica",
  "queue",
  "cache",
  "external_system",
  "file_group",
  "contract",
  "api_contract",
  "event_contract",
  "deployment_node",
  "environment",
  "region",
  "data_entity",
  "schema",
  "migration",
  "decision",
  "quality_scenario",
  "threat",
  "team",
  "flow",
  "risk"
] as const;

export const EDGE_TYPES = [
  "contains",
  "calls",
  "routes_to",
  "exposes",
  "emits",
  "consumes",
  "publishes",
  "subscribes_to",
  "reads",
  "writes",
  "replicates_to",
  "depends_on",
  "owns",
  "implements",
  "deploys_to",
  "authenticates",
  "authorizes",
  "tests",
  "risks",
  "mitigates",
  "protects",
  "threatens",
  "decides",
  "supersedes",
  "traces_to",
  "models"
] as const;

export const VIEW_IDS = [
  "overview",
  "containers",
  "components",
  "code",
  "flows",
  "deployment",
  "data",
  "domain",
  "security",
  "health",
  "decisions",
  "proposals"
] as const;

export type NodeType = (typeof NODE_TYPES)[number];
export type EdgeType = (typeof EDGE_TYPES)[number];
export type ViewId = (typeof VIEW_IDS)[number];
export type Criticality = "low" | "medium" | "high" | "critical";
export type Confidence = "manual" | "inferred" | "observed" | "stale";
export type ArchitectureLevel = "enterprise" | "system" | "container" | "component" | "code" | "runtime" | "deployment" | "data" | "domain" | "quality";
export type EdgeInteraction = "sync" | "async" | "batch" | "replication" | "human";
export type MetadataValue = string | number | boolean | string[] | undefined;

export const VIEW_FAMILIES: Array<{ id: string; name: string; description: string; views: ViewId[] }> = [
  { id: "c4", name: "C4", description: "System context, containers, components, and code-level structure.", views: ["overview", "containers", "components", "code"] },
  { id: "behavior", name: "Runtime", description: "Scenarios, business flows, dynamic traces, and async behavior.", views: ["flows"] },
  { id: "platform", name: "Platform", description: "Deployment, infrastructure, regions, data stores, and ownership.", views: ["deployment", "data"] },
  { id: "domain", name: "Domain", description: "Bounded contexts, entities, contracts, and domain language.", views: ["domain"] },
  { id: "assurance", name: "Assurance", description: "Security, quality, risks, decisions, validation, and change governance.", views: ["security", "health", "decisions", "proposals"] }
];

export interface AtlasNode {
  id: string;
  type: NodeType;
  name: string;
  owner: string;
  status: "planned" | "active" | "deprecated" | "unknown";
  criticality: Criticality;
  responsibilities: string[];
  dependencies: string[];
  invariants: string[];
  linkedFiles: string[];
  linkedTests: string[];
  risks: string[];
  confidence: Confidence;
  notes?: string;
  position?: { x: number; y: number };
  tags?: string[];
  architectureLevel?: ArchitectureLevel;
  metadata?: Record<string, MetadataValue>;
}

export interface AtlasEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  description?: string;
  risk?: string;
  protocol?: string;
  interaction?: EdgeInteraction;
  auth?: string;
  timeoutMs?: number;
  retry?: string;
  evidence?: string[];
  tags?: string[];
}

export interface AtlasFlowStep {
  id: string;
  label: string;
  nodeId?: string;
}

export interface AtlasFlow {
  id: string;
  name: string;
  description: string;
  owner: string;
  criticality: Criticality;
  steps: AtlasFlowStep[];
  failureModes: string[];
  acceptanceChecks: string[];
  linkedTests: string[];
  notes?: string;
}

export interface AtlasView {
  id: ViewId;
  name: string;
  description: string;
  family?: string;
  concern?: string;
  scope?: string;
  nodeIds?: string[];
  edgeIds?: string[];
  positions?: Record<string, { x: number; y: number }>;
}

export interface CodeEvidence {
  path: string;
  kind: "directory" | "source" | "test" | "migration" | "config" | "document" | "contract" | "class" | "function" | "api";
  language?: string;
  linkedNodeIds?: string[];
  symbols?: Array<{ name: string; kind: "class" | "function" | "method" | "interface" | "type" | "constant" | "route"; line?: number }>;
  imports?: string[];
  exports?: string[];
  routes?: string[];
  lines?: number;
  sizeBytes?: number;
}

export interface AtlasProposal {
  id: string;
  name: string;
  summary: string;
  rationale: string;
  before: AtlasProjectSnapshot;
  after: AtlasProjectSnapshot;
  forbiddenChanges: string[];
  acceptanceChecks: string[];
  createdAt: string;
}

export interface AtlasProjectSnapshot {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  flows: AtlasFlow[];
}

export interface AtlasManifest {
  schemaVersion: number;
  name: string;
  description: string;
  owner: string;
  updatedAt: string;
}

export interface AtlasProject {
  manifest: AtlasManifest;
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  flows: AtlasFlow[];
  views: AtlasView[];
  proposals: AtlasProposal[];
  evidence: CodeEvidence[];
}

export interface AtlasTemplate {
  id: string;
  name: string;
  description: string;
  project: AtlasProject;
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  targetId?: string;
}

export interface SemanticDiff {
  addedNodes: AtlasNode[];
  removedNodes: AtlasNode[];
  changedNodes: Array<{ before: AtlasNode; after: AtlasNode; changes: string[] }>;
  addedEdges: AtlasEdge[];
  removedEdges: AtlasEdge[];
  changedFlows: Array<{ before?: AtlasFlow; after?: AtlasFlow; changes: string[] }>;
}
