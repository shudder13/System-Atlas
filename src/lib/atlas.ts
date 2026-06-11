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
  CodeSchema,
  ContextPackScope,
  Criticality,
  EDGE_TYPES,
  EdgeType,
  ImportCandidate,
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

// `concern` is included to match viewLaneRules.overview lane 1, which already
// assigns concerns a lane -- without it the lane rule was dead and concern
// nodes were silently dropped from the Context view.
const overviewTypes = new Set<NodeType>(["actor", "stakeholder", "system", "app", "container", "service", "external_system", "team", "load_balancer", "concern"]);
const containerTypes = new Set<NodeType>(["system", "container", "app", "service", "worker", "scheduler", "load_balancer", "external_system", "api_contract", "event_contract"]);
const codeTypes = new Set<NodeType>(["component", "module", "code_symbol", "file_group", "contract", "api_contract", "event_contract", "page"]);
const classDiagramTypes = new Set<NodeType>(["component", "module", "code_symbol", "file_group", "contract"]);
const apiSurfaceTypes = new Set<NodeType>(["actor", "app", "container", "service", "module", "load_balancer", "external_system", "contract", "api_contract", "quality_scenario", "risk", "page"]);
const deploymentTypes = new Set<NodeType>(["environment", "region", "deployment_node", "load_balancer", "service", "worker", "scheduler", "datastore", "replica", "queue", "cache", "external_system", "env_var"]);
const dataTypes = new Set<NodeType>(["service", "module", "worker", "datastore", "replica", "queue", "cache", "external_system", "contract", "api_contract", "event_contract", "data_entity", "schema", "migration"]);
const schemaModelTypes = new Set<NodeType>(["service", "module", "worker", "datastore", "replica", "data_entity", "schema", "migration", "decision", "quality_scenario", "risk"]);
const domainTypes = new Set<NodeType>(["system", "container", "component", "module", "data_entity", "schema", "api_contract", "event_contract", "decision", "team", "tech_choice"]);
const securityTypes = new Set<NodeType>(["actor", "app", "service", "external_system", "api_contract", "event_contract", "datastore", "data_entity", "threat", "risk", "env_var"]);
const concernTypes = new Set<NodeType>(["stakeholder", "actor", "team", "concern", "quality_scenario", "risk", "threat", "decision", "system", "container", "service", "app", "external_system"]);
const healthTypes = new Set<NodeType>(["quality_scenario", "service", "worker", "scheduler", "load_balancer", "queue", "datastore", "replica", "cache", "external_system", "risk", "threat", "decision", "alert", "runbook"]);
const decisionTypes = new Set<NodeType>(["decision", "quality_scenario", "risk", "threat", "system", "container", "service", "component", "module", "tech_choice"]);
const flowTypes = new Set<NodeType>(["actor", "app", "load_balancer", "service", "container", "component", "module", "contract", "api_contract", "event_contract", "queue", "worker", "scheduler", "datastore", "external_system", "flow", "page"]);

const viewEdgeTypes: Partial<Record<ViewId, Set<EdgeType>>> = {
  overview: new Set(["contains", "calls", "routes_to", "depends_on", "owns", "has_concern", "addresses"]),
  containers: new Set(["contains", "calls", "routes_to", "exposes", "publishes", "subscribes_to", "depends_on", "deploys_to"]),
  components: new Set(["contains", "calls", "depends_on", "implements", "routes_to", "exposes", "models"]),
  code: new Set(["contains", "implements", "tests", "depends_on", "traces_to", "models"]),
  class_diagram: new Set(["contains", "implements", "depends_on", "tests", "models", "traces_to"]),
  api_surface: new Set(["exposes", "routes_to", "calls", "implements", "tests", "depends_on", "authenticates", "authorizes", "risks", "mitigates", "addresses"]),
  flows: new Set(["calls", "routes_to", "emits", "consumes", "publishes", "subscribes_to", "reads", "writes", "tests", "authenticates", "authorizes"]),
  deployment: new Set(["contains", "deploys_to", "routes_to", "replicates_to", "depends_on", "calls"]),
  data: new Set(["reads", "writes", "owns", "replicates_to", "emits", "consumes", "publishes", "subscribes_to", "models"]),
  schema_model: new Set(["owns", "models", "reads", "writes", "replicates_to", "depends_on", "tests", "risks", "mitigates", "decides"]),
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
    schemas: [],
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
    lane(1, ["module", "component", "page"]),
    lane(2, ["code_symbol"]),
    lane(3, ["contract", "api_contract", "event_contract"])
  ],
  class_diagram: [
    lane(0, ["file_group", "module", "component"]),
    lane(1, ["code_symbol"]),
    lane(2, ["contract"])
  ],
  api_surface: [
    lane(0, ["actor", "app", "page", "load_balancer"]),
    lane(1, ["container", "service", "module"]),
    lane(2, ["api_contract", "contract"]),
    lane(3, ["external_system"]),
    lane(4, ["quality_scenario", "risk"])
  ],
  flows: [
    lane(0, ["actor", "app", "page"]),
    lane(1, ["container", "load_balancer", "service"]),
    lane(2, ["component", "module", "contract", "api_contract", "event_contract"]),
    lane(3, ["queue", "worker", "scheduler"])
  ],
  deployment: [
    lane(0, ["environment"]),
    lane(1, ["region"]),
    lane(2, ["deployment_node"]),
    lane(3, ["load_balancer", "service", "worker", "scheduler"]),
    lane(4, ["queue", "cache", "datastore", "replica"]),
    lane(5, ["env_var"])
  ],
  data: [
    lane(0, ["service", "module", "worker", "external_system", "contract"]),
    lane(1, ["queue", "cache"]),
    lane(2, ["data_entity", "schema"]),
    lane(3, ["datastore"]),
    lane(4, ["replica"]),
    lane(5, ["migration"])
  ],
  schema_model: [
    lane(0, ["service", "module", "worker"]),
    lane(1, ["datastore", "replica"]),
    lane(2, ["schema"]),
    lane(3, ["data_entity"]),
    lane(4, ["migration"]),
    lane(5, ["quality_scenario", "risk", "decision"])
  ],
  domain: [
    lane(0, ["team", "system"]),
    lane(1, ["container", "component", "module"]),
    lane(2, ["data_entity", "schema"]),
    lane(3, ["api_contract", "event_contract"]),
    lane(4, ["decision", "tech_choice"])
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
    lane(1, ["alert", "runbook"]),
    lane(2, ["external_system", "load_balancer", "queue", "cache"]),
    lane(3, ["service", "worker", "scheduler"]),
    lane(4, ["datastore", "replica"])
  ],
  decisions: [
    lane(0, ["decision", "tech_choice"]),
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
  class_diagram: 3,
  api_surface: 5,
  flows: 4,
  // One beyond the last defined lane (5 = env_var), matching data/schema_model;
  // a fallback of 5 merged unrecognized deployment types into the env_var column.
  deployment: 6,
  data: 6,
  schema_model: 6,
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
  schema: schemaMetadataFields(),
  data_entity: dataEntityMetadataFields(),
  queue: asyncMetadataFields(),
  cache: [
    { key: "ttl", label: "TTL", kind: "text", description: "Cache expiration policy." },
    { key: "consistency", label: "Consistency", kind: "text", description: "Consistency expectation and invalidation approach." },
    { key: "containsPii", label: "Contains PII", kind: "boolean", description: "Whether cached data includes personal or sensitive data." }
  ],
  external_system: [...contractMetadataFields(), ...externalSystemCostFields()],
  api_contract: apiContractMetadataFields(),
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
  ],
  page: [
    { key: "route", label: "Route", kind: "text", description: "URL path or route pattern this page is served at." },
    { key: "layout", label: "Layout", kind: "text", description: "Layout, shell, or template used by this page." },
    { key: "authRequired", label: "Auth required", kind: "boolean", description: "Whether the page requires an authenticated user." },
    { key: "components", label: "Components used", kind: "list", description: "Reusable components composed inside this page." },
    { key: "dataFetched", label: "Data fetched", kind: "list", description: "API endpoints, queries, or data sources this page depends on." },
    { key: "ssrMode", label: "SSR/SSG/CSR", kind: "text", description: "Rendering mode: server, static, client, streaming, or hybrid." },
    { key: "seo", label: "SEO posture", kind: "text", description: "SEO target — public/indexable, private/no-index, or authenticated-only." }
  ],
  env_var: [
    { key: "scope", label: "Scope", kind: "text", description: "Which service or container consumes this variable." },
    { key: "sensitive", label: "Sensitive", kind: "boolean", description: "Whether the value is a secret (credentials, tokens, signing keys)." },
    { key: "required", label: "Required", kind: "boolean", description: "Whether the service refuses to start without this variable set." },
    { key: "defaultValue", label: "Default", kind: "text", description: "Default value when not set, or empty if there is none." },
    { key: "envExamplePath", label: "env example file", kind: "text", description: "Path to the .env.example or similar template that documents this variable." },
    { key: "rotationPolicy", label: "Rotation policy", kind: "text", description: "Rotation cadence, owning system, or 'manual' if rotated by hand." }
  ],
  tech_choice: [
    { key: "category", label: "Category", kind: "text", description: "Language, framework, library, runtime, database, infra, or tooling." },
    { key: "version", label: "Version", kind: "text", description: "Pinned version or version range (e.g. React 19, Postgres 16)." },
    { key: "rationale", label: "Rationale", kind: "text", description: "Why this technology was chosen over alternatives." },
    { key: "alternatives", label: "Alternatives considered", kind: "list", description: "Other technologies evaluated before picking this one." },
    { key: "linkedDecision", label: "Linked decision", kind: "text", description: "Decision (ADR) id that captured the trade-off, if one exists." },
    { key: "reviewCadence", label: "Review cadence", kind: "text", description: "How often this choice should be revisited (e.g. yearly, on major-version bump)." }
  ],
  alert: [
    { key: "severity", label: "Severity", kind: "text", description: "P1/P2/P3/P4 or critical/high/medium/low — operational impact tier." },
    { key: "triggerCondition", label: "Trigger condition", kind: "text", description: "Concrete rule that fires the alert (e.g. 'p99 > 500ms for 5 min', 'WS disconnected > 60s')." },
    { key: "notificationChannel", label: "Notification channel", kind: "text", description: "Where the alert lands: ntfy, Slack #channel, email, PagerDuty schedule, etc." },
    { key: "runbookUrl", label: "Runbook URL", kind: "text", description: "Link or runbook node id with the response procedure." },
    { key: "owner", label: "Owner", kind: "text", description: "Team or person accountable for responding." },
    { key: "onCallRotation", label: "On-call rotation", kind: "text", description: "Rotation name or schedule (e.g. 'primary-oncall', '24x7', 'business-hours')." },
    { key: "lastFiredAt", label: "Last fired", kind: "text", description: "ISO timestamp of the most recent firing, when known." },
    { key: "silencedUntil", label: "Silenced until", kind: "text", description: "ISO timestamp if the alert is temporarily suppressed." }
  ],
  runbook: [
    { key: "whenToUse", label: "When to use", kind: "text", description: "Trigger condition or symptom that points the on-call here." },
    { key: "steps", label: "Steps", kind: "list", description: "Ordered procedure entries — each step a single actionable line." },
    { key: "relatedAlerts", label: "Related alerts", kind: "list", description: "Alert ids this runbook responds to." },
    { key: "escalationPath", label: "Escalation path", kind: "text", description: "Who/what to escalate to if the steps don't resolve the issue." },
    { key: "lastRehearsedAt", label: "Last rehearsed", kind: "text", description: "ISO timestamp of the most recent fire-drill or successful real-incident use." }
  ]
};

