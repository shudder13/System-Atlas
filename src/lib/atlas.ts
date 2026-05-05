import {
  AtlasEdge,
  AtlasFlow,
  AtlasNode,
  AtlasProject,
  AtlasProjectSnapshot,
  AtlasProposal,
  AtlasVersion,
  CodeEvidence,
  CodeIntelligence,
  ContextPackScope,
  Criticality,
  EDGE_TYPES,
  EdgeType,
  NodeType,
  SemanticDiff,
  ValidationIssue,
  ViewId
} from "../types";

const componentTypes = new Set<NodeType>([
  "container",
  "component",
  "app",
  "service",
  "module",
  "worker",
  "scheduler",
  "load_balancer",
  "external_system",
  "contract",
  "api_contract",
  "event_contract",
  "file_group"
]);

const overviewTypes = new Set<NodeType>(["actor", "stakeholder", "system", "app", "container", "service", "external_system", "team", "load_balancer"]);
const containerTypes = new Set<NodeType>(["system", "container", "app", "service", "worker", "scheduler", "load_balancer", "external_system", "api_contract", "event_contract"]);
const codeTypes = new Set<NodeType>(["component", "module", "code_symbol", "file_group", "contract", "api_contract", "event_contract"]);
const deploymentTypes = new Set<NodeType>(["environment", "region", "deployment_node", "load_balancer", "service", "worker", "scheduler", "datastore", "replica", "queue", "cache", "external_system"]);
const dataTypes = new Set<NodeType>(["service", "module", "worker", "datastore", "replica", "queue", "cache", "external_system", "contract", "api_contract", "event_contract", "data_entity", "schema", "migration"]);
const domainTypes = new Set<NodeType>(["system", "container", "component", "module", "data_entity", "schema", "api_contract", "event_contract", "decision", "team"]);
const securityTypes = new Set<NodeType>(["actor", "app", "service", "external_system", "api_contract", "event_contract", "datastore", "data_entity", "threat", "risk"]);
const concernTypes = new Set<NodeType>(["stakeholder", "actor", "team", "concern", "quality_scenario", "risk", "threat", "decision", "system", "container", "service", "app", "external_system"]);
const healthTypes = new Set<NodeType>(["quality_scenario", "service", "worker", "scheduler", "load_balancer", "queue", "datastore", "replica", "cache", "external_system", "risk", "threat", "decision"]);
const decisionTypes = new Set<NodeType>(["decision", "quality_scenario", "risk", "threat", "system", "container", "service", "component", "module"]);
const flowTypes = new Set<NodeType>(["actor", "app", "load_balancer", "service", "container", "component", "module", "contract", "api_contract", "event_contract", "queue", "worker", "scheduler", "datastore", "external_system", "flow"]);

const viewEdgeTypes: Partial<Record<ViewId, Set<EdgeType>>> = {
  overview: new Set(["contains", "calls", "routes_to", "depends_on", "owns", "has_concern", "addresses"]),
  containers: new Set(["contains", "calls", "routes_to", "exposes", "publishes", "subscribes_to", "depends_on", "deploys_to"]),
  components: new Set(["contains", "calls", "depends_on", "implements", "routes_to", "exposes", "models"]),
  code: new Set(["contains", "implements", "tests", "depends_on", "traces_to", "models"]),
  flows: new Set(["calls", "routes_to", "emits", "consumes", "publishes", "subscribes_to", "reads", "writes", "tests", "authenticates", "authorizes"]),
  deployment: new Set(["contains", "deploys_to", "routes_to", "replicates_to", "depends_on", "calls"]),
  data: new Set(["reads", "writes", "owns", "replicates_to", "emits", "consumes", "publishes", "subscribes_to", "models"]),
  domain: new Set(["contains", "owns", "models", "publishes", "subscribes_to", "implements", "decides"]),
  security: new Set(["authenticates", "authorizes", "protects", "threatens", "mitigates", "risks", "calls", "reads", "writes"]),
  concerns: new Set(["has_concern", "addresses", "owns", "risks", "mitigates", "protects", "decides", "traces_to", "depends_on"]),
  health: new Set(["risks", "mitigates", "tests", "depends_on", "calls", "protects", "threatens", "decides"]),
  decisions: new Set(["decides", "supersedes", "mitigates", "risks", "traces_to", "depends_on"]),
  proposals: new Set(EDGE_TYPES)
};

const contextPackBudgets: Record<ContextPackScope, { seedCount: number; maxNodes: number; maxEdges: number; maxEvidence: number; maxFlows: number; maxFiles: number; maxTests: number }> = {
  focused: { seedCount: 4, maxNodes: 12, maxEdges: 20, maxEvidence: 10, maxFlows: 3, maxFiles: 16, maxTests: 12 },
  standard: { seedCount: 8, maxNodes: 28, maxEdges: 48, maxEvidence: 25, maxFlows: 6, maxFiles: 36, maxTests: 24 },
  expanded: { seedCount: 18, maxNodes: 80, maxEdges: 140, maxEvidence: 60, maxFlows: 14, maxFiles: 100, maxTests: 60 }
};

export const CONTEXT_PACK_SCOPES: ContextPackScope[] = ["focused", "standard", "expanded"];

export function emptyCodeIntelligence(): CodeIntelligence {
  return {
    generatedAt: "",
    projectStructure: [],
    files: [],
    symbols: [],
    classes: [],
    routes: [],
    dependencies: [],
    testMap: []
  };
}

const viewLaneRules: Partial<Record<ViewId, Array<{ lane: number; types: readonly NodeType[] }>>> = {
  overview: [
    lane(0, ["stakeholder", "actor"]),
    lane(1, ["system", "team", "concern"]),
    lane(2, ["app", "container"]),
    lane(3, ["load_balancer", "service"])
  ],
  containers: [
    lane(0, ["system", "actor", "team"]),
    lane(1, ["app", "container", "load_balancer"]),
    lane(2, ["service", "worker", "scheduler"]),
    lane(3, ["api_contract", "event_contract"])
  ],
  components: [
    lane(0, ["file_group"]),
    lane(1, ["container", "app", "load_balancer"]),
    lane(2, ["service", "worker", "scheduler", "external_system"]),
    lane(3, ["module", "component"]),
    lane(4, ["contract", "api_contract", "event_contract"])
  ],
  code: [
    lane(0, ["file_group"]),
    lane(1, ["module", "component"]),
    lane(2, ["code_symbol"]),
    lane(3, ["contract", "api_contract", "event_contract"])
  ],
  flows: [
    lane(0, ["actor", "app"]),
    lane(1, ["container", "load_balancer", "service"]),
    lane(2, ["component", "module", "contract", "api_contract", "event_contract"]),
    lane(3, ["queue", "worker", "scheduler"])
  ],
  deployment: [
    lane(0, ["environment"]),
    lane(1, ["region"]),
    lane(2, ["deployment_node"]),
    lane(3, ["load_balancer", "service", "worker", "scheduler"]),
    lane(4, ["queue", "cache", "datastore", "replica"])
  ],
  data: [
    lane(0, ["service", "module", "worker", "external_system", "contract"]),
    lane(1, ["queue", "cache"]),
    lane(2, ["data_entity", "schema"]),
    lane(3, ["datastore"]),
    lane(4, ["replica"]),
    lane(5, ["migration"])
  ],
  domain: [
    lane(0, ["team", "system"]),
    lane(1, ["container", "component", "module"]),
    lane(2, ["data_entity", "schema"]),
    lane(3, ["api_contract", "event_contract"]),
    lane(4, ["decision"])
  ],
  security: [
    lane(0, ["actor", "threat"]),
    lane(1, ["app", "service", "external_system"]),
    lane(2, ["api_contract", "event_contract"]),
    lane(3, ["datastore", "data_entity"]),
    lane(4, ["risk"])
  ],
  concerns: [
    lane(0, ["stakeholder", "actor", "team"]),
    lane(1, ["concern", "quality_scenario"]),
    lane(2, ["system", "container", "app", "service", "external_system"]),
    lane(3, ["risk", "threat"]),
    lane(4, ["decision"])
  ],
  health: [
    lane(0, ["concern", "risk", "threat", "quality_scenario"]),
    lane(1, ["external_system", "load_balancer", "queue", "cache"]),
    lane(2, ["service", "worker", "scheduler"]),
    lane(3, ["datastore", "replica"])
  ],
  decisions: [
    lane(0, ["decision"]),
    lane(1, ["concern", "quality_scenario", "risk", "threat"]),
    lane(2, ["system", "container", "service"]),
    lane(3, ["component", "module"])
  ]
};

const viewLaneFallbacks: Partial<Record<ViewId, number>> = {
  overview: 4,
  containers: 3,
  components: 5,
  code: 4,
  flows: 4,
  deployment: 5,
  data: 6,
  domain: 4,
  security: 5,
  concerns: 5,
  health: 4,
  decisions: 4
};

export type MetadataFieldDefinition = {
  key: string;
  label: string;
  kind: "text" | "number" | "boolean" | "list";
  description: string;
};

