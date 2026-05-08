import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanWorkspace } from "./atlasFiles";

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
