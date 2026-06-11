import express from "express";
import net from "node:net";
import { templates } from "../src/data/templates";
import { createProposal, emptyCodeIntelligence, generateContextPack, generateMigrationBrief, validateAtlas } from "../src/lib/atlas";
import { AtlasProject, CodeIntelligence, ContextPackScope } from "../src/types";
import { architectureRevision, exportAtlas, loadAtlas, loadCodeIntelligence, packHealth, scanWorkspace } from "./atlasFiles";
import {
  addWorkspace,
  bootstrapFromEnv,
  getCurrentWorkspace,
  listWorkspaces,
  removeWorkspace,
  renameWorkspace,
  selectWorkspace
} from "./workspaces";

const app = express();
const port = Number(process.env.SYSTEM_ATLAS_API_PORT ?? 5174);

app.use(express.json({ limit: "20mb" }));

type ExportAtlasProject = Omit<AtlasProject, "intelligence"> & { intelligence?: CodeIntelligence };

class NoWorkspaceError extends Error {
  code = "no_workspace";
  status = 409;
  constructor() {
    super("No workspace selected. Add a project first.");
  }
}

async function currentWorkspaceRoot(): Promise<string> {
  const current = await getCurrentWorkspace();
  if (!current) throw new NoWorkspaceError();
  return current.path;
}

// Validate the untrusted request body at the boundary. Every endpoint that
// consumes a project previously did a bare `request.body.project as AtlasProject`
// cast, so a missing/malformed body reached domain logic (validateAtlas,
// createProposal, generateContextPack) and threw a TypeError -> opaque 500.
// Returns the project, or sends a 400 and returns null (caller must `return`).
function requireProject(request: express.Request, response: express.Response): AtlasProject | null {
  const project = request.body?.project;
  if (
    !project ||
    typeof project !== "object" ||
    !Array.isArray(project.nodes) ||
    !Array.isArray(project.edges) ||
    !Array.isArray(project.flows)
  ) {
    response.status(400).json({
      error: "Request body must include a valid project (with nodes, edges, and flows).",
      code: "invalid_project"
    });
    return null;
  }
  return project as AtlasProject;
}

app.get("/api/templates", (_request, response) => {
  response.json({ templates });
});

app.get("/api/workspaces", async (_request, response, next) => {
  try {
    response.json(await listWorkspaces());
  } catch (error) {
    next(error);
  }
});

app.post("/api/workspaces", async (request, response, next) => {
  try {
    const path = String(request.body?.path ?? "").trim();
    if (!path) {
      response.status(400).json({ error: "path is required", code: "invalid_path" });
      return;
    }
    const name = typeof request.body?.name === "string" ? request.body.name : undefined;
    const { workspace, created } = await addWorkspace({ path, name });
    response.status(created ? 201 : 200).json({ workspace, created });
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === "path_not_found") {
      response.status(400).json({ error: err.message, code: err.code });
      return;
    }
    next(error);
  }
});

app.post("/api/workspaces/:id/select", async (request, response, next) => {
  try {
    const workspace = await selectWorkspace(request.params.id);
    response.json({ workspace });
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === "workspace_not_found") {
      response.status(404).json({ error: err.message, code: err.code });
      return;
    }
    next(error);
  }
});

app.patch("/api/workspaces/:id", async (request, response, next) => {
  try {
    if (typeof request.body?.name !== "string") {
      response.status(400).json({ error: "name must be a string", code: "invalid_name" });
      return;
    }
    const workspace = await renameWorkspace(request.params.id, request.body.name);
    response.json({ workspace });
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === "workspace_not_found") {
      response.status(404).json({ error: err.message, code: err.code });
      return;
    }
    if (err.code === "invalid_name") {
      response.status(400).json({ error: err.message, code: err.code });
      return;
    }
    next(error);
  }
});

app.delete("/api/workspaces/:id", async (request, response, next) => {
  try {
    const registry = await removeWorkspace(request.params.id);
    response.json(registry);
  } catch (error) {
    next(error);
  }
});