const sharedMetadataFields: MetadataFieldDefinition[] = [
  { key: "runtimeName", label: "Runtime name", kind: "text", description: "Production/runtime identifier when it differs from the architecture name." },
  { key: "observability", label: "Observability", kind: "list", description: "Dashboards, logs, traces, alerts, or monitors for this concept." }
];

const metadataProfiles: Partial<Record<NodeType, MetadataFieldDefinition[]>> = {
  system: [
    { key: "businessOwner", label: "Business owner", kind: "text", description: "Business accountable owner for the system." },
    { key: "sla", label: "SLA/SLO", kind: "text", description: "Availability or latency target that constrains architecture changes." }
  ],
  app: runtimeMetadataFields(),
  container: runtimeMetadataFields(),
  service: runtimeMetadataFields(),
  worker: runtimeMetadataFields(),
  scheduler: runtimeMetadataFields(),
  load_balancer: [
    { key: "protocol", label: "Protocol", kind: "text", description: "Primary routing protocol, such as HTTP, TCP, or gRPC." },
    { key: "rateLimit", label: "Rate limit", kind: "text", description: "Traffic shaping or request limit policy." },
    { key: "failoverPolicy", label: "Failover policy", kind: "text", description: "How traffic moves during service or zone failure." }
  ],
  datastore: dataMetadataFields(),
  replica: dataMetadataFields(),
  schema: dataMetadataFields(),
  data_entity: dataMetadataFields(),
  queue: asyncMetadataFields(),
  cache: [
    { key: "ttl", label: "TTL", kind: "text", description: "Cache expiration policy." },
    { key: "consistency", label: "Consistency", kind: "text", description: "Consistency expectation and invalidation approach." },
    { key: "containsPii", label: "Contains PII", kind: "boolean", description: "Whether cached data includes personal or sensitive data." }
  ],
  external_system: contractMetadataFields(),
  api_contract: contractMetadataFields(),
  event_contract: [
    { key: "version", label: "Version", kind: "text", description: "Contract or event schema version." },
    { key: "deliveryGuarantee", label: "Delivery guarantee", kind: "text", description: "At-most-once, at-least-once, exactly-once, or best-effort semantics." },
    { key: "ordering", label: "Ordering", kind: "text", description: "Ordering guarantee and partitioning key, if relevant." }
  ],
  environment: deploymentMetadataFields(),
  region: deploymentMetadataFields(),
  deployment_node: deploymentMetadataFields(),
  risk: assuranceMetadataFields(),
  threat: assuranceMetadataFields(),
  stakeholder: [
    { key: "role", label: "Role", kind: "text", description: "Stakeholder role or persona." },
    { key: "influence", label: "Influence", kind: "text", description: "Decision influence, accountability, or interest level." },
    { key: "successCriteria", label: "Success criteria", kind: "list", description: "Outcomes this stakeholder expects from the system." },
    { key: "contact", label: "Contact", kind: "text", description: "Person, group, channel, or team contact." }
  ],
  concern: [
    { key: "category", label: "Category", kind: "text", description: "Functional, reliability, security, compliance, cost, usability, operability, or delivery concern." },
    { key: "sourceStakeholder", label: "Source stakeholder", kind: "text", description: "Stakeholder or team that owns or raised this concern." },
    { key: "priority", label: "Priority", kind: "text", description: "Priority, severity, or decision weight." },
    { key: "acceptanceCriteria", label: "Acceptance criteria", kind: "list", description: "Evidence that the concern has been addressed." }
  ],
  quality_scenario: assuranceMetadataFields(),
  decision: [
    { key: "adrStatus", label: "ADR status", kind: "text", description: "Proposed, accepted, superseded, or deprecated." },
    { key: "decisionDate", label: "Decision date", kind: "text", description: "Date the decision was made or reviewed." },
    { key: "supersedes", label: "Supersedes", kind: "list", description: "Earlier decision ids this decision replaces." }
  ],
  team: [
    { key: "contact", label: "Contact", kind: "text", description: "Team channel, alias, or ownership contact." },
    { key: "responsibilityBoundary", label: "Boundary", kind: "text", description: "Short description of what this team owns." }
  ]
};

export const VIEW_FAMILIES: Array<{ id: string; name: string; description: string; views: ViewId[] }> = [
  { id: "c4", name: "C4", description: "System context, containers, components, and code-level structure.", views: ["overview", "containers", "components", "code"] },
  { id: "behavior", name: "Runtime", description: "Scenarios, business flows, dynamic traces, and async behavior.", views: ["flows"] },
  { id: "platform", name: "Platform", description: "Deployment, infrastructure, regions, data stores, and ownership.", views: ["deployment", "data"] },
  { id: "domain", name: "Domain", description: "Bounded contexts, entities, contracts, and domain language.", views: ["domain"] },
  { id: "assurance", name: "Assurance", description: "Stakeholders, concerns, security, quality, risks, decisions, validation, and change governance.", views: ["security", "concerns", "health", "decisions", "proposals"] }
];

export function metadataFieldsForNode(type: NodeType): MetadataFieldDefinition[] {
  const fields = [...sharedMetadataFields, ...(metadataProfiles[type] ?? [])];
  const seen = new Set<string>();
  return fields.filter((field) => {
    if (seen.has(field.key)) return false;
    seen.add(field.key);
    return true;
  });
}

function runtimeMetadataFields(): MetadataFieldDefinition[] {
  return [
    { key: "sla", label: "SLA/SLO", kind: "text", description: "Availability, latency, or throughput target." },
    { key: "rto", label: "RTO", kind: "text", description: "Maximum acceptable recovery time." },
    { key: "rpo", label: "RPO", kind: "text", description: "Maximum acceptable data loss window." },
    { key: "scaling", label: "Scaling", kind: "text", description: "Replica, autoscaling, concurrency, or capacity rule." }
  ];
}

function dataMetadataFields(): MetadataFieldDefinition[] {
  return [
    { key: "dataOwner", label: "Data owner", kind: "text", description: "Team or service accountable for this data." },
    { key: "retention", label: "Retention", kind: "text", description: "Retention and deletion policy." },
    { key: "consistency", label: "Consistency", kind: "text", description: "Consistency model and stale-read expectations." },
    { key: "backupPolicy", label: "Backup policy", kind: "text", description: "Backup, restore, and verification policy." },
    { key: "rto", label: "RTO", kind: "text", description: "Maximum acceptable recovery time." },
    { key: "rpo", label: "RPO", kind: "text", description: "Maximum acceptable data loss window." },
    { key: "containsPii", label: "Contains PII", kind: "boolean", description: "Whether this data includes personal or sensitive data." }
  ];
}

function asyncMetadataFields(): MetadataFieldDefinition[] {
  return [
    { key: "deliveryGuarantee", label: "Delivery guarantee", kind: "text", description: "At-most-once, at-least-once, exactly-once, or best-effort semantics." },
    { key: "retention", label: "Retention", kind: "text", description: "Message retention period and dead-letter policy." },
    { key: "ordering", label: "Ordering", kind: "text", description: "Ordering guarantee and partitioning key, if relevant." }
  ];
}

function contractMetadataFields(): MetadataFieldDefinition[] {
  return [
    { key: "provider", label: "Provider", kind: "text", description: "External provider or owning service/team." },
    { key: "version", label: "Version", kind: "text", description: "API, contract, or dependency version." },
    { key: "auth", label: "Auth", kind: "text", description: "Authentication and authorization mechanism." },
    { key: "rateLimit", label: "Rate limit", kind: "text", description: "Quota, throttling, or burst policy." },
    { key: "sla", label: "SLA/SLO", kind: "text", description: "Availability or response-time commitment." }
  ];
}

function deploymentMetadataFields(): MetadataFieldDefinition[] {
  return [
    { key: "cloud", label: "Cloud/platform", kind: "text", description: "Cloud, platform, or hosting provider." },
    { key: "region", label: "Region", kind: "text", description: "Region, zone, or locality." },
    { key: "instanceClass", label: "Instance class", kind: "text", description: "Compute, storage, or node class." },
    { key: "scaling", label: "Scaling", kind: "text", description: "Scaling and capacity rule." }
  ];
}

function assuranceMetadataFields(): MetadataFieldDefinition[] {
  return [
    { key: "impact", label: "Impact", kind: "text", description: "Expected user, business, security, or reliability impact." },
    { key: "likelihood", label: "Likelihood", kind: "text", description: "Likelihood or frequency estimate." },
    { key: "mitigationOwner", label: "Mitigation owner", kind: "text", description: "Team or person accountable for mitigation." },
    { key: "reviewCadence", label: "Review cadence", kind: "text", description: "How often this item should be reviewed." }
  ];
}

export function cloneProjectSnapshot(project: AtlasProject): AtlasProjectSnapshot {
  return {
    nodes: structuredClone(project.nodes),
    edges: structuredClone(project.edges),
    flows: structuredClone(project.flows)
  };
}

