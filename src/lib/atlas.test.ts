import { describe, expect, it } from "vitest";
import { templates } from "../data/templates";
import {
  applyProposal,
  commitWorkspaceEdit,
  createNode,
  createProposal,
  createVersion,
  defaultViews,
  generateArchitectureDoc,
  generateArchitectureReview,
  generateContextPack,
  generateImportCandidates,
  generateMermaid,
  generateMigrationBrief,
  generateOverview,
  layoutProjectForView,
  mergeCodeEvidence,
  metadataFieldsForNode,
  preferredViewForNodeType,
  promoteImportCandidates,
  promoteGeneratedNode,
  proposalWorkspace,
  restoreVersion,
  semanticDiff,
  updateProposalAfter,
  validateAtlas,
  viewSupportsNodeType
} from "./atlas";

describe("atlas generators", () => {
  const project = templates[0].project;

  it("validates a realistic starter atlas", () => {
    const issues = validateAtlas(project);
    expect(issues.some((issue) => issue.severity === "error")).toBe(false);
  });

  it("warns when stakeholder concerns are not addressed by architecture elements", () => {
    const withoutAddressingEdges = {
      ...project,
      edges: project.edges.filter((edge) => !(edge.type === "addresses" && edge.target === "concern.safe_change"))
    };

    const issues = validateAtlas(withoutAddressingEdges);

    expect(issues.some((issue) =>
      issue.code === "concern-without-addressing-element" &&
      issue.targetId === "concern.safe_change"
    )).toBe(true);
  });

  it("warns about concern traceability edges with invalid direction", () => {
    const invalid = {
      ...project,
      edges: [
        ...project.edges,
        {
          id: "invalid-has-concern",
          source: "service.api",
          target: "concern.safe_change",
          type: "has_concern" as const
        },
        {
          id: "invalid-addresses",
          source: "concern.safe_change",
          target: "service.api",
          type: "addresses" as const
        }
      ]
    };

    const codes = validateAtlas(invalid).map((issue) => issue.code);

    expect(codes).toContain("invalid-has-concern-source");
    expect(codes).toContain("concern-addresses-element");
    expect(codes).toContain("invalid-addresses-target");
  });

  it("generates mermaid from the typed graph", () => {
    const mermaid = generateMermaid(project, "data");
    expect(mermaid).toContain("flowchart LR");
    expect(mermaid).toContain("API Service");
    expect(mermaid).toContain("Primary Database");
  });

  it("generates a markdown overview", () => {
    const overview = generateOverview(project);
    expect(overview).toContain("# Generic Service System");
    expect(overview).toContain("## Critical Areas");
  });

  it("generates a narrative architecture document from the graph", () => {
    const doc = generateArchitectureDoc(project);
    // Title + provenance banner so a human reader knows it is generated.
    expect(doc).toContain("# Generic Service System — Architecture");
    expect(doc).toContain("generateArchitectureDoc");
    // Embedded system diagram reuses the overview Mermaid — prose and canvas cannot disagree.
    expect(doc).toContain("## System Diagram");
    expect(doc).toContain("```mermaid");
    // Sections assembled from grouped node types, with real node names flowing through.
    expect(doc).toContain("## Services & Containers");
    expect(doc).toContain("API Service");
    // New Services columns: Ports (graceful "—" when unmodeled) and Depends on
    // (derived from edges, filtered to architectural target types).
    expect(doc).toMatch(/\| Ports \|/);
    expect(doc).toContain("Depends on");
    // API Service writes to the Primary Database, so the datastore surfaces in
    // its dependency cell — proof the column is computed from the graph, not hard-coded.
    expect(doc).toMatch(/\| API Service \|[^\n]*Primary Database/);
    expect(doc).toContain("## Data Stores");
    expect(doc).toContain("Primary Database");
    expect(doc).toContain("## Technology Stack");
    expect(doc).toContain("## Key Decisions");
    expect(doc).toContain("## Risks & Known Issues");
  });

  it("generates an architecture practice review", () => {
    const review = generateArchitectureReview(project);
    expect(review).toContain("Architecture Review");
    expect(review).toContain("Viewpoint Coverage");
    expect(review).toContain("Stakeholder concerns");
    expect(review).toContain("Suggested Next Actions");
  });

  it("detects semantic node changes", () => {
    const before = { nodes: project.nodes, edges: project.edges, flows: project.flows };
    const after = {
      ...before,
      nodes: project.nodes.map((node) => node.id === "service.api" ? { ...node, owner: "platform" } : node)
    };
    const diff = semanticDiff(before, after);
    expect(diff.changedNodes.map((item) => item.after.id)).toContain("service.api");
  });

  it("keeps proposal before snapshots stable while after follows edits", () => {
    const proposal = createProposal(project, "Change API owner");
    const edited = {
      ...project,
      proposals: [proposal],
      nodes: project.nodes.map((node) => node.id === "service.api" ? { ...node, owner: "platform" } : node)
    };
    const withAfter = updateProposalAfter(edited, proposal.id);
    const activeProposal = withAfter.proposals[0];
    const diff = semanticDiff(activeProposal.before, activeProposal.after);

    expect(activeProposal.before.nodes.find((node) => node.id === "service.api")?.owner).toBe("architecture");
    expect(activeProposal.after.nodes.find((node) => node.id === "service.api")?.owner).toBe("platform");
    expect(diff.changedNodes.map((item) => item.after.id)).toContain("service.api");
  });

  it("isolates proposal workspace edits from the main atlas", () => {
    const proposal = createProposal(project, "Branch proposal");
    const root = { ...project, proposals: [proposal] };
    const workspace = proposalWorkspace(root, proposal.id);
    const editedWorkspace = {
      ...workspace,
      nodes: workspace.nodes.map((node) => node.id === "service.api" ? { ...node, owner: "platform" } : node)
    };
    const updatedRoot = updateProposalAfter(root, proposal.id, editedWorkspace);

    expect(updatedRoot.nodes.find((node) => node.id === "service.api")?.owner).toBe("architecture");
    expect(updatedRoot.proposals[0].after.nodes.find((node) => node.id === "service.api")?.owner).toBe("platform");
    expect(updatedRoot.proposals[0].before.nodes.find((node) => node.id === "service.api")?.owner).toBe("architecture");
  });

  it("commits proposal workspace edits through an explicit proposal boundary", () => {
    const proposal = createProposal(project, "Route API traffic");
    const root = { ...project, proposals: [proposal] };
    const workspace = proposalWorkspace(root, proposal.id);
    const editedWorkspace = {
      ...workspace,
      nodes: workspace.nodes.map((node) => node.id === "service.api" ? { ...node, owner: "platform" } : node),
      views: workspace.views.map((view) =>
        view.id === "overview"
          ? { ...view, positions: { ...(view.positions ?? {}), "service.api": { x: 99, y: 101 } } }
          : view
      )
    };

    const committed = commitWorkspaceEdit(root, editedWorkspace, proposal.id, "2026-05-05T00:00:00.000Z");

    expect(committed.manifest.updatedAt).toBe("2026-05-05T00:00:00.000Z");
    expect(committed.nodes.find((node) => node.id === "service.api")?.owner).toBe("architecture");
    expect(committed.proposals[0].after.nodes.find((node) => node.id === "service.api")?.owner).toBe("platform");
    expect(committed.views.find((view) => view.id === "overview")?.positions?.["service.api"]).toEqual({ x: 99, y: 101 });
  });

  it("applies proposal after-state back to the main atlas", () => {
    const proposal = createProposal(project, "Apply owner change");
    const editedWorkspace = {
      ...proposalWorkspace({ ...project, proposals: [proposal] }, proposal.id),
      nodes: project.nodes.map((node) => node.id === "service.api" ? { ...node, owner: "platform" } : node)
    };
    const withProposal = updateProposalAfter({ ...project, proposals: [proposal] }, proposal.id, editedWorkspace);
    const applied = applyProposal(withProposal, proposal.id);

    expect(applied.nodes.find((node) => node.id === "service.api")?.owner).toBe("platform");
    expect(applied.proposals[0].status).toBe("applied");
    expect(applied.proposals[0].before.nodes.find((node) => node.id === "service.api")?.owner).toBe("architecture");
    expect(applied.versions.at(-1)?.source).toBe("proposal");
  });

  it("creates and restores architecture version checkpoints", () => {
    const checkpoint = createVersion(project, "Before API owner change");
    const changed = {
      ...project,
      versions: [checkpoint],
      nodes: project.nodes.map((node) => node.id === "service.api" ? { ...node, owner: "platform" } : node)
    };
    const restored = restoreVersion(changed, checkpoint.id);

    expect(restored.nodes.find((node) => node.id === "service.api")?.owner).toBe("architecture");
    expect(restored.versions[0].name).toBe("Before API owner change");
  });

  it("provides typed metadata profiles for operational architecture facts", () => {
    const serviceFields = metadataFieldsForNode("service").map((field) => field.key);
    const datastoreFields = metadataFieldsForNode("datastore").map((field) => field.key);

    expect(serviceFields).toContain("rto");
    expect(serviceFields).toContain("scaling");
    expect(datastoreFields).toContain("retention");
    expect(datastoreFields).toContain("containsPii");
  });

  it("includes typed metadata in AI context packs", () => {
    const withMetadata = {
      ...project,
      nodes: project.nodes.map((node) =>
        node.id === "service.api"
          ? { ...node, metadata: { ...node.metadata, rto: "15 minutes" } }
          : node
      )
    };
    const context = generateContextPack(withMetadata, ["service.api"]);

    expect(context).toContain("## Typed Metadata");
    expect(context).toContain("service.api.rto: 15 minutes");
  });

  it("supports focused AI context budgets", () => {
    const focused = generateContextPack(project, [], "Keep this compact.", "focused");
    const expanded = generateContextPack(project, [], "Show more.", "expanded");

    expect(focused).toContain("- Scope: focused");
    expect(expanded).toContain("- Scope: expanded");
    expect(expanded.length).toBeGreaterThan(focused.length);
  });

  it("keeps layouts scoped to individual architecture views", () => {
    const withDataLayout = {
      ...project,
      views: project.views.map((view) =>
        view.id === "data"
          ? { ...view, positions: { "service.api": { x: 11, y: 22 } } }
          : view
      )
    };

    const dataApi = layoutProjectForView(withDataLayout, "data").nodes.find((node) => node.id === "service.api");
    const overviewApi = layoutProjectForView(withDataLayout, "overview").nodes.find((node) => node.id === "service.api");

    expect(dataApi?.position).toEqual({ x: 11, y: 22 });
    expect(overviewApi?.position).not.toEqual({ x: 11, y: 22 });
  });

  it("routes new nodes to views where they are visible", () => {
    expect(viewSupportsNodeType("overview", "datastore")).toBe(false);
    expect(preferredViewForNodeType("datastore")).toBe("data");
    expect(viewSupportsNodeType("flows", "service")).toBe(true);
    expect(preferredViewForNodeType("deployment_node")).toBe("deployment");
    expect(preferredViewForNodeType("threat")).toBe("security");
    expect(preferredViewForNodeType("stakeholder")).toBe("concerns");
    expect(preferredViewForNodeType("concern")).toBe("concerns");
    expect(viewSupportsNodeType("concerns", "stakeholder")).toBe(true);
    expect(viewSupportsNodeType("concerns", "concern")).toBe(true);
    expect(viewSupportsNodeType("code", "code_symbol")).toBe(true);
  });

  it("supports the expanded architecture view families", () => {
    expect(generateMermaid(project, "deployment")).toContain("Application Cluster");
    expect(generateMermaid(project, "security")).toContain("Identity Bypass Threat");
    expect(generateMermaid(project, "concerns")).toContain("Safe AI-Assisted Change");
    expect(generateMermaid(project, "decisions")).toContain("Use Async Job Queue");

    const views = defaultViews();
    expect(views.find((view) => view.id === "overview")?.core).toBe(true);
    expect(views.find((view) => view.id === "code")?.core).toBe(false);
  });

  it("generates AI context and migration briefs", () => {
    expect(generateContextPack(project, ["module.core"])).toContain("AI Context Pack");
    expect(generateMigrationBrief(project)).toContain("Migration Brief");
  });

  it("turns scanned code evidence into code view nodes", () => {
    const intelligence = {
      generatedAt: "2026-05-05T00:00:00.000Z",
      projectStructure: [],
      files: [
        {
          path: "src/lib/example.ts",
          kind: "source" as const,
          language: "typescript",
          lines: 42,
          imports: ["./other"],
          exports: ["ExampleService"],
          routes: ["GET /examples"],
          symbols: ["class:ExampleService@3"],
          summary: "Example service file"
        }
      ],
      symbols: [{ id: "symbol.example", path: "src/lib/example.ts", name: "ExampleService", kind: "class" as const, line: 3, exported: true }],
      classes: [{ id: "class.example", path: "src/lib/example.ts", name: "ExampleService", line: 3, exported: true, attributes: [{ name: "repo", kind: "attribute" as const, type: "Repo" }], methods: [{ name: "list", kind: "method" as const, returnType: "Item[]" }] }],
      routes: [{ id: "route.example", method: "GET", path: "/examples", sourceFile: "src/lib/example.ts", line: 18 }],
      schemas: [],
      dependencies: [{ source: "src/lib/example.ts", target: "src/lib/other.ts", importPath: "./other", kind: "internal" as const }],
      testMap: [{ testFile: "src/lib/example.test.ts", targetFiles: ["src/lib/example.ts"], inferred: false }]
    };
    const withEvidence = mergeCodeEvidence(project, [
      {
        path: "src/lib/example.ts",
        kind: "source",
        language: "typescript",
        lines: 42,
        imports: ["./other"],
        exports: ["ExampleService"],
        symbols: [{ name: "ExampleService", kind: "class", line: 3 }]
      },
      {
        path: "src/lib/other.ts",
        kind: "source",
        language: "typescript",
        lines: 12,
        exports: ["helper"],
        symbols: [{ name: "helper", kind: "function", line: 1 }]
      }
    ], intelligence);

    expect(withEvidence.nodes.some((node) => node.type === "code_symbol" && node.name === "ExampleService")).toBe(true);
    expect(withEvidence.intelligence.classes[0].name).toBe("ExampleService");
    expect(layoutProjectForView(withEvidence, "code").nodes.some((node) => node.id.startsWith("code.file."))).toBe(true);
    expect(generateContextPack(withEvidence, ["code.file.src-lib-example.ts"])).toContain("Persistent Code Intelligence");
  });

  it("derives class, API, and schema views from saved architecture evidence", () => {
    const intelligence = {
      generatedAt: "2026-05-05T00:00:00.000Z",
      projectStructure: [],
      files: [],
      symbols: [
        { id: "symbol.repo", path: "src/lib/repo.ts", name: "Repository", kind: "interface" as const, line: 1, exported: true },
        { id: "symbol.example", path: "src/lib/example.ts", name: "ExampleService", kind: "class" as const, line: 3, exported: true }
      ],
      classes: [
        {
          id: "class.example",
          path: "src/lib/example.ts",
          name: "ExampleService",
          line: 3,
          exported: true,
          extends: "BaseService",
          implements: ["Repository"],
          attributes: [{ name: "repo", kind: "attribute" as const, visibility: "private" as const, type: "Repository" }],
          methods: [{ name: "list", kind: "method" as const, parameters: [], returnType: "Item[]" }]
        }
      ],
      routes: [{ id: "route.example", method: "GET", path: "/examples", sourceFile: "src/lib/example.ts", line: 18 }],
      schemas: [{
        id: "schema.scan.examples",
        path: "db/migrations/001_create_examples.sql",
        name: "examples",
        kind: "table" as const,
        line: 1,
        columns: ["id uuid primary key", "name text not null"],
        primaryKeys: ["id"],
        indexes: ["examples_name_idx"],
        foreignKeys: [],
        relations: []
      }],
      dependencies: [],
      testMap: [{ testFile: "src/lib/example.test.ts", targetFiles: ["src/lib/example.ts"], inferred: false }]
    };
    const projectWithOwner = {
      ...project,
      nodes: project.nodes.map((node) => node.id === "service.api" ? { ...node, linkedFiles: ["src/lib/example.ts"] } : node)
    };
    const withEvidence = mergeCodeEvidence(projectWithOwner, [
      {
        path: "src/lib/example.ts",
        kind: "source",
        language: "typescript",
        lines: 42,
        symbols: [{ name: "ExampleService", kind: "class", line: 3 }],
        routes: ["GET /examples"]
      },
      {
        path: "db/migrations/001_create_examples.sql",
        kind: "migration",
        language: "sql",
        lines: 24
      }
    ], intelligence);
    const withSchema = {
      ...withEvidence,
      nodes: [
        ...withEvidence.nodes,
        {
          id: "schema.examples",
          type: "schema" as const,
          name: "Examples Schema",
          owner: "data",
          status: "active" as const,
          criticality: "high" as const,
          responsibilities: ["Persists example records."],
          dependencies: [],
          invariants: ["Example ids are immutable."],
          linkedFiles: ["db/migrations/001_create_examples.sql"],
          linkedTests: [],
          risks: [],
          confidence: "manual" as const,
          architectureLevel: "data" as const,
          metadata: {
            databaseEngine: "Postgres",
            columns: ["id uuid primary key", "name text not null"],
            indexes: ["examples_name_idx"],
            relations: ["examples.owner_id -> users.id"]
          }
        }
      ]
    };

    const classGraph = layoutProjectForView(withSchema, "class_diagram");
    const apiGraph = layoutProjectForView(withSchema, "api_surface");
    const schemaGraph = layoutProjectForView(withSchema, "schema_model");

    const classNode = classGraph.nodes.find((node) => node.name === "ExampleService");
    expect(classNode?.metadata?.methods).toContain("list(): Item[]");
    expect(classNode?.metadata?.attributes).toContain("private repo: Repository");
    expect(classGraph.edges.some((edge) => edge.type === "implements" && edge.label === "implements")).toBe(true);
    expect(generateMermaid(withSchema, "class_diagram")).toContain("classDiagram");

    expect(apiGraph.nodes.some((node) => node.name === "GET /examples" && node.type === "api_contract")).toBe(true);
    expect(apiGraph.edges.some((edge) => edge.source === "service.api" && edge.type === "exposes")).toBe(true);

    expect(schemaGraph.nodes.some((node) => node.id === "schema.examples")).toBe(true);
    expect(schemaGraph.nodes.some((node) => node.name === "examples" && node.metadata?.generatedBy === "schema-model")).toBe(true);
    expect(schemaGraph.nodes.some((node) => node.type === "migration" && node.linkedFiles.includes("db/migrations/001_create_examples.sql"))).toBe(true);
    expect(metadataFieldsForNode("schema").some((field) => field.key === "columns")).toBe(true);
  });

  it("promotes generated view facts into authored atlas nodes", () => {
    const generated = layoutProjectForView({
      ...project,
      intelligence: {
        generatedAt: "2026-05-05T00:00:00.000Z",
        projectStructure: [],
        files: [],
        symbols: [],
        classes: [],
        routes: [{ id: "route.example", method: "POST", path: "/orders", sourceFile: "src/api/orders.ts", line: 12 }],
        schemas: [],
        dependencies: [],
        testMap: [{ testFile: "src/api/orders.test.ts", targetFiles: ["src/api/orders.ts"], inferred: false }]
      }
    }, "api_surface").nodes.find((node) => node.name === "POST /orders");

    expect(generated).toBeTruthy();
    const promoted = promoteGeneratedNode(project, generated!);
    const promotedNode = promoted.nodes.find((node) => node.id === generated!.id);

    expect(promotedNode?.confidence).toBe("manual");
    expect(promotedNode?.metadata?.generatedBy).toBeUndefined();
    expect(promotedNode?.metadata?.promotedFrom).toBe("api-surface");
    expect(promotedNode?.linkedFiles).toContain("src/api/orders.ts");
  });

  it("suggests and batch-promotes scanned brownfield facts", () => {
    const withIntelligence = {
      ...project,
      intelligence: {
        generatedAt: "2026-05-05T00:00:00.000Z",
        projectStructure: [],
        files: [],
        symbols: [],
        classes: [{
          id: "class.order",
          path: "src/domain/order-service.ts",
          name: "OrderService",
          line: 3,
          exported: true,
          attributes: [{ name: "repo", kind: "attribute" as const, visibility: "private" as const, type: "OrderRepository" }],
          methods: [{ name: "placeOrder", kind: "method" as const, parameters: ["command: PlaceOrder"], returnType: "Promise<Order>" }]
        }],
        routes: [{ id: "route.orders", method: "POST", path: "/orders", sourceFile: "src/api/orders.ts", line: 12 }],
        schemas: [{
          id: "schema.orders",
          path: "db/schema.prisma",
          name: "Order",
          kind: "model" as const,
          line: 4,
          columns: ["id String primary key", "customerId String"],
          primaryKeys: ["id"],
          indexes: ["customerId index"],
          foreignKeys: [],
          relations: ["customer -> Customer"]
        }],
        dependencies: [],
        testMap: [{ testFile: "src/api/orders.test.ts", targetFiles: ["src/api/orders.ts"], inferred: false }]
      }
    };

    const candidates = generateImportCandidates(withIntelligence);
    expect(candidates.map((candidate) => candidate.group)).toEqual(expect.arrayContaining(["class", "route", "schema"]));

    const selected = candidates.filter((candidate) => ["class", "route", "schema"].includes(candidate.group));
    const promoted = promoteImportCandidates(withIntelligence, selected);

    for (const candidate of selected) {
      const node = promoted.nodes.find((item) => item.id === candidate.node.id);
      expect(node?.confidence).toBe("manual");
      expect(node?.metadata?.generatedBy).toBeUndefined();
      expect(node?.metadata?.promotedFrom).toBeTruthy();
    }

    const remaining = generateImportCandidates(promoted);
    expect(remaining.some((candidate) => selected.some((item) => item.id === candidate.id))).toBe(false);
  });

  it("merges scanned facts into manually modeled concepts by semantic key", () => {
    const manualClass = {
      id: "manual.order-service",
      type: "code_symbol" as const,
      name: "OrderService",
      owner: "architecture",
      status: "active" as const,
      criticality: "high" as const,
      responsibilities: ["Owns order orchestration."],
      dependencies: [],
      invariants: ["Orders are idempotent by external reference."],
      linkedFiles: ["src/domain/order-service.ts"],
      linkedTests: [],
      risks: [],
      confidence: "manual" as const,
      architectureLevel: "code" as const,
      metadata: {}
    };
    const manualRoute = {
      id: "manual.create-order-route",
      type: "api_contract" as const,
      name: "Create Order",
      owner: "architecture",
      status: "active" as const,
      criticality: "critical" as const,
      responsibilities: ["Creates an order through the public API."],
      dependencies: [],
      invariants: [],
      linkedFiles: ["src/api/orders.ts"],
      linkedTests: [],
      risks: [],
      confidence: "manual" as const,
      architectureLevel: "runtime" as const,
      metadata: { routeMethod: "POST", routePath: "/orders" }
    };
    const manualSchema = {
      id: "manual.order-entity",
      type: "data_entity" as const,
      name: "Order Entity",
      owner: "architecture",
      status: "active" as const,
      criticality: "high" as const,
      responsibilities: ["Persists order state."],
      dependencies: [],
      invariants: [],
      linkedFiles: ["db/schema.prisma"],
      linkedTests: [],
      risks: [],
      confidence: "manual" as const,
      architectureLevel: "data" as const,
      metadata: { entityName: "Order" }
    };
    const withManualModel = {
      ...project,
      nodes: [...project.nodes, manualClass, manualRoute, manualSchema],
      intelligence: {
        generatedAt: "2026-05-05T00:00:00.000Z",
        projectStructure: [],
        files: [],
        symbols: [],
        classes: [{
          id: "class.order",
          path: "src/domain/order-service.ts",
          name: "OrderService",
          line: 3,
          exported: true,
          attributes: [{ name: "repo", kind: "attribute" as const, visibility: "private" as const, type: "OrderRepository" }],
          methods: [{ name: "placeOrder", kind: "method" as const, returnType: "Promise<Order>" }]
        }],
        routes: [{ id: "route.orders", method: "POST", path: "/orders", sourceFile: "src/api/orders.ts", line: 12 }],
        schemas: [{
          id: "schema.orders",
          path: "db/schema.prisma",
          name: "Order",
          kind: "model" as const,
          line: 4,
          columns: ["id String primary key"],
          primaryKeys: ["id"],
          indexes: [],
          foreignKeys: [],
          relations: []
        }],
        dependencies: [],
        testMap: []
      }
    };

    const classGraph = layoutProjectForView(withManualModel, "class_diagram");
    const apiGraph = layoutProjectForView(withManualModel, "api_surface");
    const schemaGraph = layoutProjectForView(withManualModel, "schema_model");

    expect(classGraph.nodes.filter((node) => node.name === "OrderService")).toHaveLength(1);
    expect(classGraph.nodes.find((node) => node.id === manualClass.id)?.metadata?.methods).toContain("placeOrder(): Promise<Order>");
    expect(apiGraph.nodes.filter((node) => node.metadata?.routePath === "/orders" || node.name === "POST /orders")).toHaveLength(1);
    expect(apiGraph.nodes.find((node) => node.id === manualRoute.id)?.linkedFiles).toContain("src/api/orders.ts");
    expect(schemaGraph.nodes.filter((node) => node.metadata?.entityName === "Order")).toHaveLength(1);
    expect(schemaGraph.nodes.find((node) => node.id === manualSchema.id)?.metadata?.columns).toContain("id String primary key");
    expect(generateImportCandidates(withManualModel).some((candidate) => ["OrderService", "POST /orders", "Order"].includes(candidate.title))).toBe(false);
  });
});