export const VIEW_FAMILIES: Array<{ id: string; name: string; description: string; views: ViewId[] }> = [
  { id: "c4", name: "C4", description: "System context, containers, components, code-level structure, and class relationships.", views: ["overview", "containers", "components", "code", "class_diagram"] },
  { id: "behavior", name: "Runtime", description: "Scenarios, business flows, dynamic traces, API surfaces, and async behavior.", views: ["flows", "api_surface"] },
  { id: "platform", name: "Platform", description: "Deployment, infrastructure, regions, data stores, database schemas, and ownership.", views: ["deployment", "data", "schema_model"] },
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
    { key: "scaling", label: "Scaling", kind: "text", description: "Replica, autoscaling, concurrency, or capacity rule." },
    { key: "monthlyCost", label: "Monthly cost", kind: "text", description: "Approximate recurring infra cost (currency + amount)." },
    { key: "costNotes", label: "Cost notes", kind: "text", description: "Free-text notes about cost drivers or vendor terms." }
  ];
}

function dataMetadataFields(): MetadataFieldDefinition[] {
  return [
    { key: "dataOwner", label: "Data owner", kind: "text", description: "Team or service accountable for this data." },
    { key: "retention", label: "Retention", kind: "text", description: "Retention and deletion policy." },
    { key: "consistency", label: "Consistency", kind: "text", description: "Consistency model and stale-read expectations." },
    { key: "backupPolicy", label: "Backup policy", kind: "text", description: "Backup, restore, and verification policy." },
    { key: "restoreTestCadence", label: "Restore-test cadence", kind: "text", description: "How often a real restore drill is run (e.g. quarterly, monthly)." },
    { key: "lastRestoreTestedAt", label: "Last restore-tested", kind: "text", description: "ISO date of the most recent successful restore drill." },
    { key: "rto", label: "RTO", kind: "text", description: "Maximum acceptable recovery time." },
    { key: "rpo", label: "RPO", kind: "text", description: "Maximum acceptable data loss window." },
    { key: "containsPii", label: "Contains PII", kind: "boolean", description: "Whether this data includes personal or sensitive data." },
    { key: "monthlyCost", label: "Monthly cost", kind: "text", description: "Approximate recurring cost (currency + amount)." },
    { key: "costNotes", label: "Cost notes", kind: "text", description: "Free-text notes about cost drivers, optimization opportunities, or vendor terms." }
  ];
}

function schemaMetadataFields(): MetadataFieldDefinition[] {
  return [
    ...dataMetadataFields(),
    { key: "databaseEngine", label: "Database engine", kind: "text", description: "Postgres, MySQL, SQLite, MongoDB, Redis, or another storage engine." },
    { key: "schemaName", label: "Schema name", kind: "text", description: "Physical schema, namespace, collection group, or database name." },
    { key: "tables", label: "Tables/entities", kind: "list", description: "Tables, collections, event streams, or persisted entity sets in this schema." },
    { key: "columns", label: "Columns", kind: "list", description: "Important columns or fields, optionally with type and nullability." },
    { key: "primaryKeys", label: "Primary keys", kind: "list", description: "Primary key fields or identity rules." },
    { key: "indexes", label: "Indexes", kind: "list", description: "Important indexes, unique constraints, and lookup paths." },
    { key: "foreignKeys", label: "Foreign keys", kind: "list", description: "Foreign-key relationships and referential actions." },
    { key: "constraints", label: "Constraints", kind: "list", description: "Uniqueness, checks, exclusion constraints, validation rules, or business constraints." },
    { key: "relations", label: "Relations", kind: "list", description: "Entity/table relationships that should be visible in schema diagrams." },
    { key: "migrationPolicy", label: "Migration policy", kind: "text", description: "How schema changes are rolled out, backfilled, and rolled back." }
  ];
}

function dataEntityMetadataFields(): MetadataFieldDefinition[] {
  return [
    ...dataMetadataFields(),
    { key: "entityName", label: "Entity name", kind: "text", description: "Physical table, collection, aggregate, or document name." },
    { key: "columns", label: "Fields/columns", kind: "list", description: "Important attributes, columns, or document fields." },
    { key: "primaryKeys", label: "Primary keys", kind: "list", description: "Identity fields for this entity." },
    { key: "indexes", label: "Indexes", kind: "list", description: "Lookup paths or indexes that define performance and uniqueness assumptions." },
    { key: "relations", label: "Relations", kind: "list", description: "Relationships to other data entities or schemas." },
    { key: "accessPatterns", label: "Access patterns", kind: "list", description: "Queries, commands, or workflows that read or write this entity." }
  ];
}

function asyncMetadataFields(): MetadataFieldDefinition[] {
  return [
    { key: "deliveryGuarantee", label: "Delivery guarantee", kind: "text", description: "At-most-once, at-least-once, exactly-once, or best-effort semantics." },
    { key: "retention", label: "Retention", kind: "text", description: "Message retention period and dead-letter policy." },
    { key: "ordering", label: "Ordering", kind: "text", description: "Ordering guarantee and partitioning key, if relevant." }
  ];
}