export function projectFromSnapshot(project: AtlasProject, snapshot: AtlasProjectSnapshot): AtlasProject {
  return {
    ...project,
    nodes: structuredClone(snapshot.nodes),
    edges: structuredClone(snapshot.edges),
    flows: structuredClone(snapshot.flows)
  };
}

export function proposalWorkspace(project: AtlasProject, proposalId?: string): AtlasProject {
  const proposal = project.proposals.find((item) => item.id === proposalId);
  return proposal ? projectFromSnapshot(project, proposal.after) : project;
}

export function commitWorkspaceEdit(project: AtlasProject, editedWorkspace: AtlasProject, proposalId?: string, updatedAt = nowIso()): AtlasProject {
  if (!proposalId) {
    return {
      ...editedWorkspace,
      manifest: { ...editedWorkspace.manifest, updatedAt }
    };
  }

  const rootProject = {
    ...project,
    manifest: { ...project.manifest, updatedAt },
    views: editedWorkspace.views,
    evidence: editedWorkspace.evidence,
    intelligence: editedWorkspace.intelligence
  };

  return updateProposalAfter(rootProject, proposalId, editedWorkspace);
}

export function nowIso() {
  return new Date().toISOString();
}

export function createEmptyProject(name = "Untitled System"): AtlasProject {
  return {
    manifest: {
      schemaVersion: 1,
      name,
      description: "A system atlas for architecture design, evidence, risk, and AI migration planning.",
      owner: "architecture",
      updatedAt: nowIso()
    },
    nodes: [],
    edges: [],
    flows: [],
    views: defaultViews(),
    proposals: [],
    versions: [],
    evidence: [],
    intelligence: emptyCodeIntelligence()
  };
}

export function defaultViews() {
  return [
    { id: "overview" as const, name: "Context", family: "c4", concern: "System boundary", scope: "system", core: true, description: "C4-style system boundary, actors, client surfaces, owned systems, teams, and external dependencies." },
    { id: "containers" as const, name: "Containers", family: "c4", concern: "Runtime building blocks", scope: "container", core: true, description: "Apps, services, workers, schedulers, load balancers, contracts, and external dependencies." },
    { id: "components" as const, name: "Components", family: "c4", concern: "Internal building blocks", scope: "component", core: true, description: "Services, modules, components, contracts, and their implementation relationships." },
    { id: "code" as const, name: "Code", family: "c4", concern: "Source structure", scope: "code", core: false, description: "Files, packages, code symbols, contracts, linked tests, and implementation evidence." },
    { id: "flows" as const, name: "Flows", family: "behavior", concern: "Runtime behavior", scope: "scenario", core: true, description: "Critical user and system journeys, traces, failure modes, and acceptance checks." },
    { id: "deployment" as const, name: "Deployment", family: "platform", concern: "Physical/runtime topology", scope: "environment", core: true, description: "Environments, regions, deployment nodes, replicas, routing, and operational topology." },
    { id: "data" as const, name: "Data", family: "platform", concern: "Data ownership", scope: "data", core: true, description: "Entities, schemas, stores, queues, caches, ownership, read/write paths, replicas, and retention-sensitive paths." },
    { id: "domain" as const, name: "Domain", family: "domain", concern: "Domain model", scope: "bounded-context", core: false, description: "Bounded contexts, domain entities, contracts, events, teams, and model ownership." },
    { id: "security" as const, name: "Security", family: "assurance", concern: "Trust and threats", scope: "trust-boundary", core: false, description: "Trust boundaries, authentication, authorization, threats, mitigations, sensitive data, and controls." },
    { id: "concerns" as const, name: "Concerns", family: "assurance", concern: "Stakeholder concerns", scope: "architecture-description", core: true, description: "Stakeholders, concerns, quality drivers, risks, decisions, and the architecture elements that address them." },
    { id: "health" as const, name: "Health", family: "assurance", concern: "Quality and reliability", scope: "quality", core: true, description: "Risks, quality scenarios, reliability concerns, stale architecture, regression exposure, and test gaps." },
    { id: "decisions" as const, name: "Decisions", family: "assurance", concern: "Architecture rationale", scope: "governance", core: false, description: "ADRs, superseded decisions, tradeoffs, quality scenarios, risks, and rationale links." },
    { id: "proposals" as const, name: "Proposals", family: "assurance", concern: "Change planning", scope: "proposal", core: true, description: "Architecture change proposals, before/after impact, migration briefs, and acceptance checks." }
  ];
}

export function createNode(type: NodeType, index: number): AtlasNode {
  const id = `${type}.${cryptoSafeId()}`;
  return {
    id,
    type,
    name: titleCase(type),
    owner: "architecture",
    status: "active",
    criticality: ["risk", "concern"].includes(type) ? "high" : "medium",
    responsibilities: [],
    dependencies: [],
    invariants: [],
    linkedFiles: [],
    linkedTests: [],
    risks: [],
    confidence: "manual",
    notes: "",
    architectureLevel: levelForNodeType(type),
    metadata: {},
    position: { x: 160 + (index % 4) * 230, y: 100 + Math.floor(index / 4) * 150 }
  };
}

export function createFlow(index: number): AtlasFlow {
  const id = `flow.${cryptoSafeId()}`;
  return {
    id,
    name: `Architecture Flow ${index + 1}`,
    description: "Describe the user or system action this flow traces.",
    owner: "architecture",
    criticality: "medium",
    steps: [],
    failureModes: [],
    acceptanceChecks: [],
    linkedTests: [],
    notes: ""
  };
}

export function createProposal(project: AtlasProject, name = "Architecture change"): AtlasProposal {
  const snapshot = cloneProjectSnapshot(project);
  return {
    id: `proposal.${cryptoSafeId()}`,
    name,
    summary: "Describe the intended architecture upgrade.",
    rationale: "Explain why the system should move from the current architecture to the proposed design.",
    status: "draft",
    before: snapshot,
    after: structuredClone(snapshot),
    forbiddenChanges: ["Do not weaken existing invariants without explicit architecture approval."],
    acceptanceChecks: ["All affected flows retain acceptance coverage.", "Architecture export and validation pass."],
    createdAt: nowIso()
  };
}

export function createVersion(project: AtlasProject, name = `Architecture checkpoint ${project.versions.length + 1}`, summary = "Manual architecture checkpoint."): AtlasVersion {
  return {
    id: `version.${cryptoSafeId()}`,
    name,
    summary,
    snapshot: cloneProjectSnapshot(project),
    createdAt: nowIso(),
    source: "manual"
  };
}

export function restoreVersion(project: AtlasProject, versionId: string): AtlasProject {
  const version = project.versions.find((item) => item.id === versionId);
  if (!version) return project;

  return {
    ...projectFromSnapshot(project, version.snapshot),
    manifest: { ...project.manifest, updatedAt: nowIso() },
    versions: project.versions
  };
}

export function viewSupportsNodeType(viewId: ViewId, type: NodeType) {
  if (viewId === "proposals") return true;
  if (viewId === "overview") return overviewTypes.has(type);
  if (viewId === "containers") return containerTypes.has(type);
  if (viewId === "components") return componentTypes.has(type);
  if (viewId === "code") return codeTypes.has(type);
  if (viewId === "flows") return flowTypes.has(type);
  if (viewId === "deployment") return deploymentTypes.has(type);
  if (viewId === "data") return dataTypes.has(type);
  if (viewId === "domain") return domainTypes.has(type);
  if (viewId === "security") return securityTypes.has(type);
  if (viewId === "concerns") return concernTypes.has(type);
  if (viewId === "health") return healthTypes.has(type);
  if (viewId === "decisions") return decisionTypes.has(type);
  return true;
}

export function preferredViewForNodeType(type: NodeType): ViewId {
  if (["environment", "region", "deployment_node"].includes(type)) return "deployment";
  if (["datastore", "replica", "queue", "cache", "data_entity", "schema", "migration"].includes(type)) return "data";
  if (["threat"].includes(type)) return "security";
  if (["stakeholder", "concern"].includes(type)) return "concerns";
  if (["risk", "quality_scenario"].includes(type)) return "health";
  if (["decision"].includes(type)) return "decisions";
  if (["flow"].includes(type)) return "flows";
  if (["code_symbol", "file_group"].includes(type)) return "code";
  if (["module", "component", "contract", "api_contract", "event_contract"].includes(type)) return "components";
  if (["worker", "scheduler", "container"].includes(type)) return "containers";
  return "overview";
}

