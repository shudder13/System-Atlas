import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { exportAtlas, loadAtlas, packHealth, safeJoin, scanWorkspace } from "./atlasFiles";
import { createEmptyProject, createNode } from "../src/lib/atlas";

async function tempWorkspace() {
  return fs.mkdtemp(path.join(os.tmpdir(), "system-atlas-scan-"));
}

async function writeFixture(root: string, relative: string, content: string) {
  const absolute = path.join(root, relative);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, dedent(content), "utf8");
}

function dedent(content: string) {
  const lines = content.replace(/^\n/, "").replace(/\s+$/, "").split("\n");
  const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^\s*/)?.[0].length ?? 0);
  const indent = indents.length ? Math.min(...indents) : 0;
  return `${lines.map((line) => line.slice(indent)).join("\n")}\n`;
}

describe("workspace scanner", () => {
  it("extracts API routes from OpenAPI contracts and common TypeScript conventions", async () => {
    const root = await tempWorkspace();
    await writeFixture(root, "contracts/openapi.yaml", `
      openapi: 3.0.0
      paths:
        /orders:
          get:
            operationId: listOrders
          post:
            operationId: createOrder
    `);
    await writeFixture(root, "src/orders.controller.ts", `
      import { Controller, Get, Post } from "@nestjs/common";

      @Controller("orders")
      export class OrdersController {
        @Get(":id")
        getOrder() {}

        @Post()
        createOrder() {}
      }
    `);
    await writeFixture(root, "src/server.ts", `
      fastify.route({ method: "DELETE", url: "/orders/:id", handler() {} });
    `);
    await writeFixture(root, "app/api/users/[id]/route.ts", `
      export function GET() {}
      export async function PATCH() {}
    `);

    const result = await scanWorkspace(root);
    const routes = result.intelligence.routes.map((route) => `${route.method} ${route.path}`);

    expect(routes).toContain("GET /orders");
    expect(routes).toContain("POST /orders");
    expect(routes).toContain("GET /orders/:id");
    expect(routes).toContain("POST /orders");
    expect(routes).toContain("DELETE /orders/:id");
    expect(routes).toContain("GET /api/users/:id");
    expect(routes).toContain("PATCH /api/users/:id");
    expect(result.intelligence.files.some((file) => file.exports.includes("listOrders"))).toBe(true);
  });

  it("extracts database schemas from SQL migrations and Prisma models", async () => {
    const root = await tempWorkspace();
    await writeFixture(root, "db/migrations/001_create_orders.sql", `
      CREATE TABLE customers (
        id uuid PRIMARY KEY,
        email text NOT NULL
      );

      CREATE TABLE orders (
        id uuid PRIMARY KEY,
        customer_id uuid NOT NULL REFERENCES customers(id),
        total_cents integer NOT NULL DEFAULT 0
      );

      CREATE INDEX orders_customer_id_idx ON orders(customer_id);
    `);
    await writeFixture(root, "prisma/schema.prisma", `
      model User {
        id String @id
        email String @unique
        posts Post[]
      }

      model Post {
        id String @id
        authorId String
        author User @relation(fields: [authorId], references: [id])

        @@index([authorId])
      }
    `);

    const result = await scanWorkspace(root);
    const schemas = result.intelligence.schemas;
    const orders = schemas.find((schema) => schema.name === "orders");
    const post = schemas.find((schema) => schema.name === "Post");

    expect(schemas.map((schema) => schema.name)).toEqual(expect.arrayContaining(["customers", "orders", "User", "Post"]));
    expect(orders?.columns).toContain("total_cents integer not null default 0");
    expect(orders?.indexes.some((index) => index.startsWith("orders_customer_id_idx"))).toBe(true);
    expect(orders?.relations).toContain("customer_id -> customers.id");
    expect(post?.primaryKeys).toContain("id");
    expect(post?.indexes).toContain("@@index([authorId])");
    expect(post?.relations).toContain("author -> User");
  });
});

async function tempPackRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "system-atlas-pack-"));
}

async function fileExists(target: string) {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
}

async function listFilesRecursive(directory: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else out.push(absolute);
    }
  }
  await walk(directory);
  return out;
}

