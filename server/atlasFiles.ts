import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";
import YAML from "yaml";
import { AtlasFlow, AtlasNode, AtlasProject, AtlasProposal, AtlasView, CodeEvidence } from "../src/types";
import { defaultViews, generateContextPack, generateMermaid, generateMigrationBrief, generateOverview, validateAtlas } from "../src/lib/atlas";

const conceptFolders: Record<string, string> = {
  system: "services",
  container: "services",
  component: "modules",
  code_symbol: "modules",
  actor: "modules",
  app: "services",
  service: "services",
  module: "modules",
  worker: "services",
  scheduler: "services",
  load_balancer: "services",
  datastore: "datastores",
  replica: "datastores",
  queue: "datastores",
  cache: "datastores",
  external_system: "integrations",
  file_group: "modules",
  contract: "contracts",
  api_contract: "contracts",
  event_contract: "contracts",
  deployment_node: "deployment",
  environment: "deployment",
  region: "deployment",
  data_entity: "datastores",
  schema: "datastores",
  migration: "datastores",
  decision: "decisions",
  quality_scenario: "reliability",
  threat: "security",
  team: "modules",
  flow: "flows",
  risk: "reliability"
};

export async function loadAtlas(root: string): Promise<AtlasProject | null> {
  const snapshotPath = safeJoin(root, "architecture/generated/atlas.json");
  let snapshot: AtlasProject | null = null;
  let snapshotMtime = 0;

  try {
    const snapshotStat = await fs.stat(snapshotPath);
    snapshotMtime = snapshotStat.mtimeMs;
    const raw = await fs.readFile(snapshotPath, "utf8");
    snapshot = JSON.parse(raw) as AtlasProject;
  } catch {
    snapshot = null;
  }

  const authoredMtime = await latestFileMtime(root, "architecture", ["generated"]);
  if (snapshot && snapshotMtime >= authoredMtime) return snapshot;

  const pack = await loadAtlasFromPack(root);
  return pack ?? snapshot;
}

export async function exportAtlas(root: string, project: AtlasProject) {
  const files: string[] = [];
  const architectureRoot = safeJoin(root, "architecture");
  await fs.mkdir(architectureRoot, { recursive: true });

  const manifest = {
    ...project.manifest,
    nodes: project.nodes.map((node) => node.id),
    edges: project.edges,
    flows: project.flows.map((flow) => flow.id),
    proposals: project.proposals.map((proposal) => proposal.id)
  };

  await writeFile(root, "architecture/manifest.yaml", yamlJson(manifest), files);

  for (const node of project.nodes) {
    const folder = conceptFolders[node.type] ?? "modules";
    await writeFile(root, `architecture/${folder}/${slug(node.id)}.md`, conceptMarkdown(node), files);
  }

  for (const flow of project.flows) {
    await writeFile(root, `architecture/flows/${slug(flow.id)}.md`, flowMarkdown(flow), files);
  }

  for (const view of project.views) {
    await writeFile(root, `architecture/views/${slug(view.id)}.yaml`, yamlJson(view), files);
  }

  for (const proposal of project.proposals) {
    const folder = `architecture/proposals/${slug(proposal.id)}`;
    await writeFile(root, `${folder}/proposal.yaml`, yamlJson(proposal), files);
    await writeFile(root, `${folder}/before.yaml`, yamlJson(proposal.before), files);
    await writeFile(root, `${folder}/after.yaml`, yamlJson(proposal.after), files);
    await writeFile(root, `${folder}/migration-brief.md`, generateMigrationBrief(project, proposal), files);
  }

  await writeFile(root, "architecture/evidence/code-map.json", JSON.stringify(project.evidence, null, 2), files);
  await writeFile(root, "architecture/generated/atlas.json", JSON.stringify(project, null, 2), files);
  await writeFile(root, "architecture/generated/overview.md", generateOverview(project), files);
  await writeFile(root, "architecture/generated/context-pack.md", generateContextPack(project), files);

  for (const view of project.views) {
    await writeFile(root, `architecture/generated/diagrams/${slug(view.id)}.mmd`, generateMermaid(project, view.id), files);
  }

  return { files, issues: validateAtlas(project) };
}

export async function architectureRevision(root: string) {
  const architectureRoot = safeJoin(root, "architecture");
  const hash = createHash("sha1");

  try {
    await collectRevision(architectureRoot, architectureRoot, hash);
    return hash.digest("hex");
  } catch {
    return "";
  }
}