app.get("/api/project", async (_request, response, next) => {
  try {
    const workspaceRoot = await currentWorkspaceRoot();
    const project = await loadAtlas(workspaceRoot, { includeIntelligence: false });
    const revision = await architectureRevision(workspaceRoot);
    response.json({
      workspace: workspaceRoot,
      revision,
      loadedFromDisk: Boolean(project),
      project: project ?? templates[0].project
    });
  } catch (error) {
    handleWorkspaceError(error, response, next);
  }
});

app.get("/api/code-intelligence", async (_request, response, next) => {
  try {
    response.json({ intelligence: await loadCodeIntelligence(await currentWorkspaceRoot()) });
  } catch (error) {
    handleWorkspaceError(error, response, next);
  }
});

app.get("/api/pack-health", async (_request, response, next) => {
  try {
    response.json({ packHealth: await packHealth(await currentWorkspaceRoot()) });
  } catch (error) {
    handleWorkspaceError(error, response, next);
  }
});

app.post("/api/draft/validate", (request, response) => {
  const project = requireProject(request, response);
  if (!project) return;
  response.json({ issues: validateAtlas(project) });
});

// Serialize exports: the revision conflict check and the multi-file pack write
// must be one critical section, or two near-simultaneous exports both pass the
// check against the same revision and interleave their writes.
let exportChain: Promise<unknown> = Promise.resolve();
function withExportLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = exportChain.then(operation, operation);
  exportChain = result.then(() => undefined, () => undefined);
  return result;
}

app.post("/api/export", async (request, response, next) => {
  try {
    const incomingProject = requireProject(request, response) as ExportAtlasProject | null;
    if (!incomingProject) return;
    const workspaceRoot = await currentWorkspaceRoot();
    const baseRevision = typeof request.body.baseRevision === "string" ? request.body.baseRevision : undefined;
    const force = Boolean(request.body.force);

    await withExportLock(async () => {
      const currentRevision = await architectureRevision(workspaceRoot);

      if (!force && baseRevision !== undefined && currentRevision && currentRevision !== baseRevision) {
        response.status(409).json({
          error: "Architecture files changed on disk. Reload them or force export to overwrite disk changes.",
          code: "revision_conflict",
          revision: currentRevision
        });
        return;
      }

      const existingIntelligence = incomingProject.intelligence ? undefined : await loadCodeIntelligence(workspaceRoot);
      const project = {
        ...incomingProject,
        intelligence: incomingProject.intelligence ?? existingIntelligence ?? emptyCodeIntelligence()
      } as AtlasProject;

      const result = await exportAtlas(workspaceRoot, project);
      const revision = await architectureRevision(workspaceRoot);
      response.json({ ok: true, revision, packHealth: await packHealth(workspaceRoot), ...result });
    });
  } catch (error) {
    handleWorkspaceError(error, response, next);
  }
});

app.get("/api/project/revision", async (_request, response, next) => {
  try {
    response.json({ revision: await architectureRevision(await currentWorkspaceRoot()) });
  } catch (error) {
    handleWorkspaceError(error, response, next);
  }
});

app.post("/api/scan", async (_request, response, next) => {
  try {
    response.json(await scanWorkspace(await currentWorkspaceRoot()));
  } catch (error) {
    handleWorkspaceError(error, response, next);
  }
});

app.post("/api/context-pack", async (request, response, next) => {
  try {
    const incoming = requireProject(request, response);
    if (!incoming) return;
    const project = await withSavedCodeIntelligence(incoming);
    const targetIds = Array.isArray(request.body.targetIds)
      ? request.body.targetIds.filter((id: unknown): id is string => typeof id === "string")
      : [];
    const goal = typeof request.body.goal === "string" ? request.body.goal : undefined;
    const scope = request.body.scope as ContextPackScope | undefined;
    response.json({ markdown: generateContextPack(project, targetIds, goal, scope ?? "standard") });
  } catch (error) {
    handleWorkspaceError(error, response, next);
  }
});

app.post("/api/proposal", (request, response) => {
  const project = requireProject(request, response);
  if (!project) return;
  const name = typeof request.body.name === "string" ? request.body.name : undefined;
  response.json({ proposal: createProposal(project, name) });
});

