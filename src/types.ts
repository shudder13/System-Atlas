export const NODE_TYPES = [
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
  "flow",
  "risk"
] as const;

export const EDGE_TYPES = [
  "calls",
  "routes_to",
  "emits",
  "consumes",
  "reads",
  "writes",
  "replicates_to",
  "depends_on",
  "owns",
  "implements",
  "tests",
  "risks",
  "mitigates"
] as const;

export const VIEW_IDS = [
  "overview",
  "components",
  "flows",
  "data",
  "health",
  "proposals"
] as const;

export type NodeType = (typeof NODE_TYPES)[number];
export type EdgeType = (typeof EDGE_TYPES)[number];
export type ViewId = (typeof VIEW_IDS)[number];
export type Criticality = "low" | "medium" | "high" | "critical";
export type Confidence = "manual" | "inferred" | "observed" | "stale";

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
}

export interface AtlasEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  description?: string;
  risk?: string;
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
  nodeIds?: string[];
  edgeIds?: string[];
  positions?: Record<string, { x: number; y: number }>;
}

export interface CodeEvidence {
  path: string;
  kind: "directory" | "source" | "test" | "migration" | "config" | "document";
  language?: string;
  linkedNodeIds?: string[];
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
