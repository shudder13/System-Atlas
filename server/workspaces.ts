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

// Serialize read-modify-write sequences on the registry. saveRegistry is atomic
// at the OS level (temp + rename), but two concurrent mutators would each load
// the same base and the later save would clobber the earlier (lost update).
let registryWriteChain: Promise<unknown> = Promise.resolve();
function withRegistryLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = registryWriteChain.then(operation, operation);
  registryWriteChain = result.then(() => undefined, () => undefined);
  return result;
}

async function ensureRegistryDir(): Promise<void> {
  await fs.mkdir(registryDir, { recursive: true });
}

export async function loadRegistry(): Promise<WorkspaceRegistry> {
  let raw: string;
  try {
    raw = await fs.readFile(registryPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...emptyRegistry };
    throw error;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceRegistry>;
    return {
      workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
      currentWorkspaceId: typeof parsed.currentWorkspaceId === "string" ? parsed.currentWorkspaceId : null
    };
  } catch (error) {
    // A corrupt registry (truncated write, manual edit, BOM) must not take the
    // entire API down on every request. Preserve the bad file for inspection and
    // start fresh; the user re-adds their workspaces.
    console.error("[system-atlas] workspaces.json is corrupt; starting with an empty registry.", error);
    await fs.rename(registryPath, `${registryPath}.corrupt`).catch(() => {});
    return { ...emptyRegistry };
  }
}

async function saveRegistry(registry: WorkspaceRegistry): Promise<void> {
  await ensureRegistryDir();
  const tempPath = `${registryPath}.${process.pid}.tmp`;
  try {
    await fs.writeFile(tempPath, JSON.stringify(registry, null, 2) + "\n", "utf8");
    await fs.rename(tempPath, registryPath);
  } catch (error) {
    // Don't leak the temp file if the write or rename failed.
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
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

// Comparison key for de-duplicating workspace paths. On case-insensitive
// filesystems (Windows, default macOS) the same directory differing only in
// case is the same workspace, so the stored path keeps its original case but
// comparisons fold case.
function pathKey(workspacePath: string): string {
  const resolved = path.resolve(workspacePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
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

  return withRegistryLock(async () => {
    const registry = await loadRegistry();
    const existing = registry.workspaces.find((w) => pathKey(w.path) === pathKey(absolutePath));
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
  });
}

export async function removeWorkspace(id: string): Promise<WorkspaceRegistry> {
  return withRegistryLock(async () => {
    const registry = await loadRegistry();
    if (!registry.workspaces.some((w) => w.id === id)) {
      throw Object.assign(new Error(`Unknown workspace id: ${id}`), { code: "workspace_not_found" });
    }
    const next = registry.workspaces.filter((w) => w.id !== id);
    const currentWorkspaceId =
      registry.currentWorkspaceId === id
        ? next[0]?.id ?? null
        : registry.currentWorkspaceId;
    const updated: WorkspaceRegistry = { workspaces: next, currentWorkspaceId };
    await saveRegistry(updated);
    return updated;
  });
}

export async function selectWorkspace(id: string): Promise<Workspace> {
  return withRegistryLock(async () => {
    const registry = await loadRegistry();
    const workspace = registry.workspaces.find((w) => w.id === id);
    if (!workspace) {
      throw Object.assign(new Error(`Unknown workspace id: ${id}`), { code: "workspace_not_found" });
    }
    workspace.lastOpenedAt = nowIso();
    registry.currentWorkspaceId = id;
    await saveRegistry(registry);
    return workspace;
  });
}

export async function renameWorkspace(id: string, name: string): Promise<Workspace> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw Object.assign(new Error("Workspace name cannot be empty"), { code: "invalid_name" });
  }
  return withRegistryLock(async () => {
    const registry = await loadRegistry();
    const workspace = registry.workspaces.find((w) => w.id === id);
    if (!workspace) {
      throw Object.assign(new Error(`Unknown workspace id: ${id}`), { code: "workspace_not_found" });
    }
    workspace.name = trimmed;
    await saveRegistry(registry);
    return workspace;
  });
}

export async function bootstrapFromEnv(envWorkspacePath: string | undefined): Promise<void> {
  if (!envWorkspacePath) return;
  const absolutePath = canonicalize(envWorkspacePath);
  if (!(await pathExists(absolutePath))) return;

  await withRegistryLock(async () => {
    const registry = await loadRegistry();
    const existing = registry.workspaces.find((w) => pathKey(w.path) === pathKey(absolutePath));
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
  });
}