describe("proposal and diff edge cases", () => {
  it("applyProposal is a no-op for an unknown id and idempotent on double-apply", () => {
    const project = structuredClone(templates[0].project);
    expect(applyProposal(project, "proposal.does-not-exist")).toBe(project);

    const proposal = createProposal(project, "Test change");
    proposal.after.nodes[0] = { ...proposal.after.nodes[0], name: "Renamed Node" };
    const withProposal = { ...project, proposals: [proposal] };

    const applied = applyProposal(withProposal, proposal.id);
    expect(applied.nodes[0].name).toBe("Renamed Node");
    expect(applied.proposals[0].status).toBe("applied");
    expect(applied.versions).toHaveLength(project.versions.length + 1);

    // Applying again replays the same snapshot: same graph, one more version
    // checkpoint, no corruption.
    const reApplied = applyProposal(applied, proposal.id);
    expect(reApplied.nodes[0].name).toBe("Renamed Node");
    expect(reApplied.nodes).toHaveLength(applied.nodes.length);
  });

  it("semanticDiff reports added and removed nodes and edges", () => {
    const project = templates[0].project;
    const before = { nodes: project.nodes, edges: project.edges, flows: project.flows };
    const after = {
      nodes: [...project.nodes.slice(1), { ...project.nodes[0], id: "service.brand-new", name: "Brand New" }],
      edges: project.edges.slice(1),
      flows: project.flows
    };

    const diff = semanticDiff(before, after);

    expect(diff.addedNodes.map((node) => node.id)).toContain("service.brand-new");
    expect(diff.removedNodes.map((node) => node.id)).toContain(project.nodes[0].id);
    expect(diff.removedEdges.map((edge) => edge.id)).toContain(project.edges[0].id);
    expect(diff.addedEdges).toHaveLength(0);
  });

  it("semanticDiff ignores array reordering (no phantom changes)", () => {
    const project = templates[0].project;
    const node = project.nodes.find((item) => item.responsibilities.length > 1) ?? project.nodes[0];
    const reordered = {
      ...node,
      responsibilities: [...node.responsibilities].reverse(),
      // Only reorder tags when they exist: undefined -> [] would be a real
      // structural change, not a reorder.
      ...(node.tags ? { tags: [...node.tags].reverse() } : {})
    };
    const before = { nodes: [node], edges: [], flows: [] };
    const after = { nodes: [reordered], edges: [], flows: [] };

    expect(semanticDiff(before, after).changedNodes).toHaveLength(0);
  });

  it("restoreVersion returns the project unchanged for an unknown version id", () => {
    const project = templates[0].project;
    expect(restoreVersion(project, "version.nope")).toBe(project);
  });

  it("validateAtlas flags duplicate node ids", () => {
    const project = structuredClone(templates[0].project);
    project.nodes.push({ ...project.nodes[0] });
    const codes = validateAtlas(project).map((issue) => issue.code);
    expect(codes).toContain("duplicate-node");
  });
});

