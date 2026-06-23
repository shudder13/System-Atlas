import { StrictMode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { templates } from "../data/templates";

const starterProject = templates[0].project;

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    api: {
      workspaces: vi.fn(async () => ({
        workspaces: [{ id: "ws-1", name: "Test", path: "/tmp/test", addedAt: new Date().toISOString(), lastOpenedAt: new Date().toISOString() }],
        currentWorkspaceId: "ws-1"
      })),
      addWorkspace: vi.fn(async (path: string, name?: string) => ({
        workspace: { id: "ws-1", name: name ?? "Test", path, addedAt: new Date().toISOString(), lastOpenedAt: new Date().toISOString() },
        created: true
      })),
      selectWorkspace: vi.fn(async (id: string) => ({
        workspace: { id, name: "Test", path: "/tmp/test", addedAt: new Date().toISOString(), lastOpenedAt: new Date().toISOString() }
      })),
      renameWorkspace: vi.fn(async (id: string, name: string) => ({
        workspace: { id, name, path: "/tmp/test", addedAt: new Date().toISOString(), lastOpenedAt: new Date().toISOString() }
      })),
      removeWorkspace: vi.fn(async () => ({ workspaces: [], currentWorkspaceId: null })),
      templates: vi.fn(async () => ({ templates: [{ id: templates[0].id, name: templates[0].name, description: templates[0].description, project: templates[0].project }] })),
      project: vi.fn(async () => ({ project: starterProject, workspace: "/tmp/test", revision: "rev-1", loadedFromDisk: true })),
      projectRevision: vi.fn(async () => ({ revision: "rev-1" })),
      codeIntelligence: vi.fn(async () => ({ intelligence: starterProject.intelligence })),
      packHealth: vi.fn(async () => ({ packHealth: { status: "healthy" as const, message: "ok", currentSourceRevision: "rev-1", issues: [] } })),
      validate: vi.fn(async () => ({ issues: [] })),
      export: vi.fn(async () => ({ ok: true, revision: "rev-2", files: [], issues: [], packHealth: { status: "healthy" as const, message: "ok", currentSourceRevision: "rev-2", issues: [] } })),
      scan: vi.fn(async () => ({ evidence: [], intelligence: starterProject.intelligence })),
      contextPack: vi.fn(async () => ({ markdown: "# context" })),
      proposal: vi.fn(async () => ({ proposal: { id: "p1", name: "p", summary: "", rationale: "", status: "draft" as const, before: { nodes: [], edges: [], flows: [] }, after: { nodes: [], edges: [], flows: [] }, forbiddenChanges: [], acceptanceChecks: [], createdAt: new Date().toISOString() } })),
      migrationBrief: vi.fn(async () => ({ markdown: "# brief" }))
    }
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("App smoke", () => {
  it("renders the top toolbar with the core architect actions", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Reload/i })).toBeInTheDocument();
    });
    for (const name of ["Scan", "Proposal", "Validate", "AI Brief", "Export"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${name}$`, "i") })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /checkpoint/i })).toBeInTheDocument();
  });

  it("clears the loading screen under StrictMode double-invocation", async () => {
    // Regression: the bootstrap effect double-invokes under StrictMode (which is
    // exactly what every `npm run dev` user gets). A `cancelled`-guarded
    // loading-clear left the first pass unable to clear the flag and the second
    // pass short-circuited on bootedRef, stranding the app on "Loading…".
    render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Validate$/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/Loading System Atlas/i)).not.toBeInTheDocument();
  });

  it("renders the architecture-views navigation with multiple view-family regions", async () => {
    render(<App />);
    const nav = await screen.findByRole("navigation", { name: /Architecture views/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /C4/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Runtime/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Platform/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Assurance/i })).toBeInTheDocument();
  });

  it("loads project + pack health from the API on mount", async () => {
    const { api } = await import("../lib/api");
    render(<App />);
    await waitFor(() => {
      expect((api.project as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
      expect((api.packHealth as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
      expect((api.templates as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });
  });

  it("disables Undo and Redo before any architecture edit happens", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Reload/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Undo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Redo/i })).toBeDisabled();
  });

  it("clicking Validate runs the validator against the current project", async () => {
    const user = userEvent.setup();
    const { api } = await import("../lib/api");
    render(<App />);
    const validate = await screen.findByRole("button", { name: /^Validate$/i });
    await user.click(validate);
    await waitFor(() => {
      expect((api.validate as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });
  });
});
