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
  "stakeholder",
  "concern",
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
  "has_concern",
  "addresses",
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
  "concerns",
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
export type ContextPackScope = "focused" | "standard" | "expanded";

export interface ProjectStructureEntry {
  path: string;
  name: string;
  kind: "directory" | "file";
  parent?: string;
  depth: number;
  language?: string;
  sizeBytes?: number;
  lines?: number;
}

export interface CodeFileSummary {
  path: string;
  kind: CodeEvidence["kind"];
  language?: string;
  lines?: number;
  sizeBytes?: number;
  imports: string[];
  exports: string[];
  routes: string[];
  symbols: string[];
  summary: string;
}

export interface CodeSymbol {
  id: string;
  path: string;
  name: string;
  kind: "class" | "function" | "method" | "interface" | "type" | "constant" | "route";
  line?: number;
  exported?: boolean;
  containerName?: string;
}

export interface CodeClassMember {
  name: string;
  kind: "attribute" | "method";
  visibility?: "public" | "protected" | "private";
  type?: string;
  parameters?: string[];
  returnType?: string;
  line?: number;
}

export interface CodeClass {
  id: string;
  path: string;
  name: string;
  line?: number;
  exported?: boolean;
  extends?: string;
  implements?: string[];
  attributes: CodeClassMember[];
  methods: CodeClassMember[];
}

export interface CodeRoute {
  id: string;
  method: string;
  path: string;
  sourceFile: string;
  line?: number;
}

export interface CodeDependency {
  source: string;
  target: string;
  importPath: string;
  kind: "internal" | "external";
}

export interface CodeTestMapEntry {
  testFile: string;
  targetFiles: string[];
  inferred: boolean;
}

export interface CodeIntelligence {
  generatedAt: string;
  projectStructure: ProjectStructureEntry[];
  files: CodeFileSummary[];
  symbols: CodeSymbol[];
  classes: CodeClass[];
  routes: CodeRoute[];
  dependencies: CodeDependency[];
  testMap: CodeTestMapEntry[];
}

export interface CodeScanResult {
  evidence: CodeEvidence[];
  intelligence: CodeIntelligence;
}

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
  core?: boolean;
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
  classes?: CodeClass[];
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
  status?: "draft" | "applied" | "superseded";
  before: AtlasProjectSnapshot;
  after: AtlasProjectSnapshot;
  forbiddenChanges: string[];
  acceptanceChecks: string[];
  createdAt: string;
  appliedAt?: string;
}

export interface AtlasProjectSnapshot {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  flows: AtlasFlow[];
}

export interface AtlasVersion {
  id: string;
  name: string;
  summary: string;
  snapshot: AtlasProjectSnapshot;
  createdAt: string;
  source?: "manual" | "proposal";
  proposalId?: string;
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
  versions: AtlasVersion[];
  evidence: CodeEvidence[];
  intelligence: CodeIntelligence;
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

export interface PackMetadataSummary {
  exportId?: string;
  generatedAt?: string;
  architectureSourceRevision?: string;
  project?: {
    name?: string;
    updatedAt?: string;
    nodes?: number;
    edges?: number;
    flows?: number;
    views?: number;
    proposals?: number;
    versions?: number;
  };
}

export interface PackHealth {
  status: "missing" | "healthy" | "stale" | "misaligned";
  message: string;
  currentSourceRevision: string;
  generated?: PackMetadataSummary;
  evidence?: PackMetadataSummary;
  issues: string[];
}

export interface SemanticDiff {
  addedNodes: AtlasNode[];
  removedNodes: AtlasNode[];
  changedNodes: Array<{ before: AtlasNode; after: AtlasNode; changes: string[] }>;
  addedEdges: AtlasEdge[];
  removedEdges: AtlasEdge[];
  changedFlows: Array<{ before?: AtlasFlow; after?: AtlasFlow; changes: string[] }>;
}