describe("mermaid escaping", () => {
  it("neutralizes structural characters in node names and edge labels", () => {
    const project = structuredClone(templates[0].project);
    const service = project.nodes.find((node) => node.name === "API Service")!;
    service.name = "Evil] Service |x\nLine2";
    const edge = project.edges.find((item) => item.source === service.id || item.target === service.id)!;
    edge.label = "GET|POST [v2]";

    const mermaid = generateMermaid(project, "data");

    // Raw `]` / `|` / newlines inside a label would terminate the `["..."]`
    // node syntax or the `|"..."|` edge delimiter and corrupt the diagram.
    expect(mermaid).toContain("&#93;");
    expect(mermaid).toContain("&#124;");
    expect(mermaid).not.toContain("Evil]");
    expect(mermaid).not.toContain("GET|POST");
    expect(mermaid).not.toContain("Line2\n");
    for (const line of mermaid.split("\n")) {
      const quotes = line.match(/"/g)?.length ?? 0;
      expect(quotes % 2).toBe(0);
    }
  });

  it("converts generics in class members to Mermaid tilde syntax", () => {
    const project = structuredClone(templates[0].project);
    project.nodes.push({
      ...createNode("code_symbol", 0),
      id: "code_symbol.lookup_service",
      name: "LookupService",
      metadata: {
        symbolKind: "class",
        methods: ["lookup(map: Map<string, AtlasNode>): string[]"]
      }
    });

    const mermaid = generateMermaid(project, "class_diagram");

    expect(mermaid).toContain("Map~string, AtlasNode~");
    expect(mermaid).not.toContain("Map<string");
  });
});
