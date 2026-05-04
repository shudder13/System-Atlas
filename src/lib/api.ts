import { AtlasProject, AtlasProposal, CodeScanResult, ContextPackScope, ValidationIssue } from "../types";

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init
  });

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
  project: () => request<{ project: AtlasProject; workspace: string; revision: string; loadedFromDisk: boolean }>("/api/project"),
  projectRevision: () => request<{ revision: string }>("/api/project/revision"),
  templates: () => request<{ templates: Array<{ id: string; name: string; description: string; project: AtlasProject }> }>("/api/templates"),
  validate: (project: AtlasProject) => request<{ issues: ValidationIssue[] }>("/api/draft/validate", { method: "POST", body: JSON.stringify({ project }) }),
  export: (project: AtlasProject, options: { baseRevision?: string; force?: boolean } = {}) =>
    request<{ ok: boolean; revision: string; files: string[]; issues: ValidationIssue[] }>("/api/export", {
      method: "POST",
      body: JSON.stringify({ project, ...options })
    }),
  scan: () => request<CodeScanResult>("/api/scan", { method: "POST" }),
  contextPack: (project: AtlasProject, targetIds: string[], goal: string, scope: ContextPackScope) =>
    request<{ markdown: string }>("/api/context-pack", { method: "POST", body: JSON.stringify({ project, targetIds, goal, scope }) }),
  proposal: (project: AtlasProject, name: string) =>
    request<{ proposal: AtlasProposal }>("/api/proposal", { method: "POST", body: JSON.stringify({ project, name }) }),
  migrationBrief: (project: AtlasProject, proposalId?: string) =>
    request<{ markdown: string }>("/api/migration-brief", { method: "POST", body: JSON.stringify({ project, proposalId }) })
};
