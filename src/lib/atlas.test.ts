import { describe, expect, it } from "vitest";
import { templates } from "../data/templates";
import {
  applyProposal,
  commitWorkspaceEdit,
  createProposal,
  createVersion,
  defaultViews,
  generateArchitectureReview,
  generateContextPack,
  generateMermaid,
  generateMigrationBrief,
  generateOverview,
  layoutProjectForView,
  mergeCodeEvidence,
  metadataFieldsForNode,
  preferredViewForNodeType,
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
});
