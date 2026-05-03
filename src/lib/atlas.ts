import {
  AtlasEdge,
  AtlasFlow,
  AtlasNode,
  AtlasProject,
  AtlasProjectSnapshot,
  AtlasProposal,
  CodeEvidence,
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

const overviewTypes = new Set<NodeType>(["actor", "system", "app", "container", "service", "external_system", "team", "load_balancer"]);
const containerTypes = new Set<NodeType>(["system", "container", "app", "service", "worker", "scheduler", "load_balancer", "external_system", "api_contract", "event_contract"]);
const codeTypes = new Set<NodeType>(["component", "module", "code_symbol", "file_group", "contract", "api_contract", "event_contract"]);
const deploymentTypes = new Set<NodeType>(["environment", "region", "deployment_node", "load_balancer", "service", "worker", "scheduler", "datastore", "replica", "queue", "cache", "external_system"]);
const dataTypes = new Set<NodeType>(["service", "module", "worker", "datastore", "replica", "queue", "cache", "external_system", "contract", "api_contract", "event_contract", "data_entity", "schema", "migration"]);
const domainTypes = new Set<NodeType>(["system", "container", "component", "module", "data_entity", "schema", "api_contract", "event_contract", "decision", "team"]);
const securityTypes = new Set<NodeType>(["actor", "app", "service", "external_system", "api_contract", "event_contract", "datastore", "data_entity", "threat", "risk"]);
const healthTypes = new Set<NodeType>(["quality_scenario", "service", "worker", "scheduler", "load_balancer", "queue", "datastore", "replica", "cache", "external_system", "risk", "threat", "decision"]);
const decisionTypes = new Set<NodeType>(["decision", "quality_scenario", "risk", "threat", "system", "container", "service", "component", "module"]);
const flowTypes = new Set<NodeType>(["actor", "app", "load_balancer", "service", "container", "component", "module", "contract", "api_contract", "event_contract", "queue", "worker", "scheduler", "datastore", "external_system", "flow"]);

const viewEdgeTypes: Partial<Record<ViewId, Set<EdgeType>>> = {
  overview: new Set(["contains", "calls", "routes_to", "depends_on", "owns"]),
  containers: new Set(["contains", "calls", "routes_to", "exposes", "publishes", "subscribes_to", "depends_on", "deploys_to"]),
  components: new Set(["contains", "calls", "depends_on", "implements", "routes_to", "exposes", "models"]),
  code: new Set(["contains", "implements", "tests", "depends_on", "traces_to", "models"]),
  flows: new Set(["calls", "routes_to", "emits", "consumes", "publishes", "subscribes_to", "reads", "writes", "tests", "authenticates", "authorizes"]),
  deployment: new Set(["contains", "deploys_to", "routes_to", "replicates_to", "depends_on", "calls"]),
  data: new Set(["reads", "writes", "owns", "replicates_to", "emits", "consumes", "publishes", "subscribes_to", "models"]),
  domain: new Set(["contains", "owns", "models", "publishes", "subscribes_to", "implements", "decides"]),
  security: new Set(["authenticates", "authorizes", "protects", "threatens", "mitigates", "risks", "calls", "reads", "writes"]),
  health: new Set(["risks", "mitigates", "tests", "depends_on", "calls", "protects", "threatens", "decides"]),
  decisions: new Set(["decides", "supersedes", "mitigates", "risks", "traces_to", "depends_on"]),
  proposals: new Set(EDGE_TYPES)
};

export function cloneProjectSnapshot(project: AtlasProject): AtlasProjectSnapshot {
  return {
    nodes: structuredClone(project.nodes),
    edges: structuredClone(project.edges),
    flows: structuredClone(project.flows)
  };
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
    evidence: []
  };
}

