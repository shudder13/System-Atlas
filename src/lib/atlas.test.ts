import { describe, expect, it } from "vitest";
import { templates } from "../data/templates";
import {
  generateContextPack,
  generateMermaid,
  generateMigrationBrief,
  generateOverview,
  layoutProjectForView,
  preferredViewForNodeType,
  semanticDiff,
  validateAtlas,
  viewSupportsNodeType
} from "./atlas";

describe("atlas generators", () => {
  const project = templates[0].project;

  it("validates a realistic starter atlas", () => {
    const issues = validateAtlas(project);
    expect(issues.some((issue) => issue.severity === "error")).toBe(false);
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

  it("detects semantic node changes", () => {
    const before = { nodes: project.nodes, edges: project.edges, flows: project.flows };
    const after = {
      ...before,
      nodes: project.nodes.map((node) => node.id === "service.api" ? { ...node, owner: "platform" } : node)
    };
    const diff = semanticDiff(before, after);
    expect(diff.changedNodes.map((item) => item.after.id)).toContain("service.api");
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
    expect(viewSupportsNodeType("code", "code_symbol")).toBe(true);
  });

  it("supports the expanded architecture view families", () => {
    expect(generateMermaid(project, "deployment")).toContain("Application Cluster");
    expect(generateMermaid(project, "security")).toContain("Identity Bypass Threat");
    expect(generateMermaid(project, "decisions")).toContain("Use Async Job Queue");
  });

  it("generates AI context and migration briefs", () => {
    expect(generateContextPack(project, ["module.core"])).toContain("AI Context Pack");
    expect(generateMigrationBrief(project)).toContain("Migration Brief");
  });
});
