import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const REGISTRY_PATH =
  process.platform === "win32"
    ? path.join(process.env.APPDATA ?? os.homedir(), "system-atlas", "workspaces.json")
    : path.join(os.homedir(), ".system-atlas", "workspaces.json");

async function readRegistryFile() {
  try {
    return JSON.parse(await fs.readFile(REGISTRY_PATH, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function withBackedUpRegistry<T>(fn: () => Promise<T>): Promise<T> {
  const original = await readRegistryFile();
  try {
    await fs.rm(REGISTRY_PATH, { force: true });
    return await fn();
  } finally {
    if (original) {
      await fs.mkdir(path.dirname(REGISTRY_PATH), { recursive: true });
      await fs.writeFile(REGISTRY_PATH, JSON.stringify(original, null, 2) + "\n", "utf8");
    } else {
      await fs.rm(REGISTRY_PATH, { force: true });
    }
  }
}

describe("workspaces registry", () => {
  let tmpDirA: string;
  let tmpDirB: string;

  beforeEach(async () => {
    tmpDirA = await fs.mkdtemp(path.join(os.tmpdir(), "atlas-ws-a-"));
    tmpDirB = await fs.mkdtemp(path.join(os.tmpdir(), "atlas-ws-b-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDirA, { recursive: true, force: true });
    await fs.rm(tmpDirB, { recursive: true, force: true });
  });

  it("starts empty, then adds + lists + selects + removes workspaces", async () => {
    await withBackedUpRegistry(async () => {
      const { addWorkspace, listWorkspaces, selectWorkspace, removeWorkspace, getCurrentWorkspace } = await import("./workspaces");

      const initial = await listWorkspaces();
      expect(initial.workspaces).toEqual([]);
      expect(initial.currentWorkspaceId).toBeNull();

      const first = await addWorkspace({ path: tmpDirA, name: "Project A" });
      expect(first.created).toBe(true);
      expect(first.workspace.name).toBe("Project A");
      expect(first.workspace.path).toBe(path.resolve(tmpDirA));

      const second = await addWorkspace({ path: tmpDirB });
      expect(second.created).toBe(true);
      expect(second.workspace.name).toBe(path.basename(tmpDirB));

      const afterAdd = await listWorkspaces();
      expect(afterAdd.workspaces).toHaveLength(2);
      expect(afterAdd.currentWorkspaceId).toBe(second.workspace.id);
      expect((await getCurrentWorkspace())?.id).toBe(second.workspace.id);

      await selectWorkspace(first.workspace.id);
      expect((await getCurrentWorkspace())?.id).toBe(first.workspace.id);

      const duplicate = await addWorkspace({ path: tmpDirA, name: "Ignored Rename" });
      expect(duplicate.created).toBe(false);
      expect(duplicate.workspace.id).toBe(first.workspace.id);
      expect(duplicate.workspace.name).toBe("Project A");

      await removeWorkspace(first.workspace.id);
      const afterRemove = await listWorkspaces();
      expect(afterRemove.workspaces).toHaveLength(1);
      expect(afterRemove.currentWorkspaceId).toBe(second.workspace.id);
    });
  });

  it("rejects non-existent paths", async () => {
    await withBackedUpRegistry(async () => {
      const { addWorkspace } = await import("./workspaces");
      await expect(
        addWorkspace({ path: path.join(tmpDirA, "does-not-exist") })
      ).rejects.toMatchObject({ code: "path_not_found" });
    });
  });

  it("bootstrapFromEnv adds and selects a workspace if not present", async () => {
    await withBackedUpRegistry(async () => {
      const { bootstrapFromEnv, getCurrentWorkspace, listWorkspaces } = await import("./workspaces");
      await bootstrapFromEnv(tmpDirA);
      const registry = await listWorkspaces();
      const expectedPath = path.resolve(tmpDirA);
      expect(registry.workspaces.some((w) => w.path === expectedPath)).toBe(true);
      expect((await getCurrentWorkspace())?.path).toBe(expectedPath);

      // Idempotent: re-bootstrap does not duplicate.
      const sizeBefore = registry.workspaces.length;
      await bootstrapFromEnv(tmpDirA);
      const after = await listWorkspaces();
      expect(after.workspaces.length).toBe(sizeBefore);
    });
  });
});