function externalSystemCostFields(): MetadataFieldDefinition[] {
  return [
    { key: "monthlyCost", label: "Monthly cost", kind: "text", description: "Approximate recurring cost (currency + amount)." },
    { key: "costNotes", label: "Cost notes", kind: "text", description: "Free-text notes about cost drivers, vendor terms, or pricing tier." }
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

function apiContractMetadataFields(): MetadataFieldDefinition[] {
  return [
    ...contractMetadataFields(),
    { key: "routeMethod", label: "Route method", kind: "text", description: "HTTP method or RPC operation kind." },
    { key: "routePath", label: "Route path", kind: "text", description: "Public path, operation name, or route pattern." },
    { key: "statusCodes", label: "Status codes", kind: "list", description: "Expected success and error status codes." },
    { key: "requestBody", label: "Request body", kind: "text", description: "Request schema, DTO, command, or payload shape." },
    { key: "responseBody", label: "Response body", kind: "text", description: "Response schema, DTO, event, or payload shape." },
    { key: "handlerFile", label: "Handler file", kind: "text", description: "Source file or module that implements this contract." },
    { key: "endpoints", label: "Endpoints", kind: "list", description: "Structured endpoint rows managed by the API contract editor." },
    { key: "rateLimitPerMinute", label: "Rate limit (per minute)", kind: "number", description: "Maximum requests per minute, or 0/empty for unlimited." },
    { key: "rateLimitBurst", label: "Rate limit burst", kind: "number", description: "Short-term burst allowance above the per-minute average." },
    { key: "rateLimitScope", label: "Rate limit scope", kind: "text", description: "Who the limit applies to: user, api-key, IP, tenant, or global." },
    { key: "rateLimitEnforcedAt", label: "Rate limit enforced at", kind: "text", description: "Layer that enforces the limit: gateway, middleware, handler, or external WAF." },
    { key: "idempotent", label: "Idempotent", kind: "boolean", description: "Whether retrying the same request with the same input produces the same effect." },
    { key: "idempotencyMechanism", label: "Idempotency mechanism", kind: "text", description: "How idempotency is achieved: client key, server-side dedupe, natural-id upsert, etc." }
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
    { id: "class_diagram" as const, name: "Classes", family: "c4", concern: "Object model", scope: "code", core: false, description: "Saved class and interface model from code intelligence, including attributes, methods, inheritance, implementation, and test links." },
    { id: "flows" as const, name: "Flows", family: "behavior", concern: "Runtime behavior", scope: "scenario", core: true, description: "Critical user and system journeys, traces, failure modes, and acceptance checks." },
    { id: "api_surface" as const, name: "API Surface", family: "behavior", concern: "Public contracts", scope: "contract", core: true, description: "API contracts, discovered routes, exposed endpoints, auth concerns, linked tests, and services that implement or depend on them." },
    { id: "deployment" as const, name: "Deployment", family: "platform", concern: "Physical/runtime topology", scope: "environment", core: true, description: "Environments, regions, deployment nodes, replicas, routing, and operational topology." },
    { id: "data" as const, name: "Data", family: "platform", concern: "Data ownership", scope: "data", core: true, description: "Entities, schemas, stores, queues, caches, ownership, read/write paths, replicas, and retention-sensitive paths." },
    { id: "schema_model" as const, name: "Schema Model", family: "platform", concern: "Database model", scope: "data", core: true, description: "Database schemas, entities, tables, columns, keys, indexes, relations, replicas, migrations, and read/write ownership." },
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
  if (viewId === "class_diagram") return classDiagramTypes.has(type);
  if (viewId === "api_surface") return apiSurfaceTypes.has(type);
  if (viewId === "flows") return flowTypes.has(type);
  if (viewId === "deployment") return deploymentTypes.has(type);
  if (viewId === "data") return dataTypes.has(type);
  if (viewId === "schema_model") return schemaModelTypes.has(type);
  if (viewId === "domain") return domainTypes.has(type);
  if (viewId === "security") return securityTypes.has(type);
  if (viewId === "concerns") return concernTypes.has(type);
  if (viewId === "health") return healthTypes.has(type);
  if (viewId === "decisions") return decisionTypes.has(type);
  return true;
}

export function preferredViewForNodeType(type: NodeType): ViewId {
  if (["environment", "region", "deployment_node", "env_var"].includes(type)) return "deployment";
  if (["schema", "data_entity", "migration"].includes(type)) return "schema_model";
  if (["datastore", "replica", "queue", "cache"].includes(type)) return "data";
  if (["threat"].includes(type)) return "security";
  if (["stakeholder", "concern"].includes(type)) return "concerns";
  if (["risk", "quality_scenario"].includes(type)) return "health";
  if (["decision", "tech_choice"].includes(type)) return "decisions";
  if (["flow"].includes(type)) return "flows";
  if (["api_contract"].includes(type)) return "api_surface";
  if (["code_symbol"].includes(type)) return "class_diagram";
  if (["file_group"].includes(type)) return "code";
  if (["page"].includes(type)) return "components";
  if (["module", "component", "contract", "event_contract"].includes(type)) return "components";
  if (["worker", "scheduler", "container"].includes(type)) return "containers";
  if (["alert", "runbook"].includes(type)) return "health";
  return "overview";
}

export function validateAtlas(project: AtlasProject): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(project.nodes.map((node) => node.id));
  const nodesById = new Map(project.nodes.map((node) => [node.id, node]));
  const edgeIds = new Set<string>();

  // Duplicate node ids silently collapse in nodesById (last one wins) and the
  // export overwrites one concept file with the other -- surface them loudly,
  // symmetric to the duplicate-edge check below.
  const seenNodeIds = new Set<string>();
  for (const node of project.nodes) {
    if (seenNodeIds.has(node.id)) {
      issues.push({ severity: "error", code: "duplicate-node", message: `Duplicate node id ${node.id}.`, targetId: node.id });
    }
    seenNodeIds.add(node.id);
  }

  // Pre-bucket edges by target once: the concern-coverage and datastore-owner
  // checks below would otherwise rescan every edge per node (O(nodes x edges))
  // on every keystroke-driven validation pass.
  const edgesByTarget = new Map<string, AtlasEdge[]>();
  for (const edge of project.edges) {
    const bucket = edgesByTarget.get(edge.target);
    if (bucket) bucket.push(edge);
    else edgesByTarget.set(edge.target, [edge]);
  }

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
    if (edge.type === "has_concern") {
      const source = nodesById.get(edge.source);
      const target = nodesById.get(edge.target);
      if (source && !["stakeholder", "team", "actor"].includes(source.type)) {
        issues.push({
          severity: "warning",
          code: "invalid-has-concern-source",
          message: `${edge.id} uses has_concern from ${source.type}; use a stakeholder, team, or actor as the source.`,
          targetId: edge.id
        });
      }
      if (target && target.type !== "concern") {
        issues.push({
          severity: "warning",
          code: "invalid-has-concern-target",
          message: `${edge.id} uses has_concern toward ${target.type}; target a concern node.`,
          targetId: edge.id
        });
      }
    }
    if (edge.type === "addresses") {
      const source = nodesById.get(edge.source);
      const target = nodesById.get(edge.target);
      if (source?.type === "concern") {
        issues.push({
          severity: "warning",
          code: "concern-addresses-element",
          message: `${edge.id} has a concern addressing another element; model architecture elements as addressing concerns instead.`,
          targetId: edge.id
        });
      }
      if (target && !["concern", "quality_scenario", "risk", "threat"].includes(target.type)) {
        issues.push({
          severity: "warning",
          code: "invalid-addresses-target",
          message: `${edge.id} uses addresses toward ${target.type}; target a concern, quality scenario, risk, or threat.`,
          targetId: edge.id
        });
      }
    }
    if (!edge.label && ["risks", "mitigates", "tests"].includes(edge.type)) {
      issues.push({ severity: "info", code: "edge-needs-label", message: `${edge.type} edge ${edge.id} should describe what it means.`, targetId: edge.id });
    }
  }

  for (const concern of project.nodes.filter((node) => node.type === "concern")) {
    const addressed = (edgesByTarget.get(concern.id) ?? []).some((edge) => edge.type === "addresses");
    if (!addressed) {
      issues.push({
        severity: "warning",
        code: "concern-without-addressing-element",
        message: `${concern.name} has no architecture element addressing it.`,
        targetId: concern.id
      });
    }
  }

  const datastoreIds = new Set(project.nodes.filter((node) => ["datastore", "replica", "schema", "data_entity"].includes(node.type)).map((node) => node.id));
  for (const nodeId of datastoreIds) {
    const owned = (edgesByTarget.get(nodeId) ?? []).some((edge) => ["writes", "owns"].includes(edge.type));
    if (!owned) {
      const name = nodesById.get(nodeId)?.name ?? nodeId;
      issues.push({ severity: "warning", code: "datastore-without-owner", message: `${name} has no writer or owner edge.`, targetId: nodeId });
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

function classDiagramSnapshot(project: AtlasProject): AtlasProjectSnapshot {
  const intelligence = project.intelligence ?? emptyCodeIntelligence();
  const nodeMap = new Map<string, AtlasNode>();
  const classIdsByName = new Map<string, string>();
  const interfaceIdsByName = new Map<string, string>();
  const testFiles = testFilesByTarget(intelligence);

  for (const node of project.nodes.filter(isClassDiagramNode)) {
    nodeMap.set(node.id, structuredClone(node));
    if (node.type === "code_symbol" && typeof node.metadata?.symbolKind === "string") {
      if (node.metadata.symbolKind === "class") classIdsByName.set(node.name, node.id);
      if (["interface", "type"].includes(node.metadata.symbolKind)) interfaceIdsByName.set(node.name, node.id);
    }
  }

  for (const item of intelligence.symbols.filter((symbol) => ["interface", "type"].includes(symbol.kind)).slice(0, 80)) {
    const id = symbolNodeId(item.path, item.name);
    const node = setDiagramNode(nodeMap, {
      id,
      type: "code_symbol",
      name: item.name,
      owner: "code",
      status: "active",
      criticality: item.exported ? "high" : "medium",
      responsibilities: [`${prettySymbolKind(item.kind)} discovered in ${item.path}.`],
      dependencies: [],
      invariants: [],
      linkedFiles: [item.path],
      linkedTests: testFiles.get(item.path) ?? [],
      risks: [],
      confidence: "observed",
      notes: `${prettySymbolKind(item.kind)}${item.line ? ` at line ${item.line}` : ""}.`,
      architectureLevel: "code",
      tags: ["generated", "class-diagram", item.kind],
      metadata: {
        generatedBy: "class-diagram",
        evidencePath: item.path,
        symbolKind: item.kind,
        line: item.line,
        exported: Boolean(item.exported)
      },
      position: { x: 0, y: 0 }
    });
    interfaceIdsByName.set(item.name, node.id);
  }

  for (const item of intelligence.classes.slice(0, 120)) {
    const id = symbolNodeId(item.path, item.name);
    const node = setDiagramNode(nodeMap, {
      id,
      type: "code_symbol",
      name: item.name,
      owner: "code",
      status: "active",
      criticality: item.exported ? "high" : "medium",
      responsibilities: [`Class discovered in ${item.path}.`],
      dependencies: [item.extends, ...(item.implements ?? [])].filter(Boolean) as string[],
      invariants: [],
      linkedFiles: [item.path],
      linkedTests: testFiles.get(item.path) ?? [],
      risks: [],
      confidence: "observed",
      notes: [
        `Class${item.line ? ` at line ${item.line}` : ""}.`,
        item.extends ? `Extends ${item.extends}.` : "",
        item.implements?.length ? `Implements ${item.implements.join(", ")}.` : ""
      ].filter(Boolean).join(" "),
      architectureLevel: "code",
      tags: ["generated", "class-diagram", "class"],
      metadata: {
        generatedBy: "class-diagram",
        evidencePath: item.path,
        symbolKind: "class",
        line: item.line,
        exported: Boolean(item.exported),
        extends: item.extends,
        implements: item.implements ?? [],
        attributes: item.attributes.map(memberLabel),
        methods: item.methods.map(memberLabel)
      },
      position: { x: 0, y: 0 }
    });
    classIdsByName.set(item.name, node.id);
  }

  const nodes = Array.from(nodeMap.values());
  const nodeIds = new Set(nodes.map((node) => node.id));
  const manualEdges = project.edges.filter((edge) =>
    nodeIds.has(edge.source) &&
    nodeIds.has(edge.target) &&
    viewEdgeTypes.class_diagram?.has(edge.type)
  );
  const generatedEdges: AtlasEdge[] = [];

  for (const item of intelligence.classes.slice(0, 120)) {
    const sourceId = classIdsByName.get(item.name);
    if (!sourceId) continue;
    if (item.extends) {
      const targetId = classIdsByName.get(item.extends) ?? interfaceIdsByName.get(item.extends);
      if (targetId && targetId !== sourceId) generatedEdges.push(generatedDiagramEdge(sourceId, targetId, "depends_on", "extends", "class-diagram"));
    }
    for (const implemented of item.implements ?? []) {
      const targetId = interfaceIdsByName.get(implemented) ?? classIdsByName.get(implemented);
      if (targetId && targetId !== sourceId) generatedEdges.push(generatedDiagramEdge(sourceId, targetId, "implements", "implements", "class-diagram"));
    }
  }

  return { nodes, edges: dedupeEdges([...manualEdges, ...generatedEdges]), flows: project.flows };
}

function apiSurfaceSnapshot(project: AtlasProject): AtlasProjectSnapshot {
  const intelligence = project.intelligence ?? emptyCodeIntelligence();
  const nodeMap = new Map<string, AtlasNode>();
  const testFiles = testFilesByTarget(intelligence);

  for (const node of project.nodes.filter((item) => apiSurfaceTypes.has(item.type))) {
    nodeMap.set(node.id, structuredClone(node));
  }

  const routeIdsByKey = new Map<string, string>();
  for (const route of intelligence.routes.slice(0, 160)) {
    const id = routeNodeId(route.sourceFile, route.method, route.path);
    const mutates = !["GET", "HEAD", "OPTIONS"].includes(route.method.toUpperCase());
    const node = setDiagramNode(nodeMap, {
      id,
      type: "api_contract",
      name: `${route.method.toUpperCase()} ${route.path}`,
      owner: "code",
      status: "active",
      criticality: mutates ? "high" : "medium",
      responsibilities: [`Route discovered in ${route.sourceFile}.`],
      dependencies: [],
      invariants: [],
      linkedFiles: [route.sourceFile],
      linkedTests: testFiles.get(route.sourceFile) ?? [],
      risks: [],
      confidence: "observed",
      notes: `Discovered route${route.line ? ` at line ${route.line}` : ""}.`,
      architectureLevel: "runtime",
      tags: ["generated", "api-surface", "route"],
      metadata: {
        generatedBy: "api-surface",
        evidencePath: route.sourceFile,
        symbolKind: "route",
        routeMethod: route.method.toUpperCase(),
        routePath: route.path,
        sourceFile: route.sourceFile,
        line: route.line
      },
      position: { x: 0, y: 0 }
    });
    routeIdsByKey.set(routeConceptKey(route.method, route.path), node.id);
  }

  const nodes = Array.from(nodeMap.values());
  const nodeIds = new Set(nodes.map((node) => node.id));
  const manualEdges = project.edges.filter((edge) =>
    nodeIds.has(edge.source) &&
    nodeIds.has(edge.target) &&
    viewEdgeTypes.api_surface?.has(edge.type)
  );
  const generatedEdges: AtlasEdge[] = [];

  for (const route of intelligence.routes.slice(0, 160)) {
    const routeId = routeIdsByKey.get(routeConceptKey(route.method, route.path)) ?? routeNodeId(route.sourceFile, route.method, route.path);
    const owner = routeOwnerNode(project.nodes, route.sourceFile);
    if (owner && nodeIds.has(owner.id)) {
      generatedEdges.push(generatedDiagramEdge(owner.id, routeId, "exposes", route.method.toUpperCase(), "api-surface"));
    }
    for (const contract of matchingContractNodes(project.nodes, route)) {
      if (nodeIds.has(contract.id) && contract.id !== routeId) {
        generatedEdges.push(generatedDiagramEdge(routeId, contract.id, "implements", "matches contract", "api-surface"));
      }
    }
  }

  return { nodes, edges: dedupeEdges([...manualEdges, ...generatedEdges]), flows: project.flows };
}

function schemaModelSnapshot(project: AtlasProject): AtlasProjectSnapshot {
  const nodeMap = new Map<string, AtlasNode>();
  for (const node of project.nodes.filter((item) => schemaModelTypes.has(item.type))) {
    nodeMap.set(node.id, structuredClone(node));
  }

  const schemaNodeIdsByName = new Map<string, string>();
  for (const schema of project.intelligence.schemas ?? []) {
    const id = schemaNodeId(schema);
    const node = setDiagramNode(nodeMap, {
      id,
      type: schema.kind === "schema" ? "schema" : "data_entity",
      name: schema.name,
      owner: "code",
      status: "active",
      criticality: schema.primaryKeys.length || schema.foreignKeys.length ? "high" : "medium",
      responsibilities: [`${schema.kind === "model" ? "Model" : "Table"} discovered in ${schema.path}.`],
      dependencies: schema.relations,
      invariants: schema.primaryKeys.map((key) => `Primary key: ${key}`),
      linkedFiles: [schema.path],
      linkedTests: [],
      risks: [],
      confidence: "observed",
      notes: `${schema.kind} with ${schema.columns.length} columns/fields${schema.line ? ` at line ${schema.line}` : ""}.`,
      architectureLevel: "data",
      tags: ["generated", "schema-model", schema.kind],
      metadata: {
        generatedBy: "schema-model",
        evidencePath: schema.path,
        entityName: schema.name,
        columns: schema.columns,
        primaryKeys: schema.primaryKeys,
        indexes: schema.indexes,
        foreignKeys: schema.foreignKeys,
        relations: schema.relations
      },
      position: { x: 0, y: 0 }
    });
    schemaNodeIdsByName.set(schema.name, node.id);
  }

  for (const item of project.evidence.filter((evidence) => evidence.kind === "migration").slice(0, 80)) {
    const id = migrationNodeId(item.path);
    setDiagramNode(nodeMap, {
      id,
      type: "migration",
      name: basename(item.path),
      owner: "code",
      status: "active",
      criticality: "medium",
      responsibilities: [`Database migration evidence at ${item.path}.`],
      dependencies: [],
      invariants: [],
      linkedFiles: [item.path],
      linkedTests: [],
      risks: [],
      confidence: "observed",
      notes: item.lines ? `${item.lines} lines.` : "",
      architectureLevel: "data",
      tags: ["generated", "schema-model", "migration"],
      metadata: {
        generatedBy: "schema-model",
        evidencePath: item.path,
        evidenceKind: item.kind,
        language: item.language,
        lines: item.lines
      },
      position: { x: 0, y: 0 }
    });
  }

  const nodes = Array.from(nodeMap.values());
  const nodeIds = new Set(nodes.map((node) => node.id));
  const allowedEdges = viewEdgeTypes.schema_model;
  const edges = project.edges.filter((edge) =>
    nodeIds.has(edge.source) &&
    nodeIds.has(edge.target) &&
    (!allowedEdges || allowedEdges.has(edge.type))
  );

  const generatedEdges: AtlasEdge[] = [];
  for (const schema of project.intelligence.schemas ?? []) {
    const sourceId = schemaNodeIdsByName.get(schema.name);
    if (!sourceId) continue;
    for (const relation of schema.relations) {
      const targetName = relationTargetName(relation);
      const targetId = targetName ? schemaNodeIdsByName.get(targetName) : undefined;
      if (targetId && targetId !== sourceId) {
        generatedEdges.push(generatedDiagramEdge(sourceId, targetId, "models", relation, "schema-model"));
      }
    }
  }

  return { nodes, edges: dedupeEdges([...edges, ...generatedEdges]), flows: project.flows };
}

function isClassDiagramNode(node: AtlasNode) {
  if (!classDiagramTypes.has(node.type)) return false;
  if (node.type !== "code_symbol") return true;
  const symbolKind = typeof node.metadata?.symbolKind === "string" ? node.metadata.symbolKind : "";
  return !symbolKind || ["class", "interface", "type"].includes(symbolKind);
}

export function filterProjectForView(project: AtlasProject, viewId: ViewId): AtlasProjectSnapshot {
  if (viewId === "proposals") {
    return cloneProjectSnapshot(project);
  }

  if (viewId === "class_diagram") {
    return classDiagramSnapshot(project);
  }

  if (viewId === "api_surface") {
    return apiSurfaceSnapshot(project);
  }

  if (viewId === "schema_model") {
    return schemaModelSnapshot(project);
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
  if (viewId === "class_diagram") return generateClassMermaid(project);

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

function generateClassMermaid(project: AtlasProject): string {
  const graph = filterProjectForView(project, "class_diagram");
  const classNodes = graph.nodes.filter((node) => node.type === "code_symbol");
  const classNodeIds = new Set(classNodes.map((node) => node.id));
  const lines = ["classDiagram"];

  for (const node of classNodes) {
    const id = mermaidId(node.id);
    const metadata = node.metadata ?? {};
    const attributes = asStringList(metadata.attributes).slice(0, 12);
    const methods = asStringList(metadata.methods).slice(0, 16);
    const isInterface = ["interface", "type"].includes(String(metadata.symbolKind ?? ""));
    lines.push(`  class ${id} {`);
    if (isInterface) lines.push("    <<interface>>");
    lines.push(`    ${escapeClassMember(node.name)}`);
    for (const attribute of attributes) lines.push(`    ${escapeClassMember(attribute)}`);
    for (const method of methods) lines.push(`    ${escapeClassMember(method)}`);
    lines.push("  }");
  }

  for (const edge of graph.edges) {
    if (!classNodeIds.has(edge.source) || !classNodeIds.has(edge.target)) continue;
    const source = mermaidId(edge.source);
    const target = mermaidId(edge.target);
    if (edge.type === "implements") {
      lines.push(`  ${source} ..|> ${target} : implements`);
    } else if (edge.label === "extends") {
      lines.push(`  ${source} --|> ${target} : extends`);
    } else if (edge.type === "depends_on") {
      lines.push(`  ${source} ..> ${target} : depends`);
    }
  }

  if (lines.length === 1) lines.push("  %% Run Scan or model code_symbol nodes to populate this class diagram.");
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

// Narrative architecture document generated entirely from the typed graph, so the
// atlas fully subsumes a hand-written ARCHITECTURE.md. Mirrors the other pure
// generators above: assemble a Markdown string, group by node type/level, and reuse
// generateMermaid for the embedded system diagram so the prose and the canvas can
// never disagree about the system shape.
export function generateArchitectureDoc(project: AtlasProject): string {
  const byType = groupBy(project.nodes, (node) => node.type);
  const nodeName = new Map(project.nodes.map((node) => [node.id, node.name]));
  const ofTypes = (...types: NodeType[]): AtlasNode[] => types.flatMap((type) => byType[type] ?? []);

  const systems = ofTypes("system");
  const stakeholders = ofTypes("stakeholder");
  const concerns = ofTypes("concern");
  const services = ofTypes("container", "app", "service", "worker", "scheduler", "load_balancer");
  const externals = ofTypes("external_system");
  const contracts = ofTypes("api_contract", "event_contract", "contract");
  const pages = ofTypes("page");
  const stores = ofTypes("datastore", "replica", "queue", "cache");
  const dataModel = ofTypes("schema", "data_entity");
  const deployment = ofTypes("environment", "region", "deployment_node");
  const envVars = ofTypes("env_var");
  const techChoices = ofTypes("tech_choice");
  const decisions = ofTypes("decision");
  const risks = ofTypes("risk");
  const threats = ofTypes("threat");
  const qualityScenarios = ofTypes("quality_scenario");

  // has_concern: stakeholder/team/actor -> concern.  addresses: element -> concern.
  const concernsFor = new Map<string, string[]>();
  const addressedBy = new Map<string, string[]>();
  for (const edge of project.edges) {
    if (edge.type === "has_concern") concernsFor.set(edge.source, [...(concernsFor.get(edge.source) ?? []), edge.target]);
    if (edge.type === "addresses") addressedBy.set(edge.target, [...(addressedBy.get(edge.target) ?? []), edge.source]);
  }

  const out: string[] = [
    `# ${project.manifest.name} — Architecture`,
    "",
    "> Generated from the System Atlas pack by `generateArchitectureDoc`. Treat the typed atlas graph as the source of truth — change the authored concept files under `architecture/` (or the project's `scripts/build-*-atlas.ts` regenerator) and re-export instead of editing this file by hand.",
    "",
    project.manifest.description
  ];

  out.push("", "## System Context");
  if (systems.length) {
    for (const system of systems) {
      out.push("", `### ${system.name}`, "", `**Criticality:** ${system.criticality} · **Owner:** ${system.owner} · **Status:** ${system.status}`);
      if (system.notes?.trim()) out.push("", system.notes.trim());
      if (system.responsibilities.length) out.push("", ...system.responsibilities.map((item) => `- ${item}`));
    }
  } else {
    out.push("", "- No system-level node modeled yet.");
  }

  if (stakeholders.length || concerns.length) {
    out.push("", "## Stakeholders & Concerns");
    if (stakeholders.length) {
      out.push("", "### Stakeholders", "");
      for (const person of stakeholders) {
        const role = docMetaText(person, "role");
        const cares = (concernsFor.get(person.id) ?? []).map((id) => nodeName.get(id) ?? id);
        const detail = [role && `_${role}_`, cares.length ? `cares about ${cares.join(", ")}` : ""].filter(Boolean).join(" — ");
        out.push(`- **${person.name}**${detail ? ` — ${detail}` : ""}`);
      }
    }
    if (concerns.length) {
      out.push("", "### Concerns", "");
      for (const concern of concerns) {
        const tags = [docMetaText(concern, "category"), docMetaText(concern, "priority") && `priority ${docMetaText(concern, "priority")}`].filter(Boolean).join(", ");
        const body = concern.responsibilities[0] ?? concern.notes?.trim() ?? "";
        const addressers = (addressedBy.get(concern.id) ?? []).map((id) => nodeName.get(id) ?? id);
        out.push(`- **${concern.name}**${tags ? ` (${tags})` : ""}${body ? ` — ${body}` : ""}${addressers.length ? ` _(addressed by: ${addressers.join(", ")})_` : ""}`);
      }
    }
  }

  out.push("", "## System Diagram", "", "```mermaid", generateMermaid(project, "overview"), "```");

  out.push("", "## Services & Containers", "");
  if (services.length) {
    out.push(...mdTableLines(
      ["Name", "Type", "Criticality", "Responsibilities", "Key files"],
      services.map((node) => [node.name, titleCase(node.type), node.criticality, node.responsibilities.join("; "), node.linkedFiles.map((file) => `\`${file}\``).join(", ")])
    ));
  } else {
    out.push("- No services or containers modeled yet.");
  }

  if (externals.length) {
    out.push("", "## External Systems", "");
    for (const ext of externals) {
      const provider = docMetaText(ext, "provider");
      const parts = [ext.responsibilities.join("; "), ext.risks.length ? `_risks:_ ${ext.risks.join("; ")}` : ""].filter(Boolean).join(" · ");
      out.push(`- **${ext.name}**${provider ? ` (${provider})` : ""}${parts ? ` — ${parts}` : ""}`);
    }
  }

  if (contracts.length) {
    out.push("", "## APIs & Contracts", "");
    for (const contract of contracts) {
      const signature = [docMetaText(contract, "routeMethod"), docMetaText(contract, "routePath")].filter(Boolean).join(" ");
      const auth = docMetaText(contract, "auth") || docMetaText(contract, "authMode");
      const parts = [signature && `\`${signature}\``, auth && `auth: ${auth}`, contract.responsibilities.join("; ")].filter(Boolean).join(" · ");
      out.push(`- **${contract.name}** (${titleCase(contract.type)})${parts ? ` — ${parts}` : ""}`);
    }
  }

  if (pages.length) {
    out.push("", "## Frontend Pages", "");
    for (const page of pages) {
      const route = docMetaText(page, "route");
      const parts = [route && `route \`${route}\``, page.responsibilities.join("; ")].filter(Boolean).join(" — ");
      out.push(`- **${page.name}**${parts ? ` — ${parts}` : ""}`);
    }
  }

  out.push("", "## Data Stores", "");
  if (stores.length) {
    out.push(...mdTableLines(
      ["Store", "Type", "Owner", "Retention", "Consistency"],
      stores.map((node) => [node.name, titleCase(node.type), docMetaText(node, "dataOwner"), docMetaText(node, "retention"), docMetaText(node, "consistency")])
    ));
  } else {
    out.push("- No data stores modeled yet.");
  }
  if (dataModel.length) {
    out.push("", "### Schemas & Entities", "");
    for (const entity of dataModel) {
      const keys = docMetaList(entity, "primaryKeys");
      const parts = [entity.responsibilities.join("; "), keys.length ? `PK: ${keys.join(", ")}` : ""].filter(Boolean).join(" · ");
      out.push(`- **${entity.name}** (${titleCase(entity.type)})${parts ? ` — ${parts}` : ""}`);
    }
  }

  if (deployment.length || envVars.length) {
    out.push("", "## Deployment & Configuration", "");
    if (deployment.length) {
      for (const dep of deployment) {
        const location = [docMetaText(dep, "cloud"), docMetaText(dep, "region")].filter(Boolean).join(" / ");
        const parts = [location, dep.responsibilities.join("; ")].filter(Boolean).join(" — ");
        out.push(`- **${dep.name}** (${titleCase(dep.type)})${parts ? ` — ${parts}` : ""}`);
      }
      out.push("");
    }
    if (envVars.length) {
      out.push("### Environment Variables", "");
      out.push(...mdTableLines(
        ["Variable", "Scope", "Sensitive", "Required", "Default"],
        envVars.map((node) => [node.name, docMetaText(node, "scope"), docMetaText(node, "sensitive"), docMetaText(node, "required"), docMetaText(node, "defaultValue")])
      ));
    }
  }

  out.push("", "## Technology Stack", "");
  if (techChoices.length) {
    out.push(...mdTableLines(
      ["Technology", "Category", "Version", "Rationale"],
      techChoices.map((node) => [node.name, docMetaText(node, "category"), docMetaText(node, "version"), docMetaText(node, "rationale") || node.responsibilities.join("; ")])
    ));
    out.push("", "> This captures the load-bearing technology choices. The complete, version-pinned dependency set lives in the project's package manifests (for example `package.json`, `pyproject.toml`, or `Cargo.toml`).");
  } else {
    out.push("- No technology choices modeled yet.");
  }

  out.push("", "## Key Decisions", "");
  if (decisions.length) {
    out.push(...mdTableLines(
      ["Decision", "Status", "Rationale"],
      decisions.map((node) => [node.name, docMetaText(node, "adrStatus"), node.notes?.trim() || node.responsibilities.join("; ")])
    ));
  } else {
    out.push("- No decisions recorded yet.");
  }

  out.push("", "## Risks & Known Issues", "");
  if (risks.length) {
    out.push(...mdTableLines(
      ["Risk", "Likelihood", "Impact", "Mitigation"],
      risks.map((node) => [
        node.responsibilities.length ? `${node.name}<br>${node.responsibilities.join("; ")}` : node.name,
        docMetaText(node, "likelihood"),
        docMetaText(node, "impact"),
        docMetaText(node, "mitigation") || docMetaText(node, "mitigationOwner")
      ])
    ));
  } else {
    out.push("- No risks recorded yet.");
  }

  if (threats.length) {
    out.push("", "## Security & Threats", "");
    for (const threat of threats) {
      const mitigation = docMetaText(threat, "mitigation");
      const parts = [threat.responsibilities.join("; "), mitigation && `mitigation: ${mitigation}`].filter(Boolean).join(" · ");
      out.push(`- **${threat.name}**${parts ? ` — ${parts}` : ""}`);
    }
  }

  if (qualityScenarios.length) {
    out.push("", "## Quality Scenarios", "");
    for (const scenario of qualityScenarios) {
      const measurement = docMetaText(scenario, "measurement");
      const parts = [scenario.responsibilities.join("; "), measurement && `measured by: ${measurement}`].filter(Boolean).join(" · ");
      out.push(`- **${scenario.name}**${parts ? ` — ${parts}` : ""}`);
    }
  }

  out.push("", "## Flows", "");
  if (project.flows.length) {
    for (const flow of project.flows) {
      out.push(`### ${flow.name}`, "", `**Criticality:** ${flow.criticality}`, "", flow.description || "_No description._");
      if (flow.steps.length) {
        out.push("", "Steps:", "");
        flow.steps.forEach((step, index) => {
          const target = step.nodeId ? ` _(${nodeName.get(step.nodeId) ?? step.nodeId})_` : "";
          out.push(`${index + 1}. ${step.label}${target}`);
        });
      }
      if (flow.failureModes.length) out.push("", "Failure modes:", "", ...flow.failureModes.map((item) => `- ${item}`));
      if (flow.acceptanceChecks.length) out.push("", "Acceptance checks:", "", ...flow.acceptanceChecks.map((item) => `- ${item}`));
      out.push("");
    }
  } else {
    out.push("- No flows recorded yet.");
  }

  out.push(
    "",
    "---",
    "",
    "_Generated by System Atlas. See `architecture/generated/overview.md` for a compact summary, `architecture/generated/atlas.json` for the full typed graph, and `architecture/generated/diagrams/` for per-view Mermaid sources._"
  );

  return out.join("\n");
}

function mdTableLines(headers: string[], rows: string[][]): string[] {
  const headerLine = `| ${headers.join(" | ")} |`;
  const dividerLine = `| ${headers.map(() => "---").join(" | ")} |`;
  return [headerLine, dividerLine, ...rows.map((row) => `| ${row.map(mdCell).join(" | ")} |`)];
}

function mdCell(value: string): string {
  // Escape the characters that break a Markdown table cell: a literal `|` ends
  // the column and an unbalanced backtick opens a code span that swallows the
  // rest of the row.
  const collapsed = (value ?? "").replace(/\r?\n/g, "<br>").replace(/[|`]/g, (char) => `\\${char}`).trim();
  return collapsed || "—";
}

function docMetaText(node: AtlasNode, key: string): string {
  const value = node.metadata?.[key];
  if (value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

function docMetaList(node: AtlasNode, key: string): string[] {
  const value = node.metadata?.[key];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
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
  const hasClassModel = project.intelligence.classes.length > 0 || project.nodes.some((node) => node.type === "code_symbol" && node.metadata?.symbolKind === "class");
  const hasApiSurface = project.intelligence.routes.length > 0 || project.nodes.some((node) => node.type === "api_contract");
  const hasDeployment = hasAny(nodesByType, ["environment", "region", "deployment_node"]);
  const hasDataModel = hasAny(nodesByType, ["datastore", "schema", "data_entity"]);
  const hasSchemaDetail = project.nodes.some((node) =>
    ["schema", "data_entity"].includes(node.type) &&
    (hasListMetadata(node, "columns") || hasListMetadata(node, "tables") || hasListMetadata(node, "relations") || hasListMetadata(node, "indexes"))
  );
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
      label: "Class model",
      status: hasClassModel ? "ok" : "warn",
      detail: "Persisted class/interface facts show attributes, methods, inheritance, and linked files."
    },
    {
      label: "Runtime scenarios",
      status: hasRuntimeModel ? "ok" : "missing",
      detail: "Important flows or use cases explain dynamic behavior and failure paths."
    },
    {
      label: "API surface",
      status: hasApiSurface ? "ok" : "warn",
      detail: "API routes, contracts, auth expectations, and tests are explicit instead of buried in handlers."
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
      label: "Database schema model",
      status: hasSchemaDetail ? "ok" : "warn",
      detail: "Tables/entities, columns, keys, indexes, constraints, relations, and migration policy are modeled."
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
  // Expand the FULL neighborhood first, rank, and only then trim to budget.
  // Slicing edges before expansion made node selection depend on unordered
  // edge-array position: nodes reachable only via a late edge silently fell
  // out of the AI context pack.
  const touchingEdges = project.edges.filter((edge) => targetSet.has(edge.source) || targetSet.has(edge.target));
  const relatedNodeIds = new Set([...targetSet, ...touchingEdges.flatMap((edge) => [edge.source, edge.target])]);
  const relatedNodes = rankedContextNodes(project.nodes.filter((node) => relatedNodeIds.has(node.id))).slice(0, budget.maxNodes);
  const keptNodeIds = new Set(relatedNodes.map((node) => node.id));
  const keptEdges = touchingEdges
    .filter((edge) => keptNodeIds.has(edge.source) && keptNodeIds.has(edge.target))
    .slice(0, budget.maxEdges);
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
    `- Edges: ${keptEdges.length}/${touchingEdges.length}`,
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
  const affectedIdSet = new Set(affectedIds);
  const affectedNodes = [
    ...after.nodes.filter((node) => affectedIdSet.has(node.id)),
    // Removed nodes exist only in `before` -- their invariants, risks, and
    // linked files are exactly what an agent needs to remove them safely.
    ...diff.removedNodes
  ];
  const affectedFiles = unique(affectedNodes.flatMap((node) => node.linkedFiles));
  const affectedEvidence = project.evidence
    .filter((item) =>
      affectedFiles.some((file) => item.path === file || item.path.startsWith(`${file}/`)) ||
      item.linkedNodeIds?.some((nodeId) => affectedIdSet.has(nodeId))
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
    `- Changed flows: ${diff.changedFlows.map((item) => `${(item.after ?? item.before)?.name ?? "unknown"} (${item.changes.join(", ")})`).join("; ") || "none"}`,
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

export function promoteGeneratedNode(project: AtlasProject, generatedNode: AtlasNode, owner = "architecture"): AtlasProject {
  const existingNode = project.nodes.find((node) => node.id === generatedNode.id);
  if (existingNode && !isGeneratedAtlasNode(existingNode)) return project;

  const metadata = { ...(generatedNode.metadata ?? {}) };
  const promotedFrom = typeof metadata.generatedBy === "string" ? metadata.generatedBy : "generated-view";
  delete metadata.generatedBy;

  const promotedNode: AtlasNode = {
    ...structuredClone(generatedNode),
    owner,
    status: "active",
    confidence: "manual",
    tags: unique([...(generatedNode.tags ?? []).filter((tag) => tag !== "generated"), "promoted"]),
    metadata: {
      ...metadata,
      promotedFrom,
      promotedAt: nowIso()
    }
  };

  const linkedNodeId = promotedNode.id;
  const evidence = project.evidence.map((item) => {
    if (!promotedNode.linkedFiles.some((file) => item.path === file || item.path.startsWith(`${file}/`))) return item;
    return { ...item, linkedNodeIds: unique([...(item.linkedNodeIds ?? []), linkedNodeId]) };
  });

  return {
    ...project,
    nodes: existingNode
      ? project.nodes.map((node) => node.id === promotedNode.id ? promotedNode : node)
      : [...project.nodes, promotedNode],
    evidence
  };
}

export function generateImportCandidates(project: AtlasProject): ImportCandidate[] {
  const sourceViews: Array<{ viewId: ViewId; max: number }> = [
    { viewId: "class_diagram", max: 120 },
    { viewId: "api_surface", max: 160 },
    { viewId: "schema_model", max: 160 },
    { viewId: "code", max: 80 }
  ];
  const durableKeys = new Set(project.nodes.filter((node) => !isGeneratedAtlasNode(node)).map(importConceptKey));
  const seenKeys = new Set<string>();
  const candidates: ImportCandidate[] = [];

  for (const { viewId, max } of sourceViews) {
    for (const node of layoutProjectForView(project, viewId).nodes.slice(0, max)) {
      if (!isGeneratedAtlasNode(node)) continue;
      if (!importCandidateGroup(node)) continue;
      const key = importConceptKey(node);
      if (durableKeys.has(key) || seenKeys.has(key)) continue;
      seenKeys.add(key);
      candidates.push(importCandidateFromNode(node, viewId));
    }
  }

  return candidates.sort((left, right) => importCandidateScore(right) - importCandidateScore(left) || left.title.localeCompare(right.title));
}

export function promoteImportCandidates(project: AtlasProject, candidates: ImportCandidate[]): AtlasProject {
  if (candidates.length === 0) return project;
  let next = candidates.reduce((current, candidate) => promoteGeneratedNode(current, candidate.node), project);
  const promotedIds = new Set(candidates.map((candidate) => candidate.node.id));
  const nextNodeIds = new Set(next.nodes.map((node) => node.id));
  const sourceViews = unique(candidates.map((candidate) => candidate.viewId));
  const promotedEdges: AtlasEdge[] = [];

  for (const viewId of sourceViews) {
    for (const edge of layoutProjectForView(project, viewId).edges) {
      if (!edge.tags?.some((tag) => tag.startsWith("generated:"))) continue;
      if (!nextNodeIds.has(edge.source) || !nextNodeIds.has(edge.target)) continue;
      if (!promotedIds.has(edge.source) && !promotedIds.has(edge.target)) continue;
      promotedEdges.push({
        ...edge,
        id: `import.${edge.source}.${edge.type}.${edge.target}.${slug(edge.label ?? "")}`,
        tags: unique([...(edge.tags ?? []).filter((tag) => !tag.startsWith("generated:")), "promoted", "import-review"])
      });
    }
  }

  const promotedEdgeKeys = new Set(promotedEdges.map(edgeKey));
  const durableEdgeKeys = new Set(next.edges.filter((edge) => !edge.tags?.some((tag) => tag.startsWith("generated:"))).map(edgeKey));
  const newEdges = promotedEdges.filter((edge) => !durableEdgeKeys.has(edgeKey(edge)));
  if (newEdges.length === 0) return next;

  return {
    ...next,
    edges: [
      ...next.edges.filter((edge) => !(edge.tags?.some((tag) => tag.startsWith("generated:")) && promotedEdgeKeys.has(edgeKey(edge)))),
      ...dedupeEdges(newEdges)
    ]
  };
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
    return fieldFingerprint(previous[key]) !== fieldFingerprint(next[key]);
  });
}

// Order-insensitive comparison key. enrichDiagramNode and layout passes reorder
// array fields like tags, so a plain JSON.stringify reported phantom "changed"
// entries in semanticDiff and polluted migration briefs after every layout pass.
function fieldFingerprint(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => JSON.stringify(item)).sort());
  }
  return JSON.stringify(value) ?? "undefined";
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

// Make an arbitrary node/edge label safe inside a Mermaid flowchart `["..."]`
// node or `|"..."|` edge label. A real newline breaks the line-based output;
// the structural delimiters `" < > | [ ]` would otherwise corrupt the diagram
// (the product tracks this as threat.mermaid_injection). HTML entities render
// correctly in Mermaid's default htmlLabels mode while keeping the syntax valid.
function escapeMermaid(value: string) {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\|/g, "&#124;")
    .replace(/\[/g, "&#91;")
    .replace(/\]/g, "&#93;");
}

// classDiagram member lines are more restrictive: `{}` close the class body and
// `<>` are read as generic delimiters. Convert `<>` to Mermaid's own generic
// syntax (`~`) so `Map<string, Node>` renders as `Map~string, Node~`.
function escapeClassMember(value: string) {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/[{}]/g, "")
    .replace(/</g, "~")
    .replace(/>/g, "~")
    .replace(/\|/g, "/")
    .replace(/"/g, "'");
}

function asStringList(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) return [value];
  return [];
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

function routeNodeId(filePath: string, method: string, routePath: string) {
  return `api.route.${slug(filePath)}.${slug(method)}.${slug(routePath)}`;
}

function migrationNodeId(filePath: string) {
  return `schema.migration.${slug(filePath)}`;
}

function schemaNodeId(schema: CodeSchema) {
  return `schema.entity.${slug(schema.path)}.${slug(schema.name)}`;
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

function generatedDiagramEdge(source: string, target: string, type: EdgeType, label: string, view: string): AtlasEdge {
  return {
    id: `${source}-${type}-${target}-${slug(label)}`,
    source,
    target,
    type,
    label,
    tags: [`generated:${view}`]
  };
}

function setDiagramNode(nodeMap: Map<string, AtlasNode>, derived: AtlasNode) {
  const existing = nodeMap.get(derived.id) ?? semanticallyEquivalentNode(nodeMap, derived);
  const node = enrichDiagramNode(existing, derived);
  nodeMap.set(node.id, node);
  if (node.id !== derived.id && nodeMap.has(derived.id)) nodeMap.delete(derived.id);
  return node;
}

function semanticallyEquivalentNode(nodeMap: Map<string, AtlasNode>, derived: AtlasNode) {
  const key = importConceptKey(derived);
  return Array.from(nodeMap.values()).find((node) => importConceptKey(node) === key);
}

function isGeneratedAtlasNode(node: AtlasNode) {
  return Boolean(
    typeof node.metadata?.generatedBy === "string" ||
    node.tags?.includes("generated")
  );
}

function importCandidateFromNode(node: AtlasNode, viewId: ViewId): ImportCandidate {
  const group = importCandidateGroup(node) ?? "file";
  const sourcePath = typeof node.metadata?.evidencePath === "string" ? node.metadata.evidencePath : node.linkedFiles[0];
  return {
    id: `${group}:${node.id}`,
    group,
    title: node.name,
    subtitle: [prettyNodeType(node.type), sourcePath, node.linkedTests.length ? `${node.linkedTests.length} tests` : ""].filter(Boolean).join(" · "),
    summary: node.responsibilities[0] || node.notes || "Suggested from saved code intelligence.",
    sourcePath,
    viewId,
    node
  };
}

function importCandidateGroup(node: AtlasNode): ImportCandidate["group"] | undefined {
  if (node.type === "api_contract") return "route";
  if (node.type === "schema" || node.type === "data_entity") return "schema";
  if (node.type === "migration") return "migration";
  if (node.type === "file_group") return "file";
  if (node.type === "code_symbol") {
    const symbolKind = typeof node.metadata?.symbolKind === "string" ? node.metadata.symbolKind : "";
    if (["class", "interface", "type"].includes(symbolKind)) return "class";
    if (symbolKind === "route") return "route";
    if (node.linkedFiles.length > 0) return "class";
  }
  return undefined;
}

function importConceptKey(node: AtlasNode) {
  const group = importCandidateGroup(node) ?? node.type;
  const sourcePath = typeof node.metadata?.evidencePath === "string" ? node.metadata.evidencePath : node.linkedFiles[0] ?? "";
  if (group === "route") {
    const route = routePartsFromNode(node);
    return routeConceptKey(route.method, route.path);
  }
  if (group === "class") return `class:${sourcePath}:${node.name}`.toLowerCase();
  if (group === "schema") {
    const entityName = typeof node.metadata?.entityName === "string"
      ? node.metadata.entityName
      : typeof node.metadata?.schemaName === "string"
        ? node.metadata.schemaName
        : node.name;
    return `schema:${sourcePath}:${entityName}`.toLowerCase();
  }
  if (group === "migration") return `migration:${sourcePath}`.toLowerCase();
  if (group === "file") return `file:${sourcePath}`.toLowerCase();
  return `${group}:${node.type}:${sourcePath}:${node.name}`.toLowerCase();
}

function importCandidateScore(candidate: ImportCandidate) {
  const criticalityScore: Record<Criticality, number> = { low: 0, medium: 2, high: 5, critical: 8 };
  const groupScore: Record<ImportCandidate["group"], number> = {
    route: 8,
    schema: 8,
    class: 6,
    migration: 5,
    file: 2
  };
  return groupScore[candidate.group] +
    criticalityScore[candidate.node.criticality] +
    candidate.node.linkedTests.length +
    candidate.node.invariants.length +
    candidate.node.risks.length;
}

function edgeKey(edge: Pick<AtlasEdge, "source" | "target" | "type" | "label">) {
  return `${edge.source}:${edge.type}:${edge.target}:${edge.label ?? ""}`;
}

function routeConceptKey(method: string, routePath: string) {
  return `route:${method.toUpperCase()}:${routePath}`.toLowerCase();
}

function routePartsFromNode(node: AtlasNode) {
  const method = typeof node.metadata?.routeMethod === "string" ? node.metadata.routeMethod : "";
  const routePath = typeof node.metadata?.routePath === "string" ? node.metadata.routePath : "";
  if (method && routePath) return { method, path: routePath };
  const match = node.name.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|ALL|USE)\s+(.+)$/i);
  return {
    method: match?.[1] ?? "",
    path: match?.[2] ?? node.name
  };
}

function prettyNodeType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function enrichDiagramNode(existing: AtlasNode | undefined, derived: AtlasNode): AtlasNode {
  if (!existing) return derived;
  return {
    ...structuredClone(existing),
    responsibilities: existing.responsibilities.length ? existing.responsibilities : derived.responsibilities,
    dependencies: unique([...existing.dependencies, ...derived.dependencies]),
    linkedFiles: unique([...existing.linkedFiles, ...derived.linkedFiles]),
    linkedTests: unique([...existing.linkedTests, ...derived.linkedTests]),
    tags: unique([...(existing.tags ?? []), ...(derived.tags ?? [])]),
    notes: existing.notes?.trim() ? existing.notes : derived.notes,
    confidence: existing.confidence === "manual" ? existing.confidence : derived.confidence,
    architectureLevel: existing.architectureLevel ?? derived.architectureLevel,
    metadata: {
      ...derived.metadata,
      ...(existing.metadata ?? {})
    }
  };
}

function testFilesByTarget(intelligence: CodeIntelligence) {
  const byTarget = new Map<string, string[]>();
  for (const entry of intelligence.testMap) {
    for (const target of entry.targetFiles) {
      byTarget.set(target, unique([...(byTarget.get(target) ?? []), entry.testFile]));
    }
  }
  return byTarget;
}

function memberLabel(member: { name: string; visibility?: string; type?: string; parameters?: string[]; returnType?: string }) {
  const prefix = member.visibility && member.visibility !== "public" ? `${member.visibility} ` : "";
  const params = member.parameters?.length ? `(${member.parameters.join(", ")})` : member.returnType !== undefined ? "()" : "";
  const type = member.returnType ?? member.type;
  return `${prefix}${member.name}${params}${type ? `: ${type}` : ""}`;
}

function routeOwnerNode(nodes: AtlasNode[], filePath: string) {
  const candidates = nodes.filter((node) => ["service", "app", "container", "module", "component"].includes(node.type));
  return candidates.find((node) => node.linkedFiles.some((file) => pathMatches(filePath, file)));
}

function matchingContractNodes(nodes: AtlasNode[], route: { method: string; path: string; sourceFile: string }) {
  return nodes.filter((node) => {
    if (!["api_contract", "contract"].includes(node.type)) return false;
    const metadata = node.metadata ?? {};
    const method = String(metadata.routeMethod ?? metadata.method ?? "").toUpperCase();
    const path = String(metadata.routePath ?? metadata.path ?? metadata.endpoint ?? "");
    if (method && method !== route.method.toUpperCase()) return false;
    if (path && path === route.path) return true;
    if (node.name.includes(route.path)) return true;
    return node.linkedFiles.some((file) => pathMatches(route.sourceFile, file));
  });
}

function pathMatches(filePath: string, candidate: string) {
  return filePath === candidate || filePath.startsWith(`${candidate.replace(/\/$/, "")}/`);
}

function relationTargetName(relation: string) {
  const arrowTarget = relation.match(/->\s*([A-Za-z_][\w.]*)/);
  if (arrowTarget?.[1]) return arrowTarget[1].split(".")[0];
  const words = relation.match(/\b[A-Z][A-Za-z0-9_]*\b/g);
  return words?.at(-1);
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
  const schemas = intelligence.schemas.filter((item) => fileSet.has(item.path)).slice(0, limit);
  const dependencies = intelligence.dependencies.filter((item) => fileSet.has(item.source) || fileSet.has(item.target)).slice(0, limit);
  const tests = intelligence.testMap.filter((item) => fileSet.has(item.testFile) || item.targetFiles.some((target) => fileSet.has(target))).slice(0, limit);
  const symbols = intelligence.symbols.filter((item) => fileSet.has(item.path) && item.kind !== "method").slice(0, limit);

  return [
    ...classes.map((item) => `- class ${item.name} in ${item.path}: ${item.attributes.length} attrs, ${item.methods.length} methods${item.extends ? `, extends ${item.extends}` : ""}`),
    ...routes.map((item) => `- route ${item.method} ${item.path} in ${item.sourceFile}${item.line ? `:${item.line}` : ""}`),
    ...schemas.map((item) => `- schema ${item.name} in ${item.path}: ${item.columns.length} columns, ${item.primaryKeys.length} primary keys, ${item.relations.length} relations`),
    ...symbols.map((item) => `- symbol ${item.kind} ${item.name} in ${item.path}${item.line ? `:${item.line}` : ""}`),
    ...dependencies.map((item) => `- dependency ${item.source} -> ${item.target} (${item.kind})`),
    ...tests.map((item) => `- test ${item.testFile} covers ${item.targetFiles.join(", ") || "unknown targets"}`)
  ].slice(0, limit * 4);
}

function hasAny(groups: Record<string, AtlasNode[]>, types: string[]) {
  return types.some((type) => (groups[type]?.length ?? 0) > 0);
}

function hasListMetadata(node: AtlasNode, key: string) {
  const value = node.metadata?.[key];
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
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
  if (["component", "module", "contract", "api_contract", "event_contract", "page"].includes(type)) return "component" as const;
  if (["code_symbol", "file_group"].includes(type)) return "code" as const;
  if (type === "env_var") return "deployment" as const;
  if (type === "tech_choice") return "domain" as const;
  if (["alert", "runbook"].includes(type)) return "quality" as const;
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
