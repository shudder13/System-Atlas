import { AtlasProject, AtlasTemplate } from "../types";
import { defaultViews, nowIso } from "../lib/atlas";

const baseManifest = (name: string) => ({
  schemaVersion: 1,
  name,
  description: "",
  owner: "architecture",
  updatedAt: nowIso()
});

export const templates: AtlasTemplate[] = [
  {
    id: "generic-service-system",
    name: "Generic Service System",
    description: "A rich generic map with components, flows, data, health, contracts, and change risk.",
    project: {
      manifest: baseManifest("Generic Service System"),
      nodes: [
        node("actor.user", "actor", "User", 40, 80, ["Starts a user-facing workflow."], "medium"),
        node("app.client", "app", "Client App", 260, 80, ["Presents the user interface and calls backend APIs."], "high", ["src/app"]),
        node("lb.public", "load_balancer", "Load Balancer", 480, 80, ["Routes traffic to the API service."], "high"),
        node("service.api", "service", "API Service", 700, 80, ["Owns request handling, authentication boundaries, and orchestration."], "critical", ["src/api"], ["tests/api"]),
        node("service.auth", "service", "Auth Service", 700, 250, ["Issues sessions, validates identity, and protects trust boundaries."], "critical", ["src/auth"], ["tests/auth"]),
        node("module.core", "module", "Core Domain Module", 960, 80, ["Owns the main business rules for this system."], "critical", ["src/modules/core"], ["tests/core"]),
        node("contract.public_api", "contract", "Public API Contract", 960, 250, ["Defines stable request and response behavior for external clients."], "critical", ["src/api/contracts"], ["tests/contracts"]),
        node("queue.jobs", "queue", "Job Queue", 700, 430, ["Buffers asynchronous work for background processing."], "high"),
        node("worker.jobs", "worker", "Worker Pool", 960, 430, ["Processes asynchronous jobs and retries safe work."], "high", ["src/workers"], ["tests/workers"]),
        node("scheduler.jobs", "scheduler", "Scheduler", 1180, 430, ["Starts periodic maintenance and reconciliation work."], "medium", ["src/scheduler"], ["tests/scheduler"]),
        node("db.primary", "datastore", "Primary Database", 480, 610, ["Stores canonical application data."], "critical"),
        node("db.replica", "replica", "Read Replica", 720, 610, ["Serves read-heavy queries and reporting paths."], "medium"),
        node("cache.main", "cache", "Cache", 260, 430, ["Reduces repeated reads and protects hot paths."], "medium"),
        node("storage.objects", "datastore", "Object Storage", 960, 610, ["Stores large files, generated artifacts, and retained exports."], "medium"),
        node("external.system", "external_system", "External System", 1220, 80, ["Provides a third-party or separately owned capability."], "high"),
        node("files.core", "file_group", "Core Source Files", 1220, 250, ["Groups important implementation files linked to the architecture map."], "medium", ["src/modules/core", "src/api", "src/workers"], ["tests/core", "tests/api"]),
        node("files.api_tests", "file_group", "API Test Files", 1220, 610, ["Groups tests that protect public API behavior and important request flows."], "medium", ["tests/api", "tests/contracts"]),
        node("risk.hot_path", "risk", "Critical Path Regression Risk", 480, 250, ["Tracks where regressions are most likely to affect important behavior."], "high")
      ],
      edges: [
        edge("actor.user", "app.client", "uses", "calls"),
        edge("app.client", "lb.public", "HTTPS", "calls"),
        edge("lb.public", "service.api", "routes", "routes_to"),
        edge("service.api", "service.auth", "checks identity", "calls"),
        edge("service.api", "module.core", "orchestrates", "calls"),
        edge("service.api", "contract.public_api", "implements", "implements"),
        edge("module.core", "external.system", "integrates", "calls"),
        edge("service.api", "db.primary", "writes", "writes"),
        edge("module.core", "db.primary", "owns domain data", "owns"),
        edge("service.api", "cache.main", "reads cached data", "reads"),
        edge("module.core", "queue.jobs", "enqueues work", "emits"),
        edge("worker.jobs", "queue.jobs", "consumes work", "consumes"),
        edge("worker.jobs", "db.primary", "updates results", "writes"),
        edge("scheduler.jobs", "queue.jobs", "schedules work", "emits"),
        edge("worker.jobs", "storage.objects", "stores artifacts", "writes"),
        edge("db.primary", "db.replica", "replicates", "replicates_to"),
        edge("files.core", "module.core", "implements", "implements"),
        edge("contract.public_api", "files.api_tests", "covered by contract tests", "tests"),
        edge("risk.hot_path", "service.api", "can regress", "risks"),
        edge("risk.hot_path", "module.core", "can regress", "risks"),
        edge("contract.public_api", "risk.hot_path", "mitigates public API drift", "mitigates")
      ],
      flows: [
        {
          id: "flow.primary_workflow",
          name: "Primary Workflow",
          description: "A generic user action passes through the client, API, core module, storage, and background worker.",
          owner: "architecture",
          criticality: "high",
          steps: [
            { id: "step.client", label: "User starts the workflow", nodeId: "app.client" },
            { id: "step.auth", label: "Identity and permissions are checked", nodeId: "service.auth" },
            { id: "step.api", label: "API validates and orchestrates the request", nodeId: "service.api" },
            { id: "step.core", label: "Core module applies business rules", nodeId: "module.core" },
            { id: "step.data", label: "Primary data is written", nodeId: "db.primary" },
            { id: "step.worker", label: "Worker completes asynchronous follow-up", nodeId: "worker.jobs" }
          ],
          failureModes: ["External dependency unavailable", "background job retry loop", "stale cached data"],
          acceptanceChecks: ["The workflow can be retried safely", "Critical data writes are covered by tests"],
          linkedTests: ["tests/primary-workflow.test.ts"],
          notes: ""
        }
      ],
      views: defaultViews(),
      proposals: [],
      evidence: []
    }
  },
  {
    id: "blank-system",
    name: "Blank System",
    description: "Start from an empty architecture map.",
    project: {
      manifest: baseManifest("Untitled System"),
      nodes: [],
      edges: [],
      flows: [],
      views: defaultViews(),
      proposals: [],
      evidence: []
    }
  }
];

function node(
  id: string,
  type: AtlasProject["nodes"][number]["type"],
  name: string,
  x: number,
  y: number,
  responsibilities: string[],
  criticality: AtlasProject["nodes"][number]["criticality"],
  linkedFiles: string[] = [],
  linkedTests: string[] = []
) {
  return {
    id,
    type,
    name,
    owner: "architecture",
    status: "active" as const,
    criticality,
    responsibilities,
    dependencies: [],
    invariants: type === "datastore" || type === "replica" || criticality === "critical" ? [`${name} changes must preserve ownership, reliability, and recovery behavior.`] : [],
    linkedFiles,
    linkedTests,
    risks: type === "external_system" ? ["External systems need explicit timeout, retry, and outage behavior."] : [],
    confidence: "manual" as const,
    notes: "",
    position: { x, y }
  };
}

function edge(source: string, target: string, label: string, type: AtlasProject["edges"][number]["type"]) {
  return {
    id: `${source}-${type}-${target}`,
    source,
    target,
    type,
    label
  };
}