async function loadAtlasFromPack(root: string): Promise<AtlasProject | null> {
  const manifestPath = safeJoin(root, "architecture/manifest.yaml");
  try {
    const rawManifest = parseStructured(await fs.readFile(manifestPath, "utf8")) as Record<string, unknown>;
    const { edges = [], ...manifest } = rawManifest;
    const nodes: AtlasNode[] = [];
    const flows: AtlasFlow[] = [];

    for (const folder of unique(Object.values(conceptFolders))) {
      const concepts = await readMarkdownConcepts(root, `architecture/${folder}`);
      for (const concept of concepts) {
        if (!concept || typeof concept !== "object") continue;
        const record = concept as Record<string, unknown>;
        if ("steps" in record) {
          flows.push(record as unknown as AtlasFlow);
        } else if ("type" in record) {
          nodes.push(normalizeNode(record));
        }
      }
    }

    const views = await readJsonFiles<AtlasView>(root, "architecture/views");
    const evidence = await readEvidence(root);
    const proposals = await readProposals(root);

    return {
      manifest: {
        schemaVersion: Number(manifest.schemaVersion ?? 1),
        name: String(manifest.name ?? "System Atlas"),
        description: String(manifest.description ?? "Architecture atlas loaded from repo files."),
        owner: String(manifest.owner ?? "architecture"),
        updatedAt: String(manifest.updatedAt ?? new Date().toISOString())
      },
      nodes,
      edges: edges as AtlasProject["edges"],
      flows,
      views: views.length ? views : defaultViews(),
      proposals,
      evidence
    };
  } catch {
    return null;
  }
}

export async function scanWorkspace(root: string): Promise<CodeEvidence[]> {
  const skip = new Set(["node_modules", ".git", "dist", "build", ".vite", "coverage", "architecture/generated"]);
  const evidence: CodeEvidence[] = [];

  async function walk(directory: string) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).replace(/\\/g, "/");
      if ([...skip].some((segment) => relative === segment || relative.startsWith(`${segment}/`))) continue;

      if (entry.isDirectory()) {
        evidence.push({ path: relative, kind: "directory" });
        await walk(absolute);
        continue;
      }

      const kind = classify(relative);
      if (kind) {
        evidence.push(await indexFile(absolute, relative, kind));
      }
    }
  }

  await walk(root);
  return evidence.slice(0, 2000);
}

async function indexFile(
  absolute: string,
  relative: string,
  kind: Pick<CodeEvidence, "kind" | "language">
): Promise<CodeEvidence> {
  const stat = await fs.stat(absolute);
  const base: CodeEvidence = {
    path: relative,
    kind: kind.kind,
    language: kind.language,
    sizeBytes: stat.size
  };

  if (stat.size > 1_000_000) return base;

  try {
    const text = await fs.readFile(absolute, "utf8");
    const lines = text.split(/\r?\n/).length;
    const withLines = { ...base, lines };

    if (!/\.(ts|tsx|js|jsx)$/.test(relative)) return withLines;

    return {
      ...withLines,
      ...indexTypeScriptSource(relative, text)
    };
  } catch {
    return base;
  }
}

function indexTypeScriptSource(relative: string, text: string): Pick<CodeEvidence, "symbols" | "imports" | "exports" | "routes"> {
  const source = ts.createSourceFile(relative, text, ts.ScriptTarget.Latest, true, scriptKind(relative));
  const symbols: NonNullable<CodeEvidence["symbols"]> = [];
  const imports: string[] = [];
  const exports: string[] = [];
  const routes: string[] = [];

  function lineOf(node: ts.Node) {
    return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  }

  function hasExport(node: ts.Node) {
    return Boolean(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) =>
      modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DefaultKeyword
    ));
  }

  function addSymbol(name: string | undefined, kind: NonNullable<CodeEvidence["symbols"]>[number]["kind"], node: ts.Node, exported = false) {
    if (!name || name === "default") return;
    symbols.push({ name, kind, line: lineOf(node) });
    if (exported) exports.push(name);
  }

  function visit(node: ts.Node) {
    const isTopLevel = node.parent === source;

    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push(node.moduleSpecifier.text);
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      exports.push(`* from ${node.moduleSpecifier.text}`);
    }

    if (isTopLevel && ts.isClassDeclaration(node)) {
      const exported = hasExport(node);
      const className = node.name?.text;
      addSymbol(className, "class", node, exported);

      node.members.forEach((member) => {
        if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
          const isPrivate = ts.canHaveModifiers(member) && ts.getModifiers(member)?.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword);
          if (!isPrivate) addSymbol(`${className ?? "Anonymous"}.${member.name.text}`, "method", member, exported);
        }
      });
    }

    if (isTopLevel && ts.isFunctionDeclaration(node)) {
      addSymbol(node.name?.text, "function", node, hasExport(node));
    }

    if (isTopLevel && ts.isInterfaceDeclaration(node)) {
      addSymbol(node.name.text, "interface", node, hasExport(node));
    }

    if (isTopLevel && ts.isTypeAliasDeclaration(node)) {
      addSymbol(node.name.text, "type", node, hasExport(node));
    }

    if (isTopLevel && ts.isVariableStatement(node)) {
      const exported = hasExport(node);
      node.declarationList.declarations.forEach((declaration) => {
        if (ts.isIdentifier(declaration.name)) addSymbol(declaration.name.text, variableSymbolKind(declaration), declaration, exported);
      });
    }

    if (ts.isCallExpression(node)) {
      const route = routeFromCall(node);
      if (route) {
        routes.push(route);
        symbols.push({ name: route, kind: "route", line: lineOf(node) });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);

  return {
    symbols: uniqueSymbols(symbols).slice(0, 80),
    imports: unique(imports).slice(0, 120),
    exports: unique(exports).slice(0, 80),
    routes: unique(routes).slice(0, 80)
  };
}