export function validateAtlas(project: AtlasProject): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(project.nodes.map((node) => node.id));
  const edgeIds = new Set<string>();

  for (const node of project.nodes) {
    if (!node.owner.trim()) {
      issues.push({ severity: "error", code: "missing-owner", message: `${node.name} has no owner.`, targetId: node.id });
    }

    if (node.responsibilities.length === 0 && !["risk", "flow", "file_group"].includes(node.type)) {
      issues.push({
        severity: "warning",
        code: "missing-responsibility",
        message: `${node.name} has no responsibilities recorded.`,
        targetId: node.id
      });
    }

    if (node.type === "external_system" && node.risks.length === 0) {
      issues.push({
        severity: "warning",
        code: "external-system-risk",
        message: `${node.name} is an external system with no failure or dependency risk recorded.`,
        targetId: node.id
      });
    }

    if (["datastore", "replica", "queue", "cache", "data_entity", "schema"].includes(node.type) && node.invariants.length === 0) {
      issues.push({
        severity: "info",
        code: "data-node-invariant",
        message: `${node.name} has no data ownership, retention, or consistency invariant.`,
        targetId: node.id
      });
    }

    if (["api_contract", "event_contract", "contract"].includes(node.type) && node.linkedTests.length === 0) {
      issues.push({
        severity: "info",
        code: "contract-without-tests",
        message: `${node.name} is a contract with no linked tests.`,
        targetId: node.id
      });
    }

    if (node.type === "threat" && node.risks.length === 0) {
      issues.push({
        severity: "warning",
        code: "threat-without-risk",
        message: `${node.name} is a threat with no risk or impact recorded.`,
        targetId: node.id
      });
    }

    if (node.type === "decision" && !(node.notes ?? "").trim()) {
      issues.push({
        severity: "info",
        code: "decision-without-rationale",
        message: `${node.name} has no decision rationale notes.`,
        targetId: node.id
      });
    }

    if (node.criticality === "critical" && node.linkedTests.length === 0) {
      issues.push({
        severity: "warning",
        code: "critical-without-tests",
        message: `${node.name} is critical but has no linked tests.`,
        targetId: node.id
      });
    }
  }

  for (const edge of project.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({ severity: "error", code: "duplicate-edge", message: `Duplicate edge id ${edge.id}.`, targetId: edge.id });
    }
    edgeIds.add(edge.id);

    if (!EDGE_TYPES.includes(edge.type)) {
      issues.push({ severity: "error", code: "invalid-edge-type", message: `Invalid edge type on ${edge.id}.`, targetId: edge.id });
    }
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({ severity: "error", code: "dangling-edge", message: `${edge.id} points at a missing node.`, targetId: edge.id });
    }
    if (!edge.label && ["risks", "mitigates", "tests"].includes(edge.type)) {
      issues.push({ severity: "info", code: "edge-needs-label", message: `${edge.type} edge ${edge.id} should describe what it means.`, targetId: edge.id });
    }
  }

  const datastoreIds = new Set(project.nodes.filter((node) => ["datastore", "replica", "schema", "data_entity"].includes(node.type)).map((node) => node.id));
  for (const nodeId of datastoreIds) {
    const ownerWriteEdges = project.edges.filter((edge) => edge.target === nodeId && ["writes", "owns"].includes(edge.type));
    if (ownerWriteEdges.length === 0) {
      issues.push({ severity: "warning", code: "datastore-without-owner", message: `${nodeId} has no writer or owner edge.`, targetId: nodeId });
    }
  }

  for (const flow of project.flows) {
    if (flow.failureModes.length === 0) {
      issues.push({ severity: "warning", code: "flow-without-failure-mode", message: `${flow.name} has no failure modes.`, targetId: flow.id });
    }
    if (flow.acceptanceChecks.length === 0) {
      issues.push({ severity: "warning", code: "flow-without-acceptance", message: `${flow.name} has no acceptance checks.`, targetId: flow.id });
    }
    for (const step of flow.steps) {
      if (step.nodeId && !nodeIds.has(step.nodeId)) {
        issues.push({ severity: "error", code: "flow-step-missing-node", message: `${flow.name} references missing node ${step.nodeId}.`, targetId: flow.id });
      }
    }
  }

  for (const proposal of project.proposals) {
    if (proposal.acceptanceChecks.length === 0) {
      issues.push({ severity: "warning", code: "proposal-without-acceptance", message: `${proposal.name} has no acceptance checks.`, targetId: proposal.id });
    }
    if (!proposal.rationale.trim()) {
      issues.push({ severity: "warning", code: "proposal-without-rationale", message: `${proposal.name} has no rationale.`, targetId: proposal.id });
    }
  }

  return issues;
}

export function filterProjectForView(project: AtlasProject, viewId: ViewId): AtlasProjectSnapshot {
  if (viewId === "proposals") {
    return cloneProjectSnapshot(project);
  }

  const nodePredicate = (node: AtlasNode) => {
    if (viewId === "overview") return overviewTypes.has(node.type);
    if (viewId === "containers") return containerTypes.has(node.type);
    if (viewId === "components") return componentTypes.has(node.type);
    if (viewId === "code") return codeTypes.has(node.type);
    if (viewId === "deployment") return deploymentTypes.has(node.type);
    if (viewId === "data") return dataTypes.has(node.type);
    if (viewId === "domain") return domainTypes.has(node.type);
    if (viewId === "security") return securityTypes.has(node.type) || node.risks.length > 0;
    if (viewId === "concerns") return concernTypes.has(node.type) || node.risks.length > 0 || node.invariants.length > 0;
    if (viewId === "health") return healthTypes.has(node.type) || node.risks.length > 0 || node.invariants.length > 0 || isHighRisk(node) || node.confidence === "stale";
    if (viewId === "decisions") return decisionTypes.has(node.type);
    if (viewId === "flows") return flowTypes.has(node.type) || node.criticality === "critical" || node.linkedTests.length > 0 || project.flows.some((flow) => flow.steps.some((step) => step.nodeId === node.id));
    return true;
  };

  const nodes = project.nodes.filter(nodePredicate);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const allowedEdges = viewEdgeTypes[viewId];
  const edges = project.edges.filter((edge) =>
    nodeIds.has(edge.source) &&
    nodeIds.has(edge.target) &&
    (!allowedEdges || allowedEdges.has(edge.type))
  );

  return { nodes, edges, flows: project.flows };
}

export function layoutProjectForView(project: AtlasProject, viewId: ViewId): AtlasProjectSnapshot {
  const snapshot = filterProjectForView(project, viewId);
  const viewPositions = project.views.find((view) => view.id === viewId)?.positions ?? {};
  const automaticPositions = defaultPositionsForView(snapshot.nodes, viewId, project);

  return {
    ...snapshot,
    nodes: snapshot.nodes.map((node) => ({
      ...node,
      position: viewPositions[node.id] ?? automaticPositions.get(node.id) ?? node.position
    }))
  };
}

export function generateMermaid(project: AtlasProject, viewId: ViewId = "overview"): string {
  const graph = filterProjectForView(project, viewId);
  const lines = ["flowchart LR"];

  for (const node of graph.nodes) {
    lines.push(`  ${mermaidId(node.id)}["${escapeMermaid(`${node.name}\\n${node.type}`)}"]`);
  }

  for (const edge of graph.edges) {
    const label = edge.label || edge.type;
    lines.push(`  ${mermaidId(edge.source)} -->|"${escapeMermaid(label)}"| ${mermaidId(edge.target)}`);
  }

  return lines.join("\n");
}

export function generateOverview(project: AtlasProject): string {
  const byType = groupBy(project.nodes, (node) => node.type);
  const critical = project.nodes.filter((node) => ["critical", "high"].includes(node.criticality));
  const issues = validateAtlas(project);

  return [
    `# ${project.manifest.name}`,
    "",
    project.manifest.description,
    "",
    "## System Shape",
    "",
    ...Object.entries(byType).map(([type, nodes]) => `- ${titleCase(type)}: ${nodes.length}`),
    "",
    "## Critical Areas",
    "",
    ...(critical.length ? critical.map((node) => `- ${node.name} (${node.type}, ${node.criticality})`) : ["- None marked yet."]),
    "",
    "## Flows",
    "",
    ...(project.flows.length
      ? project.flows.map((flow) => `- ${flow.name}: ${flow.description || "No description yet."}`)
      : ["- No flows recorded yet."]),
    "",
    "## Validation",
    "",
    ...(issues.length
      ? issues.map((issue) => `- [${issue.severity}] ${issue.message}`)
      : ["- No validation issues found."]),
    "",
    "## AI Notes",
    "",
    "Use this atlas as the architecture source of truth. Before implementing a change, inspect affected nodes, flows, invariants, risks, linked files, and proposal diffs."
  ].join("\n");
}

