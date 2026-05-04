import { AtlasProject, AtlasProposal, CodeEvidence, ContextPackScope, ValidationIssue } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  project: () => request<{ project: AtlasProject; workspace: string; revision: string; loadedFromDisk: boolean }>("/api/project"),
  projectRevision: () => request<{ revision: string }>("/api/project/revision"),
  templates: () => request<{ templates: Array<{ id: string; name: string; description: string; project: AtlasProject }> }>("/api/templates"),
  validate: (project: AtlasProject) => request<{ issues: ValidationIssue[] }>("/api/draft/validate", { method: "POST", body: JSON.stringify({ project }) }),
  export: (project: AtlasProject) => request<{ ok: boolean; revision: string; files: string[]; issues: ValidationIssue[] }>("/api/export", { method: "POST", body: JSON.stringify({ project }) }),
  scan: () => request<{ evidence: CodeEvidence[] }>("/api/scan", { method: "POST" }),
  contextPack: (project: AtlasProject, targetIds: string[], goal: string, scope: ContextPackScope) =>
    request<{ markdown: string }>("/api/context-pack", { method: "POST", body: JSON.stringify({ project, targetIds, goal, scope }) }),
  proposal: (project: AtlasProject, name: string) =>
    request<{ proposal: AtlasProposal }>("/api/proposal", { method: "POST", body: JSON.stringify({ project, name }) }),
  migrationBrief: (project: AtlasProject, proposalId?: string) =>
    request<{ markdown: string }>("/api/migration-brief", { method: "POST", body: JSON.stringify({ project, proposalId }) })
};