function scriptKind(relative: string) {
  if (relative.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (relative.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (relative.endsWith(".js")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function routeFromCall(node: ts.CallExpression) {
  if (!ts.isPropertyAccessExpression(node.expression)) return null;
  const method = node.expression.name.text.toLowerCase();
  if (!["get", "post", "put", "patch", "delete", "all", "use"].includes(method)) return null;
  const [firstArg] = node.arguments;
  if (!firstArg || !ts.isStringLiteral(firstArg)) return null;
  return `${method.toUpperCase()} ${firstArg.text}`;
}

function variableSymbolKind(declaration: ts.VariableDeclaration): NonNullable<CodeEvidence["symbols"]>[number]["kind"] {
  const initializer = declaration.initializer;
  if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) return "function";
  return "constant";
}

function conceptMarkdown(node: AtlasNode) {
  return [
    "---",
    yamlJson({
      id: node.id,
      type: node.type,
      name: node.name,
      owner: node.owner,
      status: node.status,
      criticality: node.criticality,
      responsibilities: node.responsibilities,
      dependencies: node.dependencies,
      invariants: node.invariants,
      linked_files: node.linkedFiles,
      linked_tests: node.linkedTests,
      risks: node.risks,
      confidence: node.confidence,
      notes: node.notes ?? "",
      position: node.position,
      tags: node.tags ?? [],
      architecture_level: node.architectureLevel,
      metadata: node.metadata ?? {}
    }),
    "---",
    "",
    `# ${node.name}`,
    "",
    node.notes || "No architecture notes yet.",
    ""
  ].join("\n");
}

function flowMarkdown(flow: AtlasFlow) {
  return [
    "---",
    yamlJson(flow),
    "---",
    "",
    `# ${flow.name}`,
    "",
    flow.description,
    "",
    "## Steps",
    "",
    ...flow.steps.map((step) => `- ${step.label}${step.nodeId ? ` (${step.nodeId})` : ""}`),
    ""
  ].join("\n");
}

async function readMarkdownConcepts(root: string, relativeFolder: string) {
  const directory = safeJoin(root, relativeFolder);
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const concepts: unknown[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const raw = await fs.readFile(path.join(directory, entry.name), "utf8");
      const parsed = parseFrontmatter(raw);
      if (parsed) concepts.push(parsed);
    }
    return concepts;
  } catch {
    return [];
  }
}

async function readJsonFiles<T>(root: string, relativeFolder: string): Promise<T[]> {
  const directory = safeJoin(root, relativeFolder);
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const values: T[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(json|yaml|yml)$/.test(entry.name)) continue;
      const raw = await fs.readFile(path.join(directory, entry.name), "utf8");
      values.push(parseStructured(raw) as T);
    }
    return values;
  } catch {
    return [];
  }
}

async function readEvidence(root: string) {
  try {
    return JSON.parse(await fs.readFile(safeJoin(root, "architecture/evidence/code-map.json"), "utf8")) as CodeEvidence[];
  } catch {
    return [];
  }
}

async function readProposals(root: string) {
  const proposalsRoot = safeJoin(root, "architecture/proposals");
  try {
    const entries = await fs.readdir(proposalsRoot, { withFileTypes: true });
    const proposals: AtlasProposal[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const proposalPath = path.join(proposalsRoot, entry.name, "proposal.yaml");
      try {
        proposals.push(parseStructured(await fs.readFile(proposalPath, "utf8")) as AtlasProposal);
      } catch {
        continue;
      }
    }
    return proposals;
  } catch {
    return [];
  }
}