export function generateArchitectureReview(project: AtlasProject): string {
  const nodesByType = groupBy(project.nodes, (node) => node.type);
  const edgeTypes = new Set(project.edges.map((edge) => edge.type));
  const highImpactNodes = project.nodes.filter((node) => ["critical", "high"].includes(node.criticality));
  const nodesWithoutInvariants = highImpactNodes.filter((node) => node.invariants.length === 0);
  const nodesWithoutTests = highImpactNodes.filter((node) => node.linkedTests.length === 0);
  const nodesWithoutFiles = highImpactNodes.filter((node) => node.linkedFiles.length === 0);
  const flowsWithoutTests = project.flows.filter((flow) => flow.linkedTests.length === 0);
  const flowsWithoutFailureModes = project.flows.filter((flow) => flow.failureModes.length === 0);
  const staleNodes = project.nodes.filter((node) => node.confidence === "stale");
  const inferredNodes = project.nodes.filter((node) => node.confidence === "inferred");
  const hasCodeEvidence = project.evidence.length > 0 || project.intelligence.files.length > 0;
  const hasDeployment = hasAny(nodesByType, ["environment", "region", "deployment_node"]);
  const hasDataModel = hasAny(nodesByType, ["datastore", "schema", "data_entity"]);
  const hasSecurityModel = hasAny(nodesByType, ["threat"]) || edgeTypes.has("authenticates") || edgeTypes.has("authorizes") || edgeTypes.has("protects");
  const hasQualityModel = hasAny(nodesByType, ["quality_scenario"]) || project.nodes.some((node) => node.invariants.length > 0);
  const hasConcernModel = hasAny(nodesByType, ["concern"]) && (edgeTypes.has("has_concern") || edgeTypes.has("addresses"));
  const hasStakeholderModel = hasAny(nodesByType, ["stakeholder", "actor", "team"]);
  const hasDecisionModel = hasAny(nodesByType, ["decision"]);
  const hasRuntimeModel = project.flows.length > 0;

  const checks: Array<{ label: string; status: "ok" | "warn" | "missing"; detail: string }> = [
    {
      label: "C4 context",
      status: hasAny(nodesByType, ["actor"]) && hasAny(nodesByType, ["system", "container", "app", "service"]) ? "ok" : "missing",
      detail: "Shows who uses the system and what major system boundary they interact with."
    },
    {
      label: "C4 containers",
      status: hasAny(nodesByType, ["container", "app", "service", "worker", "scheduler"]) ? "ok" : "missing",
      detail: "Shows deployable or runtime building blocks and their responsibilities."
    },
    {
      label: "Components and code",
      status: hasAny(nodesByType, ["component", "module", "code_symbol", "file_group"]) || hasCodeEvidence ? "ok" : "warn",
      detail: "Connects high-level design to code-level implementation evidence."
    },
    {
      label: "Runtime scenarios",
      status: hasRuntimeModel ? "ok" : "missing",
      detail: "Important flows or use cases explain dynamic behavior and failure paths."
    },
    {
      label: "Deployment view",
      status: hasDeployment ? "ok" : "warn",
      detail: "Environments, regions, deployment nodes, and infrastructure mappings."
    },
    {
      label: "Data view",
      status: hasDataModel && (edgeTypes.has("reads") || edgeTypes.has("writes") || edgeTypes.has("owns")) ? "ok" : "warn",
      detail: "Datastores, schemas, owners, and read/write paths."
    },
    {
      label: "Security and threats",
      status: hasSecurityModel ? "ok" : "warn",
      detail: "Threats, protected assets, authentication, authorization, and mitigations."
    },
    {
      label: "Quality requirements",
      status: hasQualityModel ? "ok" : "warn",
      detail: "Quality scenarios, invariants, RTO/RPO, scalability, reliability, and test expectations."
    },
    {
      label: "Decisions and rationale",
      status: hasDecisionModel ? "ok" : "warn",
      detail: "ADRs or decision nodes preserve why the architecture is shaped this way."
    },
    {
      label: "Stakeholder concerns",
      status: hasStakeholderModel && hasConcernModel ? "ok" : "warn",
      detail: "Stakeholders, concerns, risks, qualities, and addressing architecture elements are visible instead of implicit."
    }
  ];

  const nextActions = [
    ...missingActions(checks),
    ...gapActions("Add invariants to high-impact nodes", nodesWithoutInvariants),
    ...gapActions("Link tests to high-impact nodes", nodesWithoutTests),
    ...gapActions("Link implementation files to high-impact nodes", nodesWithoutFiles),
    ...gapActions("Add failure modes to important flows", flowsWithoutFailureModes),
    ...gapActions("Link tests to flows", flowsWithoutTests),
    ...gapActions("Review stale architecture facts", staleNodes),
    ...gapActions("Confirm inferred architecture facts", inferredNodes)
  ].slice(0, 10);

  return [
    `# Architecture Review: ${project.manifest.name}`,
    "",
    "Heuristic review inspired by C4, arc42, 4+1, and ISO 42010 concerns. This is not a substitute for architect judgment; it highlights where the atlas may be thin.",
    "",
    "## Viewpoint Coverage",
    "",
    ...checks.map((check) => `- [${reviewStatusLabel(check.status)}] ${check.label}: ${check.detail}`),
    "",
    "## Traceability",
    "",
    `- High-impact nodes: ${highImpactNodes.length}`,
    `- High-impact nodes without invariants: ${nodesWithoutInvariants.length}`,
    `- High-impact nodes without linked tests: ${nodesWithoutTests.length}`,
    `- High-impact nodes without linked files: ${nodesWithoutFiles.length}`,
    `- Flows without failure modes: ${flowsWithoutFailureModes.length}`,
    `- Flows without linked tests: ${flowsWithoutTests.length}`,
    `- Stakeholders: ${(nodesByType.stakeholder ?? []).length}`,
    `- Concerns: ${(nodesByType.concern ?? []).length}`,
    `- Stale nodes: ${staleNodes.length}`,
    `- Inferred nodes awaiting confirmation: ${inferredNodes.length}`,
    "",
    "## Code Intelligence",
    "",
    `- Files: ${project.intelligence.files.length}`,
    `- Classes: ${project.intelligence.classes.length}`,
    `- Routes: ${project.intelligence.routes.length}`,
    `- Dependencies: ${project.intelligence.dependencies.length}`,
    `- Test map entries: ${project.intelligence.testMap.length}`,
    "",
    "## Suggested Next Actions",
    "",
    ...(nextActions.length ? nextActions.map((item) => `- ${item}`) : ["- No obvious architecture documentation gaps found by the heuristic review."])
  ].join("\n");
}

export function generateCodeIntelligenceOverview(project: AtlasProject): string {
  const intelligence = project.intelligence ?? emptyCodeIntelligence();
  const largestFiles = [...intelligence.files]
    .sort((left, right) => (right.lines ?? 0) - (left.lines ?? 0))
    .slice(0, 12);
  const busiestClasses = [...intelligence.classes]
    .sort((left, right) => (right.methods.length + right.attributes.length) - (left.methods.length + left.attributes.length))
    .slice(0, 16);
  const internalDeps = intelligence.dependencies.filter((item) => item.kind === "internal").slice(0, 30);
  const externalDeps = unique(intelligence.dependencies.filter((item) => item.kind === "external").map((item) => item.target)).slice(0, 30);

  return [
    `# Code Intelligence: ${project.manifest.name}`,
    "",
    intelligence.generatedAt ? `Generated at: ${intelligence.generatedAt}` : "No scan persisted yet.",
    "",
    "## Inventory",
    "",
    `- Structure entries: ${intelligence.projectStructure.length}`,
    `- Files: ${intelligence.files.length}`,
    `- Symbols: ${intelligence.symbols.length}`,
    `- Classes: ${intelligence.classes.length}`,
    `- Routes: ${intelligence.routes.length}`,
    `- Dependencies: ${intelligence.dependencies.length}`,
    `- Test map entries: ${intelligence.testMap.length}`,
    "",
    "## Largest Files",
    "",
    ...(largestFiles.length ? largestFiles.map((item) => `- ${item.path}: ${item.lines ?? "?"} lines, ${item.symbols.length} symbols`) : ["- No files indexed."]),
    "",
    "## Classes",
    "",
    ...(busiestClasses.length ? busiestClasses.map((item) => `- ${item.name} (${item.path}): ${item.attributes.length} attrs, ${item.methods.length} methods`) : ["- No classes indexed."]),
    "",
    "## Routes",
    "",
    ...(intelligence.routes.length ? intelligence.routes.slice(0, 40).map((item) => `- ${item.method} ${item.path} -> ${item.sourceFile}${item.line ? `:${item.line}` : ""}`) : ["- No routes indexed."]),
    "",
    "## Internal Dependencies",
    "",
    ...(internalDeps.length ? internalDeps.map((item) => `- ${item.source} -> ${item.target}`) : ["- No internal dependencies indexed."]),
    "",
    "## External Dependencies",
    "",
    ...(externalDeps.length ? externalDeps.map((item) => `- ${item}`) : ["- No external dependencies indexed."]),
    "",
    "## Tests",
    "",
    ...(intelligence.testMap.length ? intelligence.testMap.slice(0, 40).map((item) => `- ${item.testFile} -> ${item.targetFiles.join(", ") || "unknown"}`) : ["- No test map indexed."])
  ].join("\n");
}

