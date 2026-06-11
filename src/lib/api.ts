import { AtlasProject, AtlasProposal, CodeScanResult, CodeIntelligence, ContextPackScope, PackHealth, ValidationIssue } from "../types";

export interface Workspace {
  id: string;
  name: string;
  path: string;
  addedAt: string;
  lastOpenedAt: string;
}

export interface WorkspaceRegistry {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
}

type ExportProjectPayload = Omit<AtlasProject, "intelligence"> & { intelligence?: CodeIntelligence };

function projectPayloadForExport(project: AtlasProject, includeIntelligence: boolean): ExportProjectPayload | AtlasProject {
  if (includeIntelligence) return project;
  const { intelligence: _intelligence, ...projectWithoutIntelligence } = project;
  return projectWithoutIntelligence;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Default deadline for API calls; without one a hung request leaves the UI
// spinning forever. Workspace scans and exports legitimately take longer on
// large repos, so those callers pass a bigger budget.
const DEFAULT_TIMEOUT_MS = 30_000;
const LONG_TIMEOUT_MS = 5 * 60_000;

async function request<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init ?? {};
  let response: Response;
  try {
    response = await fetch(path, {
      headers: { "Content-Type": "application/json", ...(rest.headers ?? {}) },
      signal: AbortSignal.timeout(timeoutMs),
      ...rest
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError(`Request timed out after ${Math.round(timeoutMs / 1000)}s: ${path}`, 0, "timeout");
    }
    throw error;
  }

  if (!response.ok) {
    const body = await response.text();
    try {
      const parsed = JSON.parse(body) as { error?: string; code?: string };
      throw new ApiError(parsed.error ?? body, response.status, parsed.code, parsed);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(body || `${response.status} ${response.statusText}`, response.status);
    }
  }

  return response.json() as Promise<T>;
}

export const api = {
  workspaces: () => request<WorkspaceRegistry>("/api/workspaces"),
  addWorkspace: (path: string, name?: string) =>
    request<{ workspace: Workspace; created: boolean }>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ path, name })
    }),
  selectWorkspace: (id: string) =>
    request<{ workspace: Workspace }>(`/api/workspaces/${encodeURIComponent(id)}/select`, { method: "POST" }),
  renameWorkspace: (id: string, name: string) =>
    request<{ workspace: Workspace }>(`/api/workspaces/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name })
    }),
  removeWorkspace: (id: string) =>
    request<WorkspaceRegistry>(`/api/workspaces/${encodeURIComponent(id)}`, { method: "DELETE" }),
  project: () => request<{ project: AtlasProject; workspace: string; revision: string; loadedFromDisk: boolean }>("/api/project"),
  projectRevision: () => request<{ revision: string }>("/api/project/revision"),
  codeIntelligence: () => request<{ intelligence: CodeIntelligence }>("/api/code-intelligence"),
  packHealth: () => request<{ packHealth: PackHealth }>("/api/pack-health"),
  templates: () => request<{ templates: Array<{ id: string; name: string; description: string; project: AtlasProject }> }>("/api/templates"),
  validate: (project: AtlasProject) => request<{ issues: ValidationIssue[] }>("/api/draft/validate", { method: "POST", body: JSON.stringify({ project }) }),
  export: (project: AtlasProject, options: { baseRevision?: string; force?: boolean; includeIntelligence?: boolean } = {}) => {
    const includeIntelligence = options.includeIntelligence ?? false;
    return request<{ ok: boolean; revision: string; files: string[]; issues: ValidationIssue[]; packHealth: PackHealth }>("/api/export", {
      method: "POST",
      timeoutMs: LONG_TIMEOUT_MS,
      body: JSON.stringify({
        project: projectPayloadForExport(project, includeIntelligence),
        baseRevision: options.baseRevision,
        force: options.force,
        includeIntelligence
      })
    });
  },
  scan: () => request<CodeScanResult>("/api/scan", { method: "POST", timeoutMs: LONG_TIMEOUT_MS }),
  contextPack: (project: AtlasProject, targetIds: string[], goal: string, scope: ContextPackScope, includeIntelligence = false) =>
    request<{ markdown: string }>("/api/context-pack", {
      method: "POST",
      body: JSON.stringify({ project: projectPayloadForExport(project, includeIntelligence), targetIds, goal, scope })
    }),
  proposal: (project: AtlasProject, name: string) =>
    request<{ proposal: AtlasProposal }>("/api/proposal", { method: "POST", body: JSON.stringify({ project, name }) }),
  migrationBrief: (project: AtlasProject, proposalId?: string, includeIntelligence = false) =>
    request<{ markdown: string }>("/api/migration-brief", {
      method: "POST",
      body: JSON.stringify({ project: projectPayloadForExport(project, includeIntelligence), proposalId })
    })
};