describe("pack persistence round-trip", () => {
  it("round-trips authored nodes and edges through the markdown pack", async () => {
    const root = await tempPackRoot();
    const project = createEmptyProject("Round Trip");
    project.nodes = [
      {
        ...createNode("service", 0),
        id: "service.api",
        name: "API Service",
        responsibilities: ["serve requests"],
        linkedFiles: ["src/api.ts"],
        linkedTests: ["src/api.test.ts"],
        architectureLevel: "container"
      },
      {
        ...createNode("datastore", 1),
        id: "datastore.main",
        name: "Main DB",
        invariants: ["durable writes"]
      }
    ];
    project.edges = [
      { id: "e1", source: "service.api", target: "datastore.main", type: "writes", label: "persists orders" }
    ];

    await exportAtlas(root, project);
    // Force the pack-parse path rather than the atlas.json snapshot shortcut.
    await fs.rm(path.join(root, "architecture/generated/atlas.json"));

    const loaded = await loadAtlas(root, { includeIntelligence: false });
    expect(loaded).not.toBeNull();
    const byId = new Map(loaded!.nodes.map((node) => [node.id, node]));
    expect(byId.get("service.api")?.name).toBe("API Service");
    // snake_case aliases (linked_files / linked_tests / architecture_level) must round-trip:
    expect(byId.get("service.api")?.linkedFiles).toEqual(["src/api.ts"]);
    expect(byId.get("service.api")?.linkedTests).toEqual(["src/api.test.ts"]);
    expect(byId.get("service.api")?.architectureLevel).toBe("container");
    expect(byId.get("datastore.main")?.invariants).toEqual(["durable writes"]);
    expect(loaded!.edges.find((edge) => edge.id === "e1")?.type).toBe("writes");
    expect(loaded!.edges.find((edge) => edge.id === "e1")?.label).toBe("persists orders");
  });

  it("reaps orphaned files when an entity is deleted, preventing resurrection on reload", async () => {
    const root = await tempPackRoot();
    const project = createEmptyProject("Orphans");
    project.nodes = [
      { ...createNode("service", 0), id: "service.keep", name: "Keep" },
      { ...createNode("service", 1), id: "service.drop", name: "Drop" }
    ];
    await exportAtlas(root, project);
    const dropPath = path.join(root, "architecture/services/service.drop.md");
    expect(await fileExists(dropPath)).toBe(true);

    project.nodes = project.nodes.filter((node) => node.id !== "service.drop");
    await exportAtlas(root, project);

    expect(await fileExists(dropPath)).toBe(false);
    await fs.rm(path.join(root, "architecture/generated/atlas.json"));
    const loaded = await loadAtlas(root, { includeIntelligence: false });
    const ids = loaded!.nodes.map((node) => node.id);
    expect(ids).toContain("service.keep");
    expect(ids).not.toContain("service.drop");
  });

  it("leaves no .tmp files behind and is idempotent across repeated exports", async () => {
    const root = await tempPackRoot();
    const project = createEmptyProject("Idempotent");
    project.nodes = [{ ...createNode("service", 0), id: "service.api", name: "API", responsibilities: ["x"] }];
    await exportAtlas(root, project);
    await exportAtlas(root, project);
    const files = await listFilesRecursive(path.join(root, "architecture"));
    expect(files.some((file) => file.endsWith(".tmp"))).toBe(false);
  });
});

describe("safeJoin path-traversal guard", () => {
  const root = path.resolve(os.tmpdir(), "atlas-guard-root");

  it("allows normal nested paths", () => {
    expect(safeJoin(root, "architecture/services/node.md")).toBe(
      path.resolve(root, "architecture/services/node.md")
    );
  });

  it("rejects parent-escape paths", () => {
    expect(() => safeJoin(root, "../../etc/passwd")).toThrow(/escapes workspace/);
  });

  it("rejects absolute paths", () => {
    const absolute = process.platform === "win32" ? "C:\\Windows\\System32\\drivers" : "/etc/passwd";
    expect(() => safeJoin(root, absolute)).toThrow(/escapes workspace/);
  });
});

describe("packHealth", () => {
  it("reports healthy after a clean export and stale after an authored edit", async () => {
    const root = await tempPackRoot();
    const project = createEmptyProject("Health");
    project.nodes = [{ ...createNode("service", 0), id: "service.api", name: "API", responsibilities: ["x"] }];
    await exportAtlas(root, project);
    expect((await packHealth(root)).status).toBe("healthy");

    const conceptPath = path.join(root, "architecture/services/service.api.md");
    const current = await fs.readFile(conceptPath, "utf8");
    await fs.writeFile(conceptPath, `${current}\n<!-- external edit -->\n`, "utf8");
    expect((await packHealth(root)).status).toBe("stale");
  });

  it("reports missing when generated metadata is absent", async () => {
    const root = await tempPackRoot();
    const project = createEmptyProject("Missing");
    project.nodes = [{ ...createNode("service", 0), id: "service.api", name: "API", responsibilities: ["x"] }];
    await exportAtlas(root, project);
    await fs.rm(path.join(root, "architecture/generated/metadata.json"));
    expect((await packHealth(root)).status).toBe("missing");
  });
});