export function generateContextPack(
  project: AtlasProject,
  targetIds: string[] = [],
  goal = "Implement the next architecture-safe change.",
  scope: ContextPackScope = "standard"
): string {
  const budget = contextPackBudgets[scope];
  const targets = targetIds.length
    ? project.nodes.filter((node) => targetIds.includes(node.id)).slice(0, budget.seedCount)
    : rankedContextSeeds(project.nodes).slice(0, budget.seedCount);
  const targetSet = new Set(targets.map((node) => node.id));
  const relatedEdges = project.edges
    .filter((edge) => targetSet.has(edge.source) || targetSet.has(edge.target))
    .slice(0, budget.maxEdges);
  const relatedNodeIds = new Set([...targetSet, ...relatedEdges.flatMap((edge) => [edge.source, edge.target])]);
  const relatedNodes = rankedContextNodes(project.nodes.filter((node) => relatedNodeIds.has(node.id))).slice(0, budget.maxNodes);
  const keptNodeIds = new Set(relatedNodes.map((node) => node.id));
  const keptEdges = relatedEdges.filter((edge) => keptNodeIds.has(edge.source) && keptNodeIds.has(edge.target));
  const relatedFlows = project.flows
    .filter((flow) => flow.steps.some((step) => step.nodeId && keptNodeIds.has(step.nodeId)))
    .slice(0, budget.maxFlows);
  const invariants = unique(relatedNodes.flatMap((node) => node.invariants));
  const risks = unique(relatedNodes.flatMap((node) => node.risks));
  const files = unique(relatedNodes.flatMap((node) => node.linkedFiles)).slice(0, budget.maxFiles);
  const tests = unique(relatedNodes.flatMap((node) => node.linkedTests)).slice(0, budget.maxTests);
  const metadata = relatedNodes.flatMap((node) => metadataLines(node));
  const intelligence = codeIntelligenceContextLines(project.intelligence ?? emptyCodeIntelligence(), files, budget.maxEvidence);
  const evidence = project.evidence
    .filter((item) =>
      files.some((file) => item.path === file || item.path.startsWith(`${file}/`)) ||
      item.linkedNodeIds?.some((nodeId) => keptNodeIds.has(nodeId))
    )
    .slice(0, budget.maxEvidence);

  return [
    `# AI Context Pack: ${project.manifest.name}`,
    "",
    "## Budget",
    "",
    `- Scope: ${scope}`,
    `- Nodes: ${relatedNodes.length}/${relatedNodeIds.size}`,
    `- Edges: ${keptEdges.length}/${relatedEdges.length}`,
    `- Evidence items: ${evidence.length}`,
    `- Flows: ${relatedFlows.length}`,
    "",
    `## Goal`,
    "",
    goal,
    "",
    "## Affected Architecture",
    "",
    ...relatedNodes.map((node) => `- ${node.id}: ${node.name} (${node.type}) owned by ${node.owner}; criticality ${node.criticality}`),
    "",
    "## Relevant Dependencies",
    "",
    ...(keptEdges.length ? keptEdges.map((edge) => `- ${edge.source} ${edge.type} ${edge.target}`) : ["- None selected."]),
    "",
    "## Relevant Flows",
    "",
    ...(relatedFlows.length
      ? relatedFlows.map((flow) => `- ${flow.id}: ${flow.name} (${flow.criticality}); ${flow.steps.length} steps`)
      : ["- No flows selected for this context budget."]),
    "",
    "## Invariants",
    "",
    ...(invariants.length ? invariants.map((item) => `- ${item}`) : ["- No invariants recorded for selected scope."]),
    "",
    "## Risks",
    "",
    ...(risks.length ? risks.map((item) => `- ${item}`) : ["- No risks recorded for selected scope."]),
    "",
    "## Typed Metadata",
    "",
    ...(metadata.length ? metadata : ["- No typed metadata recorded for selected scope."]),
    "",
    "## Linked Files",
    "",
    ...(files.length ? files.map((item) => `- ${item}`) : ["- No linked files yet."]),
    "",
    "## Code Evidence",
    "",
    ...(evidence.length ? evidence.flatMap(codeEvidenceLines) : ["- No scanned code evidence linked to this scope."]),
    "",
    "## Persistent Code Intelligence",
    "",
    ...(intelligence.length ? intelligence : ["- No persistent code intelligence linked to this scope. Run Scan and Export to persist it."]),
    "",
    "## Required Tests",
    "",
    ...(tests.length ? tests.map((item) => `- ${item}`) : ["- Add or identify tests for changed behavior."]),
    "",
    "## Forbidden Changes",
    "",
    "- Do not bypass owners of data stores or public contracts.",
    "- Do not weaken recorded invariants without updating the architecture proposal.",
    "- Do not introduce undocumented calls to external systems.",
    "",
    "## Acceptance Checks",
    "",
    "- Architecture validation passes.",
    "- Affected flows retain acceptance coverage.",
    "- Architecture files and generated diagrams are updated with the code change."
  ].join("\n");
}

export function semanticDiff(before: AtlasProjectSnapshot, after: AtlasProjectSnapshot): SemanticDiff {
  const beforeNodes = new Map(before.nodes.map((node) => [node.id, node]));
  const afterNodes = new Map(after.nodes.map((node) => [node.id, node]));
  const beforeEdges = new Map(before.edges.map((edge) => [edge.id, edge]));
  const afterEdges = new Map(after.edges.map((edge) => [edge.id, edge]));
  const beforeFlows = new Map(before.flows.map((flow) => [flow.id, flow]));
  const afterFlows = new Map(after.flows.map((flow) => [flow.id, flow]));

  const changedNodes = [...beforeNodes.entries()]
    .filter(([id]) => afterNodes.has(id))
    .map(([id, node]) => ({ before: node, after: afterNodes.get(id)!, changes: changedFields(node, afterNodes.get(id)!) }))
    .filter((item) => item.changes.length > 0);

  const changedFlows = unique([...beforeFlows.keys(), ...afterFlows.keys()]).map((id) => {
    const previous = beforeFlows.get(id);
    const next = afterFlows.get(id);
    return {
      before: previous,
      after: next,
      changes: previous && next ? changedFields(previous, next) : [previous ? "removed" : "added"]
    };
  }).filter((item) => item.changes.length > 0);

  return {
    addedNodes: [...afterNodes.values()].filter((node) => !beforeNodes.has(node.id)),
    removedNodes: [...beforeNodes.values()].filter((node) => !afterNodes.has(node.id)),
    changedNodes,
    addedEdges: [...afterEdges.values()].filter((edge) => !beforeEdges.has(edge.id)),
    removedEdges: [...beforeEdges.values()].filter((edge) => !afterEdges.has(edge.id)),
    changedFlows
  };
}

export function generateMigrationBrief(project: AtlasProject, proposal?: AtlasProposal): string {
  const activeProposal = proposal ?? project.proposals.at(-1);
  const before = activeProposal?.before ?? cloneProjectSnapshot(project);
  const after = activeProposal?.after ?? cloneProjectSnapshot(project);
  const diff = semanticDiff(before, after);
  const affectedIds = unique([
    ...diff.addedNodes.map((node) => node.id),
    ...diff.removedNodes.map((node) => node.id),
    ...diff.changedNodes.map((item) => item.after.id),
    ...diff.addedEdges.flatMap((edge) => [edge.source, edge.target]),
    ...diff.removedEdges.flatMap((edge) => [edge.source, edge.target])
  ]);
  const affectedNodes = after.nodes.filter((node) => affectedIds.includes(node.id));
  const affectedFiles = unique(affectedNodes.flatMap((node) => node.linkedFiles));
  const affectedEvidence = project.evidence
    .filter((item) =>
      affectedFiles.some((file) => item.path === file || item.path.startsWith(`${file}/`)) ||
      item.linkedNodeIds?.some((nodeId) => affectedIds.includes(nodeId))
    )
    .slice(0, 25);

  return [
    `# Migration Brief: ${activeProposal?.name ?? project.manifest.name}`,
    "",
    "## Summary",
    "",
    activeProposal?.summary ?? "No proposal selected. This brief describes the current architecture state.",
    "",
    "## Rationale",
    "",
    activeProposal?.rationale ?? "No rationale recorded.",
    "",
    "## Semantic Diff",
    "",
    `- Added nodes: ${diff.addedNodes.map((node) => node.name).join(", ") || "none"}`,
    `- Removed nodes: ${diff.removedNodes.map((node) => node.name).join(", ") || "none"}`,
    `- Changed nodes: ${diff.changedNodes.map((item) => `${item.after.name} (${item.changes.join(", ")})`).join("; ") || "none"}`,
    `- Added edges: ${diff.addedEdges.map((edge) => `${edge.source} ${edge.type} ${edge.target}`).join("; ") || "none"}`,
    `- Removed edges: ${diff.removedEdges.map((edge) => `${edge.source} ${edge.type} ${edge.target}`).join("; ") || "none"}`,
    "",
    "## Affected Architecture",
    "",
    ...(affectedNodes.length
      ? affectedNodes.map((node) => `- ${node.id}: ${node.name} (${node.type})`)
      : ["- No affected nodes detected yet."]),
    "",
    "## Invariants To Preserve",
    "",
    ...listOrFallback(unique(affectedNodes.flatMap((node) => node.invariants)), "No affected invariants recorded."),
    "",
    "## Risks To Watch",
    "",
    ...listOrFallback(unique(affectedNodes.flatMap((node) => node.risks)), "No affected risks recorded."),
    "",
    "## Linked Files",
    "",
    ...listOrFallback(affectedFiles, "No linked files recorded."),
    "",
    "## Code Evidence",
    "",
    ...(affectedEvidence.length ? affectedEvidence.flatMap(codeEvidenceLines) : ["- No scanned code evidence linked to affected nodes."]),
    "",
    "## Required Tests",
    "",
    ...listOrFallback(unique([...affectedNodes.flatMap((node) => node.linkedTests), ...(activeProposal?.acceptanceChecks ?? [])]), "Add tests for changed behavior."),
    "",
    "## Forbidden Changes",
    "",
    ...listOrFallback(activeProposal?.forbiddenChanges ?? [], "Do not introduce undocumented architecture drift.")
  ].join("\n");
}