async function latestFileMtime(root: string, relativeFolder: string, excludedFolders: string[] = []) {
  const directory = safeJoin(root, relativeFolder);
  let latest = 0;

  async function walk(current: string) {
    let entries: Array<import("node:fs").Dirent>;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(directory, absolute).replace(/\\/g, "/");
      if (excludedFolders.some((folder) => relative === folder || relative.startsWith(`${folder}/`))) continue;

      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }

      const stat = await fs.stat(absolute);
      latest = Math.max(latest, stat.mtimeMs);
    }
  }

  await walk(directory);
  return latest;
}

async function collectRevision(root: string, current: string, hash: ReturnType<typeof createHash>) {
  const entries = await fs.readdir(current, { withFileTypes: true });

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name === ".DS_Store") continue;
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      await collectRevision(root, absolute, hash);
      continue;
    }

    const stat = await fs.stat(absolute);
    hash.update(`${relative}:${stat.size}:${Math.round(stat.mtimeMs)}\n`);
  }
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return parseStructured(match[1]);
}

function parseStructured(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return YAML.parse(raw);
  }
}

function normalizeNode(value: Record<string, unknown>): AtlasNode {
  return {
    id: String(value.id),
    type: value.type as AtlasNode["type"],
    name: String(value.name),
    owner: String(value.owner ?? "architecture"),
    status: (value.status as AtlasNode["status"]) ?? "unknown",
    criticality: (value.criticality as AtlasNode["criticality"]) ?? "medium",
    responsibilities: arrayOfStrings(value.responsibilities),
    dependencies: arrayOfStrings(value.dependencies),
    invariants: arrayOfStrings(value.invariants),
    linkedFiles: arrayOfStrings(value.linkedFiles ?? value.linked_files),
    linkedTests: arrayOfStrings(value.linkedTests ?? value.linked_tests),
    risks: arrayOfStrings(value.risks),
    confidence: (value.confidence as AtlasNode["confidence"]) ?? "manual",
    notes: typeof value.notes === "string" ? value.notes : "",
    position: value.position as AtlasNode["position"],
    tags: arrayOfStrings(value.tags),
    architectureLevel: value.architectureLevel as AtlasNode["architectureLevel"] ?? value.architecture_level as AtlasNode["architectureLevel"],
    metadata: typeof value.metadata === "object" && value.metadata !== null ? value.metadata as AtlasNode["metadata"] : {}
  };
}

async function writeFile(root: string, relative: string, content: string, files: string[]) {
  const absolute = safeJoin(root, relative);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, content, "utf8");
  files.push(relative);
}

function safeJoin(root: string, relative: string) {
  const resolvedRoot = path.resolve(root);
  const absolute = path.resolve(root, relative);
  const fromRoot = path.relative(resolvedRoot, absolute);
  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) {
    throw new Error(`Path escapes workspace: ${relative}`);
  }
  return absolute;
}

function yamlJson(value: unknown) {
  return YAML.stringify(value, { lineWidth: 0 });
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
}

function classify(relative: string): Pick<CodeEvidence, "kind" | "language"> | null {
  if (/(openapi|asyncapi|swagger)\.(json|ya?ml)$/.test(relative) || /\.(graphql|proto)$/.test(relative)) return { kind: "contract", language: language(relative) };
  if (/\.(test|spec)\.(ts|tsx|js|jsx|py|rb|go|rs)$/.test(relative)) return { kind: "test", language: language(relative) };
  if (/migrations?\//.test(relative) || /migrations?.*\.(sql|ts|js)$/.test(relative)) return { kind: "migration", language: language(relative) };
  if (/\.(ts|tsx|js|jsx|py|rb|go|rs|java|cs|php|sql)$/.test(relative)) return { kind: "source", language: language(relative) };
  if (/\.(json|yaml|yml|toml|env|config\.[a-z]+)$/.test(relative)) return { kind: "config", language: language(relative) };
  if (/\.(md|mdx|txt)$/.test(relative)) return { kind: "document", language: "markdown" };
  return null;
}

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function uniqueSymbols(symbols: NonNullable<CodeEvidence["symbols"]>) {
  const seen = new Set<string>();
  return symbols.filter((symbol) => {
    const key = `${symbol.kind}:${symbol.name}:${symbol.line ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function language(relative: string) {
  const ext = relative.split(".").at(-1);
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript-react",
    js: "javascript",
    jsx: "javascript-react",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    cs: "csharp",
    php: "php",
    sql: "sql",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml"
  };
  return ext ? map[ext] : undefined;
}
