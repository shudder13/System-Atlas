import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

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

const registryDir =
  process.platform === "win32"
    ? path.join(process.env.APPDATA ?? os.homedir(), "system-atlas")
    : path.join(os.homedir(), ".system-atlas");

const registryPath = path.join(registryDir, "workspaces.json");

const emptyRegistry: WorkspaceRegistry = { workspaces: [], currentWorkspaceId: null };

async function ensureRegistryDir(): Promise<void> {
  await fs.mkdir(registryDir, { recursive: true });
}

export async function loadRegistry(): Promise<WorkspaceRegistry> {
  try {
    const raw = await fs.readFile(registryPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<WorkspaceRegistry>;
    return {
      workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
      currentWorkspaceId: typeof parsed.currentWorkspaceId === "string" ? parsed.currentWorkspaceId : null
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...emptyRegistry };
    throw error;
  }
}

async function saveRegistry(registry: WorkspaceRegistry): Promise<void> {
  await ensureRegistryDir();
  const tempPath = `${registryPath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(registry, null, 2) + "\n", "utf8");
  await fs.rename(tempPath, registryPath);
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultNameFor(workspacePath: string): string {
  return path.basename(workspacePath) || workspacePath;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    const stat = await fs.stat(target);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function canonicalize(workspacePath: string): string {
  return path.resolve(workspacePath);
}

export async function listWorkspaces(): Promise<WorkspaceRegistry> {
  return loadRegistry();
}

export async function getCurrentWorkspace(): Promise<Workspace | null> {
  const registry = await loadRegistry();
  if (!registry.currentWorkspaceId) return null;
  return registry.workspaces.find((w) => w.id === registry.currentWorkspaceId) ?? null;
}

export async function addWorkspace(input: { path: string; name?: string }): Promise<{ workspace: Workspace; created: boolean }> {
  const absolutePath = canonicalize(input.path);
  if (!(await pathExists(absolutePath))) {
    throw Object.assign(new Error(`Path does not exist or is not a directory: ${absolutePath}`), { code: "path_not_found" });
  }

  const registry = await loadRegistry();
  const existing = registry.workspaces.find((w) => canonicalize(w.path) === absolutePath);
  if (existing) {
    existing.lastOpenedAt = nowIso();
    registry.currentWorkspaceId = existing.id;
    await saveRegistry(registry);
    return { workspace: existing, created: false };
  }

  const workspace: Workspace = {
    id: randomUUID(),
    name: input.name?.trim() || defaultNameFor(absolutePath),
    path: absolutePath,
    addedAt: nowIso(),
    lastOpenedAt: nowIso()
  };
  registry.workspaces.push(workspace);
  registry.currentWorkspaceId = workspace.id;
  await saveRegistry(registry);
  return { workspace, created: true };
}

export async function removeWorkspace(id: string): Promise<WorkspaceRegistry> {
  const registry = await loadRegistry();
  const next = registry.workspaces.filter((w) => w.id !== id);
  const currentWorkspaceId =
    registry.currentWorkspaceId === id
      ? next[0]?.id ?? null
      : registry.currentWorkspaceId;
  const updated: WorkspaceRegistry = { workspaces: next, currentWorkspaceId };
  await saveRegistry(updated);
  return updated;
}

export async function selectWorkspace(id: string): Promise<Workspace> {
  const registry = await loadRegistry();
  const workspace = registry.workspaces.find((w) => w.id === id);
  if (!workspace) {
    throw Object.assign(new Error(`Unknown workspace id: ${id}`), { code: "workspace_not_found" });
  }
  workspace.lastOpenedAt = nowIso();
  registry.currentWorkspaceId = id;
  await saveRegistry(registry);
  return workspace;
}

export async function renameWorkspace(id: string, name: string): Promise<Workspace> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw Object.assign(new Error("Workspace name cannot be empty"), { code: "invalid_name" });
  }
  const registry = await loadRegistry();
  const workspace = registry.workspaces.find((w) => w.id === id);
  if (!workspace) {
    throw Object.assign(new Error(`Unknown workspace id: ${id}`), { code: "workspace_not_found" });
  }
  workspace.name = trimmed;
  await saveRegistry(registry);
  return workspace;
}

export async function bootstrapFromEnv(envWorkspacePath: string | undefined): Promise<void> {
  if (!envWorkspacePath) return;
  const absolutePath = canonicalize(envWorkspacePath);
  if (!(await pathExists(absolutePath))) return;

  const registry = await loadRegistry();
  const existing = registry.workspaces.find((w) => canonicalize(w.path) === absolutePath);
  if (existing) {
    if (registry.currentWorkspaceId !== existing.id) {
      registry.currentWorkspaceId = existing.id;
      existing.lastOpenedAt = nowIso();
      await saveRegistry(registry);
    }
    return;
  }

  const workspace: Workspace = {
    id: randomUUID(),
    name: defaultNameFor(absolutePath),
    path: absolutePath,
    addedAt: nowIso(),
    lastOpenedAt: nowIso()
  };
  registry.workspaces.push(workspace);
  registry.currentWorkspaceId = workspace.id;
  await saveRegistry(registry);
}