export function mergeEvidence(project: AtlasProject, evidence: CodeEvidence[]): AtlasProject {
  return { ...project, evidence };
}

export function mergeCodeEvidence(project: AtlasProject, evidence: CodeEvidence[], intelligence: CodeIntelligence = project.intelligence ?? emptyCodeIntelligence()): AtlasProject {
  const generatedNodeIds = new Set(project.nodes.filter((node) => node.metadata?.generatedBy === "workspace-scan").map((node) => node.id));
  const manualNodes = project.nodes.filter((node) => !generatedNodeIds.has(node.id));
  const manualEdges = project.edges.filter((edge) =>
    !edge.tags?.includes("generated:workspace-scan") &&
    !generatedNodeIds.has(edge.source) &&
    !generatedNodeIds.has(edge.target)
  );
  const codeEvidence = evidence.filter((item) => ["source", "test", "contract", "migration"].includes(item.kind));
  const selectedFiles = rankEvidenceFiles(codeEvidence).slice(0, 40);
  const fileNodeIds = new Map(selectedFiles.map((item) => [item.path, fileNodeId(item.path)]));
  const nodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];
  const evidenceWithLinks = evidence.map((item) => {
    const linkedNodeIds = new Set(item.linkedNodeIds ?? []);
    const fileId = fileNodeIds.get(item.path);
    if (fileId) linkedNodeIds.add(fileId);
    return { ...item, linkedNodeIds: [...linkedNodeIds] };
  });

  selectedFiles.forEach((item, index) => {
    const id = fileNodeId(item.path);
    nodes.push({
      id,
      type: "file_group",
      name: basename(item.path),
      owner: "code",
      status: "active",
      criticality: criticalityForEvidence(item),
      responsibilities: [`Represents scanned ${item.kind} evidence at ${item.path}.`],
      dependencies: item.imports ?? [],
      invariants: [],
      linkedFiles: [item.path],
      linkedTests: item.kind === "test" ? [item.path] : [],
      risks: [],
      confidence: "observed",
      notes: codeEvidenceSummary(item),
      architectureLevel: "code",
      tags: ["generated", item.kind],
      metadata: {
        generatedBy: "workspace-scan",
        evidencePath: item.path,
        evidenceKind: item.kind,
        language: item.language,
        lines: item.lines,
        symbolCount: item.symbols?.length ?? 0
      },
      position: { x: 80 + (index % 3) * 260, y: 90 + Math.floor(index / 3) * 150 }
    });
  });

  const exportedSymbols = selectedFiles.flatMap((file) =>
    (file.symbols ?? [])
      .filter((symbol) => symbol.kind !== "method" || (file.exports ?? []).some((exportName) => symbol.name.startsWith(`${exportName}.`)))
      .map((symbol) => ({ file, symbol, exported: (file.exports ?? []).includes(symbol.name) || symbol.kind === "route" }))
  );

  exportedSymbols
    .sort((left, right) => Number(right.exported) - Number(left.exported) || (left.symbol.line ?? 0) - (right.symbol.line ?? 0))
    .slice(0, 40)
    .forEach(({ file, symbol }, index) => {
      const fileId = fileNodeIds.get(file.path);
      if (!fileId) return;
      const id = symbolNodeId(file.path, symbol.name);
      nodes.push({
        id,
        type: "code_symbol",
        name: symbol.name,
        owner: "code",
        status: "active",
        criticality: symbol.kind === "route" ? "high" : "medium",
        responsibilities: [`${prettySymbolKind(symbol.kind)} discovered in ${file.path}.`],
        dependencies: [],
        invariants: [],
        linkedFiles: [file.path],
        linkedTests: file.kind === "test" ? [file.path] : [],
        risks: [],
        confidence: "observed",
        notes: `${prettySymbolKind(symbol.kind)}${symbol.line ? ` at line ${symbol.line}` : ""}.`,
        architectureLevel: "code",
        tags: ["generated", "symbol", symbol.kind],
        metadata: {
          generatedBy: "workspace-scan",
          evidencePath: file.path,
          symbolKind: symbol.kind,
          line: symbol.line,
          exported: (file.exports ?? []).includes(symbol.name)
        },
        position: { x: 880 + (index % 2) * 260, y: 90 + Math.floor(index / 2) * 120 }
      });
      edges.push(generatedEdge(fileId, id, "contains", "contains"));
    });

  selectedFiles.forEach((file) => {
    const sourceId = fileNodeIds.get(file.path);
    if (!sourceId) return;
    for (const importPath of file.imports ?? []) {
      const targetPath = resolveImportPath(file.path, importPath, fileNodeIds);
      if (!targetPath) continue;
      const targetId = fileNodeIds.get(targetPath);
      if (targetId && targetId !== sourceId) edges.push(generatedEdge(sourceId, targetId, "depends_on", importPath));
    }
  });

  return {
    ...project,
    evidence: evidenceWithLinks,
    intelligence,
    nodes: [...manualNodes, ...nodes],
    edges: [...manualEdges, ...dedupeEdges(edges)]
  };
}

export function updateProposalAfter(project: AtlasProject, proposalId?: string, afterProject: AtlasProject = project): AtlasProject {
  if (!proposalId) return project;
  const after = cloneProjectSnapshot(afterProject);
  return {
    ...project,
    proposals: project.proposals.map((proposal) =>
      proposal.id === proposalId ? { ...proposal, after } : proposal
    )
  };
}

export function applyProposal(project: AtlasProject, proposalId: string): AtlasProject {
  const proposal = project.proposals.find((item) => item.id === proposalId);
  if (!proposal) return project;
  const appliedAt = nowIso();
  const appliedSnapshot = proposal.after;

  return {
    ...projectFromSnapshot(project, appliedSnapshot),
    manifest: { ...project.manifest, updatedAt: appliedAt },
    proposals: project.proposals.map((item) =>
      item.id === proposalId ? { ...item, status: "applied", appliedAt } : item
    ),
    versions: [
      ...project.versions,
      {
        id: `version.${cryptoSafeId()}`,
        name: `${proposal.name} applied`,
        summary: proposal.summary,
        snapshot: structuredClone(appliedSnapshot),
        createdAt: appliedAt,
        source: "proposal" as const,
        proposalId
      }
    ]
  };
}

function isHighRisk(node: AtlasNode) {
  const rank: Record<Criticality, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  return rank[node.criticality] >= 2 || node.risks.length > 0 || node.linkedTests.length === 0;
}

function defaultPositionsForView(nodes: AtlasNode[], viewId: ViewId, project?: AtlasProject) {
  if (viewId === "proposals") {
    return new Map(nodes.map((node) => [node.id, node.position ?? { x: 80, y: 80 }]));
  }

  if (viewId === "flows") {
    return defaultFlowPositions(nodes, project);
  }

  const laneCounts = new Map<number, number>();

  return new Map(nodes.map((node) => {
    const lane = laneForView(node, viewId);
    const row = laneCounts.get(lane) ?? 0;
    laneCounts.set(lane, row + 1);
    return [node.id, { x: 80 + lane * 260, y: 90 + row * 145 }];
  }));
}

function defaultFlowPositions(nodes: AtlasNode[], project?: AtlasProject) {
  const stepNodeIds = unique(project?.flows.flatMap((flow) => flow.steps.map((step) => step.nodeId ?? "")) ?? []);
  const ordered = [
    ...stepNodeIds.map((id) => nodes.find((node) => node.id === id)).filter(Boolean),
    ...nodes.filter((node) => !stepNodeIds.includes(node.id))
  ] as AtlasNode[];

  return new Map(ordered.map((node, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    return [node.id, { x: 70 + column * 235, y: 90 + row * 130 }];
  }));
}

function laneForView(node: AtlasNode, viewId: ViewId) {
  const match = viewLaneRules[viewId]?.find((rule) => rule.types.includes(node.type));
  return match?.lane ?? viewLaneFallbacks[viewId] ?? 0;
}

function lane(laneNumber: number, types: NodeType[]) {
  return { lane: laneNumber, types };
}

