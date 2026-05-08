import express from "express";
import path from "node:path";
import { templates } from "../src/data/templates";
import { createProposal, emptyCodeIntelligence, generateContextPack, generateMigrationBrief, validateAtlas } from "../src/lib/atlas";
import { AtlasProject, CodeIntelligence, ContextPackScope } from "../src/types";
import { architectureRevision, exportAtlas, loadAtlas, loadCodeIntelligence, packHealth, scanWorkspace } from "./atlasFiles";

const app = express();
const port = Number(process.env.SYSTEM_ATLAS_API_PORT ?? 5174);
const workspaceRoot = path.resolve(process.env.SYSTEM_ATLAS_WORKSPACE ?? process.cwd());

app.use(express.json({ limit: "20mb" }));

type ExportAtlasProject = Omit<AtlasProject, "intelligence"> & { intelligence?: CodeIntelligence };

app.get("/api/templates", (_request, response) => {
  response.json({ templates });
});

app.get("/api/project", async (_request, response, next) => {
  try {
    const project = await loadAtlas(workspaceRoot, { includeIntelligence: false });
    const revision = await architectureRevision(workspaceRoot);
    response.json({
      workspace: workspaceRoot,
      revision,
      loadedFromDisk: Boolean(project),
      project: project ?? templates[0].project
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/code-intelligence", async (_request, response, next) => {
  try {
    response.json({ intelligence: await loadCodeIntelligence(workspaceRoot) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/pack-health", async (_request, response, next) => {
  try {
    response.json({ packHealth: await packHealth(workspaceRoot) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/draft/validate", (request, response) => {
  const project = request.body.project as AtlasProject;
  response.json({ issues: validateAtlas(project) });
});

app.post("/api/export", async (request, response, next) => {
  try {
    const incomingProject = request.body.project as ExportAtlasProject;
    const baseRevision = typeof request.body.baseRevision === "string" ? request.body.baseRevision : undefined;
    const force = Boolean(request.body.force);
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
  } catch (error) {
    next(error);
  }
});

app.get("/api/project/revision", async (_request, response, next) => {
  try {
    response.json({ revision: await architectureRevision(workspaceRoot) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/scan", async (_request, response, next) => {
  try {
    response.json(await scanWorkspace(workspaceRoot));
  } catch (error) {
    next(error);
  }
});

app.post("/api/context-pack", async (request, response, next) => {
  try {
    const project = await withSavedCodeIntelligence(request.body.project as AtlasProject);
    const targetIds = request.body.targetIds as string[] | undefined;
    const goal = request.body.goal as string | undefined;
    const scope = request.body.scope as ContextPackScope | undefined;
    response.json({ markdown: generateContextPack(project, targetIds ?? [], goal, scope ?? "standard") });
  } catch (error) {
    next(error);
  }
});

app.post("/api/proposal", (request, response) => {
  const project = request.body.project as AtlasProject;
  const name = request.body.name as string | undefined;
  response.json({ proposal: createProposal(project, name) });
});

app.post("/api/migration-brief", async (request, response, next) => {
  try {
    const project = await withSavedCodeIntelligence(request.body.project as AtlasProject);
    const proposalId = request.body.proposalId as string | undefined;
    const proposal = project.proposals.find((item) => item.id === proposalId);
    response.json({ markdown: generateMigrationBrief(project, proposal) });
  } catch (error) {
    next(error);
  }
});

async function withSavedCodeIntelligence(project: AtlasProject): Promise<AtlasProject> {
  if (hasCodeIntelligence(project.intelligence ?? emptyCodeIntelligence())) return project;
  return {
    ...project,
    intelligence: await loadCodeIntelligence(workspaceRoot)
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

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  response.status(500).json({ error: error.message });
});

app.listen(port, () => {
  console.log(`System Atlas API listening on http://localhost:${port}`);
  console.log(`Workspace root: ${workspaceRoot}`);
});