export function defaultViews() {
  return [
    { id: "overview" as const, name: "Context", family: "c4", concern: "System boundary", scope: "system", description: "C4-style system boundary, actors, client surfaces, owned systems, teams, and external dependencies." },
    { id: "containers" as const, name: "Containers", family: "c4", concern: "Runtime building blocks", scope: "container", description: "Apps, services, workers, schedulers, load balancers, contracts, and external dependencies." },
    { id: "components" as const, name: "Components", family: "c4", concern: "Internal building blocks", scope: "component", description: "Services, modules, components, contracts, and their implementation relationships." },
    { id: "code" as const, name: "Code", family: "c4", concern: "Source structure", scope: "code", description: "Files, packages, code symbols, contracts, linked tests, and implementation evidence." },
    { id: "flows" as const, name: "Flows", family: "behavior", concern: "Runtime behavior", scope: "scenario", description: "Critical user and system journeys, traces, failure modes, and acceptance checks." },
    { id: "deployment" as const, name: "Deployment", family: "platform", concern: "Physical/runtime topology", scope: "environment", description: "Environments, regions, deployment nodes, replicas, routing, and operational topology." },
    { id: "data" as const, name: "Data", family: "platform", concern: "Data ownership", scope: "data", description: "Entities, schemas, stores, queues, caches, ownership, read/write paths, replicas, and retention-sensitive paths." },
    { id: "domain" as const, name: "Domain", family: "domain", concern: "Domain model", scope: "bounded-context", description: "Bounded contexts, domain entities, contracts, events, teams, and model ownership." },
    { id: "security" as const, name: "Security", family: "assurance", concern: "Trust and threats", scope: "trust-boundary", description: "Trust boundaries, authentication, authorization, threats, mitigations, sensitive data, and controls." },
    { id: "health" as const, name: "Health", family: "assurance", concern: "Quality and reliability", scope: "quality", description: "Risks, quality scenarios, reliability concerns, stale architecture, regression exposure, and test gaps." },
    { id: "decisions" as const, name: "Decisions", family: "assurance", concern: "Architecture rationale", scope: "governance", description: "ADRs, superseded decisions, tradeoffs, quality scenarios, risks, and rationale links." },
    { id: "proposals" as const, name: "Proposals", family: "assurance", concern: "Change planning", scope: "proposal", description: "Architecture change proposals, before/after impact, migration briefs, and acceptance checks." }
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
    criticality: type === "risk" ? "high" : "medium",
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
    before: snapshot,
    after: structuredClone(snapshot),
    forbiddenChanges: ["Do not weaken existing invariants without explicit architecture approval."],
    acceptanceChecks: ["All affected flows retain acceptance coverage.", "Architecture export and validation pass."],
    createdAt: nowIso()
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
  if (viewId === "health") return healthTypes.has(type);
  if (viewId === "decisions") return decisionTypes.has(type);
  return true;
}

export function preferredViewForNodeType(type: NodeType): ViewId {
  if (["environment", "region", "deployment_node"].includes(type)) return "deployment";
  if (["datastore", "replica", "queue", "cache", "data_entity", "schema", "migration"].includes(type)) return "data";
  if (["threat"].includes(type)) return "security";
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

export function generateContextPack(project: AtlasProject, targetIds: string[] = [], goal = "Implement the next architecture-safe change."): string {
  const targets = targetIds.length
    ? project.nodes.filter((node) => targetIds.includes(node.id))
    : project.nodes.filter((node) => node.criticality === "critical" || node.criticality === "high").slice(0, 8);
  const targetSet = new Set(targets.map((node) => node.id));
  const relatedEdges = project.edges.filter((edge) => targetSet.has(edge.source) || targetSet.has(edge.target));
  const relatedNodeIds = new Set([...targetSet, ...relatedEdges.flatMap((edge) => [edge.source, edge.target])]);
  const relatedNodes = project.nodes.filter((node) => relatedNodeIds.has(node.id));
  const invariants = unique(relatedNodes.flatMap((node) => node.invariants));
  const risks = unique(relatedNodes.flatMap((node) => node.risks));
  const files = unique(relatedNodes.flatMap((node) => node.linkedFiles));
  const tests = unique(relatedNodes.flatMap((node) => node.linkedTests));
  const evidence = project.evidence
    .filter((item) =>
      files.some((file) => item.path === file || item.path.startsWith(`${file}/`)) ||
      item.linkedNodeIds?.some((nodeId) => relatedNodeIds.has(nodeId))
    )
    .slice(0, 25);

  return [
    `# AI Context Pack: ${project.manifest.name}`,
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
    ...(relatedEdges.length ? relatedEdges.map((edge) => `- ${edge.source} ${edge.type} ${edge.target}`) : ["- None selected."]),
    "",
    "## Invariants",
    "",
    ...(invariants.length ? invariants.map((item) => `- ${item}`) : ["- No invariants recorded for selected scope."]),
    "",
    "## Risks",
    "",
    ...(risks.length ? risks.map((item) => `- ${item}`) : ["- No risks recorded for selected scope."]),
    "",
    "## Linked Files",
    "",
    ...(files.length ? files.map((item) => `- ${item}`) : ["- No linked files yet."]),
    "",
    "## Code Evidence",
    "",
    ...(evidence.length ? evidence.flatMap(codeEvidenceLines) : ["- No scanned code evidence linked to this scope."]),
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

export function mergeCodeEvidence(project: AtlasProject, evidence: CodeEvidence[]): AtlasProject {
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
    nodes: [...manualNodes, ...nodes],
    edges: [...manualEdges, ...dedupeEdges(edges)]
  };
}

export function updateProposalAfter(project: AtlasProject, proposalId?: string): AtlasProject {
  if (!proposalId) return project;
  return {
    ...project,
    proposals: project.proposals.map((proposal) =>
      proposal.id === proposalId ? { ...proposal, after: cloneProjectSnapshot(project) } : proposal
    )
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
  if (viewId === "overview") {
    if (node.type === "actor") return 0;
    if (["system", "team"].includes(node.type)) return 1;
    if (["app", "container"].includes(node.type)) return 2;
    if (["load_balancer", "service"].includes(node.type)) return 3;
    return 4;
  }

  if (viewId === "containers") {
    if (["system", "actor", "team"].includes(node.type)) return 0;
    if (["app", "container", "load_balancer"].includes(node.type)) return 1;
    if (["service", "worker", "scheduler"].includes(node.type)) return 2;
    if (["api_contract", "event_contract"].includes(node.type)) return 3;
    return 3;
  }

  if (viewId === "components") {
    if (node.type === "file_group") return 0;
    if (["container", "app", "load_balancer"].includes(node.type)) return 1;
    if (["service", "worker", "scheduler", "external_system"].includes(node.type)) return 2;
    if (["module", "component"].includes(node.type)) return 3;
    if (["contract", "api_contract", "event_contract"].includes(node.type)) return 4;
    return 5;
  }

  if (viewId === "code") {
    if (node.type === "file_group") return 0;
    if (["module", "component"].includes(node.type)) return 1;
    if (node.type === "code_symbol") return 2;
    if (["contract", "api_contract", "event_contract"].includes(node.type)) return 3;
    return 4;
  }

  if (viewId === "flows") {
    if (["actor", "app"].includes(node.type)) return 0;
    if (["container", "load_balancer", "service"].includes(node.type)) return 1;
    if (["component", "module", "contract", "api_contract", "event_contract"].includes(node.type)) return 2;
    if (["queue", "worker", "scheduler"].includes(node.type)) return 3;
    return 4;
  }

  if (viewId === "deployment") {
    if (node.type === "environment") return 0;
    if (node.type === "region") return 1;
    if (node.type === "deployment_node") return 2;
    if (["load_balancer", "service", "worker", "scheduler"].includes(node.type)) return 3;
    if (["queue", "cache", "datastore", "replica"].includes(node.type)) return 4;
    return 5;
  }

  if (viewId === "data") {
    if (["service", "module", "worker", "external_system", "contract"].includes(node.type)) return 0;
    if (["queue", "cache"].includes(node.type)) return 1;
    if (["data_entity", "schema"].includes(node.type)) return 2;
    if (node.type === "datastore") return 3;
    if (node.type === "replica") return 4;
    if (node.type === "migration") return 5;
    return 6;
  }

  if (viewId === "domain") {
    if (["team", "system"].includes(node.type)) return 0;
    if (["container", "component", "module"].includes(node.type)) return 1;
    if (["data_entity", "schema"].includes(node.type)) return 2;
    if (["api_contract", "event_contract"].includes(node.type)) return 3;
    if (node.type === "decision") return 4;
    return 4;
  }

  if (viewId === "security") {
    if (["actor", "threat"].includes(node.type)) return 0;
    if (["app", "service", "external_system"].includes(node.type)) return 1;
    if (["api_contract", "event_contract"].includes(node.type)) return 2;
    if (["datastore", "data_entity"].includes(node.type)) return 3;
    if (["risk"].includes(node.type)) return 4;
    return 5;
  }

  if (viewId === "health") {
    if (["risk", "threat", "quality_scenario"].includes(node.type)) return 0;
    if (["external_system", "load_balancer", "queue", "cache"].includes(node.type)) return 1;
    if (["service", "worker", "scheduler"].includes(node.type)) return 2;
    if (["datastore", "replica"].includes(node.type)) return 3;
    return 4;
  }

  if (viewId === "decisions") {
    if (node.type === "decision") return 0;
    if (["quality_scenario", "risk", "threat"].includes(node.type)) return 1;
    if (["system", "container", "service"].includes(node.type)) return 2;
    if (["component", "module"].includes(node.type)) return 3;
    return 4;
  }

  return 0;
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
  if (["team"].includes(type)) return "enterprise" as const;
  if (["system", "actor", "external_system"].includes(type)) return "system" as const;
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