function changedFields(before: object, after: object) {
  const previous = before as Record<string, unknown>;
  const next = after as Record<string, unknown>;

  return unique([...Object.keys(previous), ...Object.keys(next)]).filter((key) => {
    if (["position"].includes(key)) return false;
    return JSON.stringify(previous[key]) !== JSON.stringify(next[key]);
  });
}

function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = keyFn(item);
    groups[key] = groups[key] ?? [];
    groups[key].push(item);
    return groups;
  }, {});
}

function listOrFallback(items: string[], fallback: string) {
  return items.length ? items.map((item) => `- ${item}`) : [`- ${fallback}`];
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function mermaidId(id: string) {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

function escapeMermaid(value: string) {
  return value.replace(/"/g, "'");
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function rankEvidenceFiles(evidence: CodeEvidence[]) {
  const score = (item: CodeEvidence) => {
    let value = 0;
    if (item.kind === "contract") value += 40;
    if (item.kind === "source") value += 30;
    if (item.kind === "migration") value += 25;
    if (item.kind === "test") value += 20;
    value += Math.min(item.symbols?.length ?? 0, 20);
    value += Math.min(item.exports?.length ?? 0, 20);
    value += Math.min(item.routes?.length ?? 0, 10) * 2;
    if (item.path.includes("/lib/") || item.path.includes("/server/") || item.path.includes("/src/")) value += 5;
    return value;
  };

  return [...evidence].sort((left, right) => score(right) - score(left) || left.path.localeCompare(right.path));
}

function fileNodeId(filePath: string) {
  return `code.file.${slug(filePath)}`;
}

function symbolNodeId(filePath: string, symbolName: string) {
  return `code.symbol.${slug(filePath)}.${slug(symbolName)}`;
}

function generatedEdge(source: string, target: string, type: EdgeType, label: string): AtlasEdge {
  return {
    id: `${source}-${type}-${target}`,
    source,
    target,
    type,
    label,
    tags: ["generated:workspace-scan"]
  };
}

function dedupeEdges(edges: AtlasEdge[]) {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    if (seen.has(edge.id)) return false;
    seen.add(edge.id);
    return true;
  });
}

function criticalityForEvidence(item: CodeEvidence): Criticality {
  if (item.kind === "contract" || item.kind === "migration" || (item.routes?.length ?? 0) > 0) return "high";
  if (item.kind === "test") return "low";
  return "medium";
}

function codeEvidenceSummary(item: CodeEvidence) {
  const parts = [
    `${item.kind} file`,
    item.language ? `language: ${item.language}` : "",
    item.lines ? `${item.lines} lines` : "",
    item.exports?.length ? `exports: ${item.exports.slice(0, 8).join(", ")}` : "",
    item.routes?.length ? `routes: ${item.routes.slice(0, 8).join(", ")}` : "",
    item.imports?.length ? `imports: ${item.imports.slice(0, 10).join(", ")}` : ""
  ].filter(Boolean);
  return parts.join("\n");
}

function codeEvidenceLines(item: CodeEvidence) {
  const lines = [`- ${item.path} (${[item.kind, item.language, item.lines ? `${item.lines} lines` : ""].filter(Boolean).join(", ")})`];
  if (item.exports?.length) lines.push(`  exports: ${item.exports.slice(0, 12).join(", ")}`);
  if (item.routes?.length) lines.push(`  routes: ${item.routes.slice(0, 8).join(", ")}`);
  if (item.symbols?.length) {
    const symbols = item.symbols.slice(0, 12).map((symbol) => `${symbol.kind}:${symbol.name}${symbol.line ? `@${symbol.line}` : ""}`).join(", ");
    lines.push(`  symbols: ${symbols}`);
  }
  return lines;
}

function metadataLines(node: AtlasNode) {
  const metadata = node.metadata ?? {};
  return metadataFieldsForNode(node.type)
    .map((field) => {
      const value = metadata[field.key];
      if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return "";
      const rendered = Array.isArray(value) ? value.join(", ") : String(value);
      return `- ${node.id}.${field.key}: ${rendered}`;
    })
    .filter(Boolean);
}

function codeIntelligenceContextLines(intelligence: CodeIntelligence, files: string[], limit: number) {
  const fileSet = new Set(files);
  const classes = intelligence.classes.filter((item) => fileSet.has(item.path)).slice(0, limit);
  const routes = intelligence.routes.filter((item) => fileSet.has(item.sourceFile)).slice(0, limit);
  const dependencies = intelligence.dependencies.filter((item) => fileSet.has(item.source) || fileSet.has(item.target)).slice(0, limit);
  const tests = intelligence.testMap.filter((item) => fileSet.has(item.testFile) || item.targetFiles.some((target) => fileSet.has(target))).slice(0, limit);
  const symbols = intelligence.symbols.filter((item) => fileSet.has(item.path) && item.kind !== "method").slice(0, limit);

  return [
    ...classes.map((item) => `- class ${item.name} in ${item.path}: ${item.attributes.length} attrs, ${item.methods.length} methods${item.extends ? `, extends ${item.extends}` : ""}`),
    ...routes.map((item) => `- route ${item.method} ${item.path} in ${item.sourceFile}${item.line ? `:${item.line}` : ""}`),
    ...symbols.map((item) => `- symbol ${item.kind} ${item.name} in ${item.path}${item.line ? `:${item.line}` : ""}`),
    ...dependencies.map((item) => `- dependency ${item.source} -> ${item.target} (${item.kind})`),
    ...tests.map((item) => `- test ${item.testFile} covers ${item.targetFiles.join(", ") || "unknown targets"}`)
  ].slice(0, limit * 4);
}

function hasAny(groups: Record<string, AtlasNode[]>, types: string[]) {
  return types.some((type) => (groups[type]?.length ?? 0) > 0);
}

function reviewStatusLabel(status: "ok" | "warn" | "missing") {
  if (status === "ok") return "OK";
  if (status === "missing") return "Missing";
  return "Needs attention";
}

function missingActions(checks: Array<{ label: string; status: "ok" | "warn" | "missing" }>) {
  return checks
    .filter((check) => check.status !== "ok")
    .map((check) => `${check.status === "missing" ? "Create" : "Review"} ${check.label.toLowerCase()} coverage.`);
}

function gapActions(label: string, nodes: Array<AtlasNode | AtlasFlow>) {
  if (!nodes.length) return [];
  const names = nodes.slice(0, 4).map((item) => item.name).join(", ");
  const suffix = nodes.length > 4 ? `, and ${nodes.length - 4} more` : "";
  return [`${label}: ${names}${suffix}.`];
}

function rankedContextSeeds(nodes: AtlasNode[]) {
  return rankedContextNodes(nodes.filter((node) =>
    node.criticality === "critical" ||
    node.criticality === "high" ||
    node.risks.length > 0 ||
    node.invariants.length > 0 ||
    node.linkedTests.length > 0
  ));
}

function rankedContextNodes(nodes: AtlasNode[]) {
  return [...nodes].sort((a, b) => contextNodeScore(b) - contextNodeScore(a) || a.name.localeCompare(b.name));
}

function contextNodeScore(node: AtlasNode) {
  const criticalityScore: Record<Criticality, number> = { low: 0, medium: 2, high: 5, critical: 8 };
  const typeBonus = ["system", "container", "service", "module", "datastore", "queue", "api_contract", "event_contract", "risk", "threat", "quality_scenario"].includes(node.type) ? 2 : 0;
  return criticalityScore[node.criticality] + typeBonus + node.invariants.length + node.risks.length + node.linkedTests.length;
}

function prettySymbolKind(kind: string) {
  return kind.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function basename(filePath: string) {
  return filePath.split("/").at(-1) ?? filePath;
}

function dirname(filePath: string) {
  const parts = filePath.split("/");
  parts.pop();
  return parts.join("/");
}

function resolveImportPath(fromPath: string, specifier: string, knownFiles: Map<string, string>) {
  if (!specifier.startsWith(".")) return null;

  const base = normalizePath(`${dirname(fromPath)}/${specifier}`);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`
  ];

  return candidates.find((candidate) => knownFiles.has(candidate)) ?? null;
}

function normalizePath(filePath: string) {
  const parts: string[] = [];
  for (const part of filePath.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
}

function levelForNodeType(type: NodeType) {
  if (["team", "stakeholder"].includes(type)) return "enterprise" as const;
  if (["system", "actor", "external_system", "concern"].includes(type)) return "system" as const;
  if (["container", "app", "service", "worker", "scheduler", "load_balancer", "queue", "cache", "datastore", "replica"].includes(type)) return "container" as const;
  if (["component", "module", "contract", "api_contract", "event_contract"].includes(type)) return "component" as const;
  if (["code_symbol", "file_group"].includes(type)) return "code" as const;
  if (["environment", "region", "deployment_node"].includes(type)) return "deployment" as const;
  if (["data_entity", "schema", "migration"].includes(type)) return "data" as const;
  if (["decision"].includes(type)) return "domain" as const;
  return "quality" as const;
}

function cryptoSafeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(16).slice(2, 10);
}
