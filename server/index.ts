import express from "express";
import path from "node:path";
import { templates } from "../src/data/templates";
import { createProposal, generateContextPack, generateMigrationBrief, validateAtlas } from "../src/lib/atlas";
import { AtlasProject } from "../src/types";
import { architectureRevision, exportAtlas, loadAtlas, scanWorkspace } from "./atlasFiles";

const app = express();
const port = Number(process.env.SYSTEM_ATLAS_API_PORT ?? 5174);
const workspaceRoot = path.resolve(process.env.SYSTEM_ATLAS_WORKSPACE ?? process.cwd());

app.use(express.json({ limit: "20mb" }));

app.get("/api/templates", (_request, response) => {
  response.json({ templates });
});

app.get("/api/project", async (_request, response, next) => {
  try {
    const project = await loadAtlas(workspaceRoot);
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

app.post("/api/draft/validate", (request, response) => {
  const project = request.body.project as AtlasProject;
  response.json({ issues: validateAtlas(project) });
});

app.post("/api/export", async (request, response, next) => {
  try {
    const project = request.body.project as AtlasProject;
    const result = await exportAtlas(workspaceRoot, project);
    const revision = await architectureRevision(workspaceRoot);
    response.json({ ok: true, revision, ...result });
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
    const evidence = await scanWorkspace(workspaceRoot);
    response.json({ evidence });
  } catch (error) {
    next(error);
  }
});

app.post("/api/context-pack", (request, response) => {
  const project = request.body.project as AtlasProject;
  const targetIds = request.body.targetIds as string[] | undefined;
  const goal = request.body.goal as string | undefined;
  response.json({ markdown: generateContextPack(project, targetIds ?? [], goal) });
});

app.post("/api/proposal", (request, response) => {
  const project = request.body.project as AtlasProject;
  const name = request.body.name as string | undefined;
  response.json({ proposal: createProposal(project, name) });
});

app.post("/api/migration-brief", (request, response) => {
  const project = request.body.project as AtlasProject;
  const proposalId = request.body.proposalId as string | undefined;
  const proposal = project.proposals.find((item) => item.id === proposalId);
  response.json({ markdown: generateMigrationBrief(project, proposal) });
});

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  response.status(500).json({ error: error.message });
});

app.listen(port, () => {
  console.log(`System Atlas API listening on http://localhost:${port}`);
  console.log(`Workspace root: ${workspaceRoot}`);
});