app.post("/api/migration-brief", async (request, response, next) => {
  try {
    const incoming = requireProject(request, response);
    if (!incoming) return;
    const project = await withSavedCodeIntelligence(incoming);
    const proposalId = request.body.proposalId as string | undefined;
    const proposal = project.proposals.find((item) => item.id === proposalId);
    response.json({ markdown: generateMigrationBrief(project, proposal) });
  } catch (error) {
    handleWorkspaceError(error, response, next);
  }
});

async function withSavedCodeIntelligence(project: AtlasProject): Promise<AtlasProject> {
  if (hasCodeIntelligence(project.intelligence ?? emptyCodeIntelligence())) return project;
  return {
    ...project,
    intelligence: await loadCodeIntelligence(await currentWorkspaceRoot())
  };
}

function hasCodeIntelligence(intelligence: CodeIntelligence) {
  return Boolean(
    intelligence.generatedAt ||
    intelligence.projectStructure.length ||
    intelligence.files.length ||
    intelligence.symbols.length ||
    intelligence.classes.length ||
    intelligence.routes.length ||
    (intelligence.schemas?.length ?? 0) ||
    intelligence.dependencies.length ||
    intelligence.testMap.length
  );
}

function handleWorkspaceError(error: unknown, response: express.Response, next: express.NextFunction) {
  if (error instanceof NoWorkspaceError) {
    response.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  next(error);
}

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  // Log the full error server-side for diagnosis, but never leak internal
  // details (fs error messages embed absolute paths) to the client.
  console.error("[system-atlas] unhandled request error:", error);
  response.status(500).json({ error: "Internal server error.", code: "internal_error" });
});

function probePortInUse(targetPort: number, host: string, timeoutMs = 400): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (inUse: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(inUse);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(targetPort, host);
  });
}

async function startServer() {
  await bootstrapFromEnv(process.env.SYSTEM_ATLAS_WORKSPACE);

  // On Windows, Docker can hold ":::port" (IPv6) while Express's listen on
  // "127.0.0.1:port" silently succeeds, leaving the API shadowed. Probe first.
  const [v4InUse, v6InUse] = await Promise.all([
    probePortInUse(port, "127.0.0.1"),
    probePortInUse(port, "::1")
  ]);
  if (v4InUse || v6InUse) {
    console.error(`\nSystem Atlas API cannot start: port ${port} is already in use by another process.`);
    console.error(`Pick a different port via SYSTEM_ATLAS_API_PORT, e.g.:`);
    console.error(`  SYSTEM_ATLAS_API_PORT=5177 npm run dev`);
    console.error(`(also set SYSTEM_ATLAS_WEB_PORT if your Vite port is taken).\n`);
    process.exit(1);
  }

  const server = app.listen(port, "127.0.0.1", () => {
    console.log(`System Atlas API listening on http://127.0.0.1:${port}`);
    getCurrentWorkspace()
      .then((workspace) => {
        console.log(workspace ? `Current workspace: ${workspace.path}` : "No workspace selected yet — add one from the UI.");
      })
      .catch((error) => {
        console.error("[system-atlas] could not read the workspace registry:", error);
      });
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`\nSystem Atlas API cannot bind to port ${port} — it is already in use.`);
      console.error(`Pick a different port via SYSTEM_ATLAS_API_PORT, e.g.:`);
      console.error(`  SYSTEM_ATLAS_API_PORT=5177 npm run dev\n`);
      process.exit(1);
    }
    throw error;
  });

  // Graceful shutdown: stop accepting connections and let in-flight requests
  // (an exportAtlas mid-write, in particular) finish instead of being killed
  // half-way through the user's source-of-truth pack.
  const shutdown = (signal: NodeJS.Signals) => {
    console.log(`\n[system-atlas] received ${signal}; finishing in-flight requests…`);
    server.close(() => process.exit(0));
    // Failsafe if a request hangs: exit anyway after a short drain window.
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("[system-atlas] failed to start:", error);
  process.exit(1);
});
