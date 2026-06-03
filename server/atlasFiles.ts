import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import ts from "typescript";
import YAML from "yaml";
import { AtlasFlow, AtlasNode, AtlasProject, AtlasProposal, AtlasVersion, AtlasView, CodeClass, CodeDependency, CodeEvidence, CodeFileSummary, CodeIntelligence, CodeRoute, CodeScanResult, CodeSchema, CodeSymbol, CodeTestMapEntry, PackHealth, PackMetadataSummary, ProjectStructureEntry } from "../src/types";
import { defaultViews, emptyCodeIntelligence, generateArchitectureDoc, generateContextPack, generateMermaid, generateMigrationBrief, generateOverview, validateAtlas } from "../src/lib/atlas";

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
  stakeholder: "stakeholders",
  concern: "concerns",
  flow: "flows",
  risk: "reliability",
  page: "surfaces",
  env_var: "deployment",
  tech_choice: "stack",
  alert: "alerts",
  runbook: "runbooks"
};

export async function loadAtlas(root: string, options: { includeIntelligence?: boolean } = {}): Promise<AtlasProject | null> {
  const includeIntelligence = options.includeIntelligence ?? true;
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
  if (snapshot && snapshotMtime >= authoredMtime) {
    return withOptionalCodeIntelligence(root, normalizeProject(snapshot, { includeIntelligence }), includeIntelligence);
  }

  const pack = await loadAtlasFromPack(root, { includeIntelligence });
  return pack ?? (snapshot ? withOptionalCodeIntelligence(root, normalizeProject(snapshot, { includeIntelligence }), includeIntelligence) : null);
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
    proposals: project.proposals.map((proposal) => proposal.id),
    versions: project.versions.map((version) => version.id)
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

  for (const version of project.versions) {
    await writeFile(root, `architecture/versions/${slug(version.id)}.yaml`, yamlJson(version), files);
  }

  await writeFile(root, "architecture/evidence/code-map.json", JSON.stringify(project.evidence, null, 2), files);
  await writeCodeIntelligenceFiles(root, project.intelligence ?? emptyCodeIntelligence(), files);
  const metadata = await exportMetadata(root, project);
  await writeFile(root, "architecture/evidence/metadata.json", JSON.stringify(metadata.evidence, null, 2), files);
  await writeFile(root, "architecture/generated/atlas.json", JSON.stringify(projectSnapshotForAtlasJson(project), null, 2), files);
  await writeFile(root, "architecture/generated/overview.md", generateOverview(project), files);
  await writeFile(root, "architecture/generated/context-pack.md", generateContextPack(project), files);
  await writeFile(root, "architecture/generated/ARCHITECTURE.md", generateArchitectureDoc(project), files);

  for (const view of project.views) {
    await writeFile(root, `architecture/generated/diagrams/${slug(view.id)}.mmd`, generateMermaid(project, view.id), files);
  }

  await writeFile(root, "architecture/generated/metadata.json", JSON.stringify(metadata.generated, null, 2), files);

  // Reap files for entities that no longer exist in the project (deleted nodes,
  // views, proposals, versions). Runs only after every write has succeeded, so a
  // crash mid-export never deletes a still-valid file. Without this, a deleted
  // node's stale .md would be read back by loadAtlasFromPack and resurrected.
  await removeOrphanedPackFiles(root, new Set(files.map((relative) => safeJoin(root, relative))));

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

export async function architectureSourceRevision(root: string) {
  const architectureRoot = safeJoin(root, "architecture");
  const hash = createHash("sha1");

  try {
    await collectRevision(architectureRoot, architectureRoot, hash, ["generated", "evidence/metadata.json"]);
    return hash.digest("hex");
  } catch {
    return "";
  }
}

export async function packHealth(root: string): Promise<PackHealth> {
  const currentSourceRevision = await architectureSourceRevision(root);
  const generated = await readPackMetadata(root, "architecture/generated/metadata.json");
  const evidence = await readPackMetadata(root, "architecture/evidence/metadata.json");
  const issues: string[] = [];

  if (!generated) issues.push("Generated metadata is missing.");
  if (!evidence) issues.push("Evidence metadata is missing.");

  if (!generated || !evidence) {
    return {
      status: "missing",
      message: "Pack metadata is incomplete. Export the atlas to regenerate derived files.",
      currentSourceRevision,
      generated,
      evidence,
      issues
    };
  }

  if (generated.exportId !== evidence.exportId) {
    issues.push("Generated files and evidence files were produced by different exports.");
  }
  if (generated.architectureSourceRevision !== evidence.architectureSourceRevision) {
    issues.push("Generated files and evidence files reference different architecture source revisions.");
  }

  const staleRevision = generated.architectureSourceRevision !== currentSourceRevision || evidence.architectureSourceRevision !== currentSourceRevision;
  if (staleRevision) {
    issues.push("Authored architecture files changed after the last generated export.");
  }

  if (issues.some((issue) => issue.includes("different"))) {
    return {
      status: "misaligned",
      message: "Generated files and evidence are misaligned.",
      currentSourceRevision,
      generated,
      evidence,
      issues
    };
  }

  if (staleRevision) {
    return {
      status: "stale",
      message: "Generated files are stale relative to authored architecture files.",
      currentSourceRevision,
      generated,
      evidence,
      issues
    };
  }

  return {
    status: "healthy",
    message: "Generated files and evidence match the current architecture source revision.",
    currentSourceRevision,
    generated,
    evidence,
    issues
  };
}

async function loadAtlasFromPack(root: string, options: { includeIntelligence?: boolean } = {}): Promise<AtlasProject | null> {
  const includeIntelligence = options.includeIntelligence ?? true;
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
    const intelligence = includeIntelligence ? await readCodeIntelligence(root) : emptyCodeIntelligence();
    const proposals = await readProposals(root);
    const versions = await readJsonFiles<AtlasVersion>(root, "architecture/versions");

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
      versions,
      evidence,
      intelligence
    };
  } catch {
    return null;
  }
}

export async function loadCodeIntelligence(root: string): Promise<CodeIntelligence> {
  return readCodeIntelligence(root);
}

export async function scanWorkspace(root: string): Promise<CodeScanResult> {
  const skip = new Set(["node_modules", ".git", "dist", "build", ".vite", "coverage", "architecture"]);
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
  const cappedEvidence = evidence.slice(0, 4000);
  return {
    evidence: cappedEvidence,
    intelligence: buildCodeIntelligence(cappedEvidence)
  };
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

    if (isOpenApiFile(relative)) {
      return {
        ...withLines,
        ...indexOpenApiContract(relative, text)
      };
    }

    if (relative.endsWith(".sql")) {
      return {
        ...withLines,
        ...indexSqlSchema(relative, text)
      };
    }

    if (relative.endsWith(".prisma")) {
      return {
        ...withLines,
        ...indexPrismaSchema(relative, text)
      };
    }

    if (!/\.(ts|tsx|js|jsx)$/.test(relative)) return withLines;

    return {
      ...withLines,
      ...indexTypeScriptSource(relative, text)
    };
  } catch {
    return base;
  }
}

function indexTypeScriptSource(relative: string, text: string): Pick<CodeEvidence, "symbols" | "classes" | "imports" | "exports" | "routes"> {
  const source = ts.createSourceFile(relative, text, ts.ScriptTarget.Latest, true, scriptKind(relative));
  const symbols: NonNullable<CodeEvidence["symbols"]> = [];
  const classes: CodeClass[] = [];
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
      if (className) classes.push(extractClass(relative, className, node, source, exported));
      const controllerPrefix = controllerPrefixFromDecorators(node, source);

      node.members.forEach((member) => {
        if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
          const isPrivate = ts.canHaveModifiers(member) && ts.getModifiers(member)?.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword);
          if (!isPrivate) addSymbol(`${className ?? "Anonymous"}.${member.name.text}`, "method", member, exported);
          const decoratedRoute = routeFromDecorators(member, source, controllerPrefix);
          if (decoratedRoute) {
            routes.push(decoratedRoute);
            symbols.push({ name: decoratedRoute, kind: "route", line: lineOf(member) });
          }
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
  for (const route of routesFromFileConvention(relative, symbols)) {
    routes.push(route.route);
    symbols.push({ name: route.route, kind: "route", line: route.line });
  }

  return {
    symbols: uniqueSymbols(symbols).slice(0, 80),
    classes: dedupeClasses(classes).slice(0, 40),
    imports: unique(imports).slice(0, 120),
    exports: unique(exports).slice(0, 80),
    routes: unique(routes).slice(0, 80)
  };
}

function indexOpenApiContract(relative: string, text: string): Pick<CodeEvidence, "symbols" | "exports" | "routes"> {
  const parsed = parseStructured(text) as { paths?: Record<string, Record<string, { operationId?: string }>> };
  const symbols: NonNullable<CodeEvidence["symbols"]> = [];
  const exports: string[] = [];
  const routes: string[] = [];
  const methods = new Set(["get", "post", "put", "patch", "delete", "head", "options", "trace"]);

  for (const [routePath, operations] of Object.entries(parsed.paths ?? {})) {
    for (const [method, operation] of Object.entries(operations ?? {})) {
      if (!methods.has(method.toLowerCase())) continue;
      const route = `${method.toUpperCase()} ${routePath}`;
      routes.push(route);
      symbols.push({ name: route, kind: "route", line: lineOfText(text, routePath) });
      if (operation?.operationId) exports.push(operation.operationId);
    }
  }

  return {
    symbols: uniqueSymbols(symbols).slice(0, 200),
    exports: unique(exports).slice(0, 200),
    routes: unique(routes).slice(0, 200)
  };
}

function indexSqlSchema(relative: string, text: string): Pick<CodeEvidence, "schemas" | "symbols"> {
  const schemas: CodeSchema[] = [];
  const symbols: NonNullable<CodeEvidence["symbols"]> = [];
  const tableIndexes = indexesByTable(text);
  const tablePattern = /create\s+table\s+(?:if\s+not\s+exists\s+)?["`[]?([\w.]+)["`\]]?\s*\(([\s\S]*?)\);/gi;
  let match: RegExpExecArray | null;

  while ((match = tablePattern.exec(text))) {
    const tableName = normalizeSqlIdentifier(match[1]);
    const body = match[2];
    const parsed = parseSqlTableBody(body);
    const schema: CodeSchema = {
      id: schemaId(relative, tableName),
      path: relative,
      name: tableName,
      kind: "table",
      line: lineOfText(text, match[0]),
      columns: parsed.columns,
      primaryKeys: parsed.primaryKeys,
      indexes: tableIndexes.get(tableName) ?? [],
      foreignKeys: parsed.foreignKeys,
      relations: parsed.relations
    };
    schemas.push(schema);
    symbols.push({ name: tableName, kind: "type", line: schema.line });
  }

  return { schemas, symbols };
}

function indexPrismaSchema(relative: string, text: string): Pick<CodeEvidence, "schemas" | "symbols"> {
  const schemas: CodeSchema[] = [];
  const symbols: NonNullable<CodeEvidence["symbols"]> = [];
  const modelPattern = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;
  let match: RegExpExecArray | null;

  while ((match = modelPattern.exec(text))) {
    const modelName = match[1];
    const parsed = parsePrismaModelBody(match[2]);
    const schema: CodeSchema = {
      id: schemaId(relative, modelName),
      path: relative,
      name: modelName,
      kind: "model",
      line: lineOfText(text, match[0]),
      columns: parsed.columns,
      primaryKeys: parsed.primaryKeys,
      indexes: parsed.indexes,
      foreignKeys: parsed.foreignKeys,
      relations: parsed.relations
    };
    schemas.push(schema);
    symbols.push({ name: modelName, kind: "type", line: schema.line });
  }

  return { schemas, symbols };
}

function extractClass(relative: string, className: string, node: ts.ClassDeclaration, source: ts.SourceFile, exported: boolean): CodeClass {
  const attributes: CodeClass["attributes"] = [];
  const methods: CodeClass["methods"] = [];
  let extendsName: string | undefined;
  const implementsNames: string[] = [];

  for (const clause of node.heritageClauses ?? []) {
    for (const heritageType of clause.types) {
      const expression = heritageType.expression.getText(source);
      if (clause.token === ts.SyntaxKind.ExtendsKeyword) extendsName = expression;
      if (clause.token === ts.SyntaxKind.ImplementsKeyword) implementsNames.push(expression);
    }
  }

  node.members.forEach((member) => {
    if (ts.isPropertyDeclaration(member) && member.name) {
      attributes.push({
        name: member.name.getText(source),
        kind: "attribute",
        visibility: visibility(member),
        type: member.type?.getText(source),
        line: lineOfNode(source, member)
      });
    }

    if (ts.isConstructorDeclaration(member)) {
      methods.push({
        name: "constructor",
        kind: "method",
        visibility: visibility(member),
        parameters: member.parameters.map((parameter) => parameter.getText(source)),
        line: lineOfNode(source, member)
      });
      member.parameters.forEach((parameter) => {
        if (ts.canHaveModifiers(parameter) && ts.getModifiers(parameter)?.some((modifier) =>
          [ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ReadonlyKeyword].includes(modifier.kind)
        )) {
          attributes.push({
            name: parameter.name.getText(source),
            kind: "attribute",
            visibility: visibility(parameter),
            type: parameter.type?.getText(source),
            line: lineOfNode(source, parameter)
          });
        }
      });
    }

    if (ts.isMethodDeclaration(member) && member.name) {
      methods.push({
        name: member.name.getText(source),
        kind: "method",
        visibility: visibility(member),
        parameters: member.parameters.map((parameter) => parameter.getText(source)),
        returnType: member.type?.getText(source),
        line: lineOfNode(source, member)
      });
    }
  });

  return {
    id: symbolNodeId(relative, className),
    path: relative,
    name: className,
    line: lineOfNode(source, node),
    exported,
    extends: extendsName,
    implements: implementsNames,
    attributes,
    methods
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
  if (method === "route") return routeFromObjectCall(node);
  if (!["get", "post", "put", "patch", "delete", "all", "use"].includes(method)) return null;
  const [firstArg] = node.arguments;
  if (!firstArg || !ts.isStringLiteral(firstArg)) return null;
  return `${method.toUpperCase()} ${firstArg.text}`;
}

function routeFromObjectCall(node: ts.CallExpression) {
  const [firstArg] = node.arguments;
  if (!firstArg || !ts.isObjectLiteralExpression(firstArg)) return null;
  const method = objectStringProperty(firstArg, "method");
  const routePath = objectStringProperty(firstArg, "url") ?? objectStringProperty(firstArg, "path");
  if (!method || !routePath) return null;
  return `${method.toUpperCase()} ${routePath}`;
}

function objectStringProperty(node: ts.ObjectLiteralExpression, name: string) {
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const propertyName = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : "";
    if (propertyName !== name) continue;
    if (ts.isStringLiteral(property.initializer)) return property.initializer.text;
  }
  return undefined;
}

function controllerPrefixFromDecorators(node: ts.Node, source: ts.SourceFile) {
  const controller = decoratorCall(node, "Controller");
  return controller ? firstDecoratorStringArg(controller, source) ?? "" : "";
}

function routeFromDecorators(node: ts.Node, source: ts.SourceFile, prefix = "") {
  const methods = ["Get", "Post", "Put", "Patch", "Delete", "All"];
  for (const name of methods) {
    const decorator = decoratorCall(node, name);
    if (!decorator) continue;
    const routePath = firstDecoratorStringArg(decorator, source) ?? "";
    const method = name === "All" ? "ALL" : name.toUpperCase();
    return `${method} ${joinRoutePath(prefix, routePath)}`;
  }
  return null;
}

function decoratorCall(node: ts.Node, name: string) {
  const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
  for (const decorator of decorators) {
    const expression = decorator.expression;
    if (ts.isCallExpression(expression) && decoratorName(expression.expression) === name) return expression;
    if (decoratorName(expression) === name) return undefined;
  }
  return undefined;
}

function decoratorName(expression: ts.Expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return "";
}

function firstDecoratorStringArg(call: ts.CallExpression, source: ts.SourceFile) {
  const [firstArg] = call.arguments;
  if (!firstArg) return "";
  if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) return firstArg.text;
  return firstArg.getText(source).replace(/^['"`]|['"`]$/g, "");
}

function joinRoutePath(prefix: string, routePath: string) {
  const joined = [prefix, routePath]
    .filter((part) => part !== undefined && part !== "")
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
  return `/${joined}`;
}

function routesFromFileConvention(relative: string, symbols: NonNullable<CodeEvidence["symbols"]>) {
  const routes: Array<{ route: string; line?: number }> = [];
  const exportedMethods = new Set(symbols.filter((symbol) => symbol.kind === "function").map((symbol) => symbol.name.toUpperCase()));
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

  if (/app\/api\/.+\/route\.(ts|tsx|js|jsx)$/.test(relative)) {
    const routePath = `/${relative.replace(/^.*app\/api\//, "api/").replace(/\/route\.(ts|tsx|js|jsx)$/, "").replace(/\[([^\]]+)\]/g, ":$1")}`;
    for (const method of methods) {
      if (!exportedMethods.has(method)) continue;
      const symbol = symbols.find((item) => item.name.toUpperCase() === method);
      routes.push({ route: `${method} ${routePath}`, line: symbol?.line });
    }
  }

  if (/pages\/api\/.+\.(ts|tsx|js|jsx)$/.test(relative)) {
    const routePath = `/${relative.replace(/^.*pages\/api\//, "api/").replace(/\.(ts|tsx|js|jsx)$/, "").replace(/\/index$/, "").replace(/\[([^\]]+)\]/g, ":$1")}`;
    routes.push({ route: `ALL ${routePath}` });
  }

  return routes;
}

function schemaId(relative: string, name: string) {
  return `schema.${slug(relative)}.${slug(name)}`;
}

function lineOfText(text: string, needle: string) {
  const index = text.indexOf(needle);
  if (index < 0) return undefined;
  return text.slice(0, index).split(/\r?\n/).length;
}

function indexesByTable(text: string) {
  const indexes = new Map<string, string[]>();
  const pattern = /create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?["`[]?([\w.]+)["`\]]?\s+on\s+["`[]?([\w.]+)["`\]]?\s*\(([^)]*)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const indexName = normalizeSqlIdentifier(match[1]);
    const tableName = normalizeSqlIdentifier(match[2]);
    indexes.set(tableName, [...(indexes.get(tableName) ?? []), `${indexName} (${match[3].trim()})`]);
  }
  return indexes;
}

function parseSqlTableBody(body: string) {
  const columns: string[] = [];
  const primaryKeys: string[] = [];
  const foreignKeys: string[] = [];
  const relations: string[] = [];

  for (const rawPart of splitSqlList(body)) {
    const part = rawPart.trim().replace(/\s+/g, " ");
    if (!part) continue;
    const lower = part.toLowerCase();

    if (lower.startsWith("primary key")) {
      primaryKeys.push(...identifiersInParens(part));
      continue;
    }

    if (lower.includes("foreign key") || lower.startsWith("constraint")) {
      const relation = foreignKeyRelation(part);
      if (relation) {
        foreignKeys.push(part);
        relations.push(relation);
      }
      continue;
    }

    if (lower.startsWith("unique") || lower.startsWith("check") || lower.startsWith("constraint")) continue;

    const [nameToken, ...typeParts] = part.split(" ");
    const columnName = normalizeSqlIdentifier(nameToken);
    if (!columnName) continue;
    const typeEnd = typeParts.findIndex((token) => /^(not|null|default|primary|references|constraint|unique|check)$/i.test(token));
    const type = (typeEnd >= 0 ? typeParts.slice(0, typeEnd) : typeParts).join(" ");
    const details = [
      columnName,
      type,
      /not\s+null/i.test(part) ? "not null" : "",
      /primary\s+key/i.test(part) ? "primary key" : "",
      defaultExpression(part)
    ].filter(Boolean).join(" ");
    columns.push(details);
    if (/primary\s+key/i.test(part)) primaryKeys.push(columnName);
    const relation = inlineReferenceRelation(columnName, part);
    if (relation) {
      foreignKeys.push(part);
      relations.push(relation);
    }
  }

  return {
    columns: unique(columns),
    primaryKeys: unique(primaryKeys),
    foreignKeys: unique(foreignKeys),
    relations: unique(relations)
  };
}

function parsePrismaModelBody(body: string) {
  const columns: string[] = [];
  const primaryKeys: string[] = [];
  const indexes: string[] = [];
  const foreignKeys: string[] = [];
  const relations: string[] = [];

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;
    if (line.startsWith("@@")) {
      if (/@@(id|index|unique)/.test(line)) indexes.push(line);
      if (/@@id/.test(line)) primaryKeys.push(...identifiersInBrackets(line));
      continue;
    }

    const [name, type, ...attributes] = line.split(/\s+/);
    if (!name || !type) continue;
    const attrText = attributes.join(" ");
    const details = [name, type, attrText.includes("@id") ? "primary key" : "", attrText.includes("@unique") ? "unique" : ""].filter(Boolean).join(" ");
    columns.push(details);
    if (attrText.includes("@id")) primaryKeys.push(name);
    if (attrText.includes("@unique")) indexes.push(`${name} unique`);
    if (attrText.includes("@relation")) {
      foreignKeys.push(line);
      relations.push(`${name} -> ${basePrismaType(type)}`);
    }
  }

  return {
    columns: unique(columns),
    primaryKeys: unique(primaryKeys),
    indexes: unique(indexes),
    foreignKeys: unique(foreignKeys),
    relations: unique(relations)
  };
}

function splitSqlList(value: string) {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (const char of value) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function identifiersInParens(value: string) {
  const match = value.match(/\(([^)]*)\)/);
  return match ? match[1].split(",").map((item) => normalizeSqlIdentifier(item.trim())).filter(Boolean) : [];
}

function identifiersInBrackets(value: string) {
  const match = value.match(/\[([^\]]*)\]/);
  return match ? match[1].split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function foreignKeyRelation(value: string) {
  const local = identifiersInParens(value)[0];
  const references = value.match(/references\s+["`[]?([\w.]+)["`\]]?\s*\(([^)]*)\)/i);
  if (!local || !references) return null;
  return `${local} -> ${normalizeSqlIdentifier(references[1])}.${normalizeSqlIdentifier(references[2])}`;
}

function inlineReferenceRelation(columnName: string, value: string) {
  const references = value.match(/references\s+["`[]?([\w.]+)["`\]]?\s*(?:\(([^)]*)\))?/i);
  if (!references) return null;
  const targetColumn = references[2] ? `.${normalizeSqlIdentifier(references[2])}` : "";
  return `${columnName} -> ${normalizeSqlIdentifier(references[1])}${targetColumn}`;
}

function defaultExpression(value: string) {
  const match = value.match(/\bdefault\s+([^,]+)$/i);
  return match ? `default ${match[1].trim()}` : "";
}

function normalizeSqlIdentifier(value: string) {
  return value.replace(/["`\[\]]/g, "").trim();
}

function basePrismaType(value: string) {
  return value.replace(/[?\[\]]/g, "");
}

function variableSymbolKind(declaration: ts.VariableDeclaration): NonNullable<CodeEvidence["symbols"]>[number]["kind"] {
  const initializer = declaration.initializer;
  if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) return "function";
  return "constant";
}

function lineOfNode(source: ts.SourceFile, node: ts.Node) {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

function visibility(node: ts.Node) {
  if (!ts.canHaveModifiers(node)) return "public";
  const modifiers = ts.getModifiers(node) ?? [];
  if (modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword)) return "private";
  if (modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ProtectedKeyword)) return "protected";
  return "public";
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
    `**Type:** \`${node.type}\` · **Criticality:** ${node.criticality} · **Status:** ${node.status} · **Confidence:** ${node.confidence}${node.architectureLevel ? ` · **Level:** ${node.architectureLevel}` : ""} · **Owner:** ${node.owner}`,
    ...conceptBodySections(node)
  ].join("\n");
}

function conceptBodySections(node: AtlasNode): string[] {
  const sections: string[] = [];

  if (node.notes && node.notes.trim()) {
    sections.push("", "## Notes", "", node.notes.trim());
  }

  const metadataLines = renderMetadataBullets(node.metadata);
  if (metadataLines.length) {
    sections.push("", "## Metadata", "", ...metadataLines);
  }

  if (node.responsibilities.length) {
    sections.push("", "## Responsibilities", "", ...node.responsibilities.map((item) => `- ${item}`));
  }

  if (node.invariants.length) {
    sections.push("", "## Invariants", "", ...node.invariants.map((item) => `- ${item}`));
  }

  if (node.linkedFiles.length) {
    sections.push("", "## Linked files", "", ...node.linkedFiles.map((item) => `- \`${item}\``));
  }

  if (node.linkedTests.length) {
    sections.push("", "## Linked tests", "", ...node.linkedTests.map((item) => `- \`${item}\``));
  }

  if (node.risks.length) {
    sections.push("", "## Risks", "", ...node.risks.map((item) => `- ${item}`));
  }

  if (node.tags && node.tags.length) {
    sections.push("", "## Tags", "", node.tags.map((tag) => `\`${tag}\``).join(" · "));
  }

  sections.push("");
  return sections;
}

function renderMetadataBullets(metadata: AtlasNode["metadata"]): string[] {
  if (!metadata) return [];
  const entries = Object.entries(metadata).filter(([, value]) => {
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });
  return entries.map(([key, value]) => {
    const label = humanizeMetadataKey(key);
    if (Array.isArray(value)) {
      if (value.length <= 3) return `- **${label}:** ${value.join(", ")}`;
      return `- **${label}:**\n${value.map((v) => `  - ${v}`).join("\n")}`;
    }
    if (typeof value === "boolean") return `- **${label}:** ${value ? "yes" : "no"}`;
    return `- **${label}:** ${value}`;
  });
}

function humanizeMetadataKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
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

function buildCodeIntelligence(evidence: CodeEvidence[]): CodeIntelligence {
  const files = evidence.filter((item) => item.kind !== "directory");
  const knownFiles = new Map(files.map((item) => [item.path, item.path]));
  const dependencies = buildDependencies(files, knownFiles);

  return {
    generatedAt: new Date().toISOString(),
    projectStructure: buildProjectStructure(evidence),
    files: files.map(fileSummary).slice(0, 4000),
    symbols: files.flatMap(codeSymbolsForFile).slice(0, 8000),
    classes: files.flatMap((item) => item.classes ?? []).slice(0, 2000),
    routes: files.flatMap(codeRoutesForFile).slice(0, 2000),
    schemas: files.flatMap((item) => item.schemas ?? []).slice(0, 2000),
    dependencies,
    testMap: buildTestMap(files, dependencies)
  };
}

function buildProjectStructure(evidence: CodeEvidence[]): ProjectStructureEntry[] {
  return evidence.map((item) => ({
    path: item.path,
    name: basename(item.path),
    kind: item.kind === "directory" ? "directory" : "file",
    parent: parentPath(item.path),
    depth: item.path.split("/").length - 1,
    language: item.language,
    sizeBytes: item.sizeBytes,
    lines: item.lines
  }));
}

function fileSummary(item: CodeEvidence): CodeFileSummary {
  return {
    path: item.path,
    kind: item.kind,
    language: item.language,
    lines: item.lines,
    sizeBytes: item.sizeBytes,
    imports: item.imports ?? [],
    exports: item.exports ?? [],
    routes: item.routes ?? [],
    symbols: (item.symbols ?? []).map((symbol) => `${symbol.kind}:${symbol.name}${symbol.line ? `@${symbol.line}` : ""}`),
    schemas: (item.schemas ?? []).map((schema) => `${schema.kind}:${schema.name}`),
    summary: codeEvidenceSummary(item)
  };
}

function codeSymbolsForFile(item: CodeEvidence): CodeSymbol[] {
  const exportedNames = new Set(item.exports ?? []);
  return (item.symbols ?? []).map((symbol) => {
    const classPrefix = symbol.kind === "method" && symbol.name.includes(".") ? symbol.name.split(".")[0] : undefined;
    return {
      id: symbolNodeId(item.path, symbol.name),
      path: item.path,
      name: symbol.name,
      kind: symbol.kind,
      line: symbol.line,
      exported: exportedNames.has(symbol.name) || symbol.kind === "route",
      containerName: classPrefix
    };
  });
}

function codeRoutesForFile(item: CodeEvidence): CodeRoute[] {
  return (item.routes ?? []).map((route) => {
    const [method, ...pathParts] = route.split(" ");
    const routePath = pathParts.join(" ");
    const routeSymbol = item.symbols?.find((symbol) => symbol.kind === "route" && symbol.name === route);
    return {
      id: `${slug(item.path)}-${slug(route)}`,
      method,
      path: routePath,
      sourceFile: item.path,
      line: routeSymbol?.line
    };
  });
}

function buildDependencies(files: CodeEvidence[], knownFiles: Map<string, string>): CodeDependency[] {
  const dependencies: CodeDependency[] = [];
  for (const item of files) {
    for (const importPath of item.imports ?? []) {
      const resolved = resolveImportPath(item.path, importPath, knownFiles);
      dependencies.push({
        source: item.path,
        target: resolved ?? importPath,
        importPath,
        kind: resolved ? "internal" : "external"
      });
    }
  }
  return dedupeDependencies(dependencies).slice(0, 12000);
}

function buildTestMap(files: CodeEvidence[], dependencies: CodeDependency[]): CodeTestMapEntry[] {
  const sourceFiles = files.filter((item) => item.kind !== "test" && ["source", "contract", "migration"].includes(item.kind));
  return files
    .filter((item) => item.kind === "test")
    .map((testFile) => {
      const importedTargets = dependencies
        .filter((dependency) => dependency.source === testFile.path && dependency.kind === "internal")
        .map((dependency) => dependency.target);
      const inferredTargets = sourceFiles
        .filter((sourceFile) => testNameMatchesSource(testFile.path, sourceFile.path))
        .map((sourceFile) => sourceFile.path);
      const targetFiles = unique([...importedTargets, ...inferredTargets]);
      return {
        testFile: testFile.path,
        targetFiles,
        inferred: importedTargets.length === 0 && inferredTargets.length > 0
      };
    })
    .slice(0, 2000);
}

function parentPath(filePath: string) {
  const parent = dirname(filePath);
  return parent === filePath || parent === "" ? undefined : parent;
}

function testNameMatchesSource(testPath: string, sourcePath: string) {
  const normalize = (value: string) => basename(value)
    .replace(/\.(test|spec)\./, ".")
    .replace(/\.(ts|tsx|js|jsx|py|rb|go|rs|java|cs|php)$/, "")
    .toLowerCase();
  return normalize(testPath) === normalize(sourcePath);
}

function dedupeDependencies(dependencies: CodeDependency[]) {
  const seen = new Set<string>();
  return dependencies.filter((dependency) => {
    const key = `${dependency.source}:${dependency.target}:${dependency.importPath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function symbolNodeId(filePath: string, symbolName: string) {
  return `code.symbol.${slug(filePath)}.${slug(symbolName)}`;
}

function basename(filePath: string) {
  return filePath.split("/").at(-1) ?? filePath;
}

function dirname(filePath: string) {
  const parts = filePath.split("/");
  parts.pop();
  return parts.join("/");
}

function normalizePath(value: string) {
  const parts: string[] = [];
  for (const part of value.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

function resolveImportPath(fromPath: string, specifier: string, knownFiles: Map<string, string>) {
  if (!specifier.startsWith(".")) return null;

  const base = normalizePath(`${dirname(fromPath)}/${specifier}`);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`
  ];

  return candidates.find((candidate) => knownFiles.has(candidate)) ?? null;
}

function codeEvidenceSummary(item: CodeEvidence) {
  const parts = [
    `${item.kind}${item.language ? ` · ${item.language}` : ""}`,
    item.lines ? `${item.lines} lines` : "",
    item.exports?.length ? `exports: ${item.exports.slice(0, 8).join(", ")}` : "",
    item.routes?.length ? `routes: ${item.routes.slice(0, 8).join(", ")}` : "",
    item.schemas?.length ? `schemas: ${item.schemas.slice(0, 8).map((schema) => schema.name).join(", ")}` : "",
    item.imports?.length ? `imports: ${item.imports.slice(0, 10).join(", ")}` : ""
  ].filter(Boolean);
  return parts.join("\n");
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

async function readCodeIntelligence(root: string): Promise<CodeIntelligence> {
  try {
    return normalizeCodeIntelligence(JSON.parse(await fs.readFile(safeJoin(root, "architecture/evidence/code-intelligence.json"), "utf8")) as Partial<CodeIntelligence>);
  } catch {
    return {
      generatedAt: "",
      projectStructure: await readEvidenceArray<ProjectStructureEntry>(root, "architecture/evidence/project-structure.json"),
      files: await readEvidenceArray<CodeFileSummary>(root, "architecture/evidence/file-summaries.json"),
      symbols: await readEvidenceArray<CodeSymbol>(root, "architecture/evidence/code-symbols.json"),
      classes: await readEvidenceArray<CodeClass>(root, "architecture/evidence/classes.json"),
      routes: await readEvidenceArray<CodeRoute>(root, "architecture/evidence/routes.json"),
      schemas: await readEvidenceArray<CodeSchema>(root, "architecture/evidence/schemas.json"),
      dependencies: await readEvidenceArray<CodeDependency>(root, "architecture/evidence/dependencies.json"),
      testMap: await readEvidenceArray<CodeTestMapEntry>(root, "architecture/evidence/test-map.json")
    };
  }
}

async function readEvidenceArray<T>(root: string, relative: string): Promise<T[]> {
  try {
    return JSON.parse(await fs.readFile(safeJoin(root, relative), "utf8")) as T[];
  } catch {
    return [];
  }
}

async function readPackMetadata(root: string, relative: string): Promise<PackMetadataSummary | undefined> {
  try {
    return JSON.parse(await fs.readFile(safeJoin(root, relative), "utf8")) as PackMetadataSummary;
  } catch {
    return undefined;
  }
}

async function writeCodeIntelligenceFiles(root: string, intelligence: CodeIntelligence, files: string[]) {
  intelligence = normalizeCodeIntelligence(intelligence);
  await writeFile(root, "architecture/evidence/code-intelligence.json", JSON.stringify(intelligence, null, 2), files);
  await writeFile(root, "architecture/evidence/project-structure.json", JSON.stringify(intelligence.projectStructure, null, 2), files);
  await writeFile(root, "architecture/evidence/file-summaries.json", JSON.stringify(intelligence.files, null, 2), files);
  await writeFile(root, "architecture/evidence/code-symbols.json", JSON.stringify(intelligence.symbols, null, 2), files);
  await writeFile(root, "architecture/evidence/classes.json", JSON.stringify(intelligence.classes, null, 2), files);
  await writeFile(root, "architecture/evidence/routes.json", JSON.stringify(intelligence.routes, null, 2), files);
  await writeFile(root, "architecture/evidence/schemas.json", JSON.stringify(intelligence.schemas ?? [], null, 2), files);
  await writeFile(root, "architecture/evidence/dependencies.json", JSON.stringify(intelligence.dependencies, null, 2), files);
  await writeFile(root, "architecture/evidence/test-map.json", JSON.stringify(intelligence.testMap, null, 2), files);
}

async function exportMetadata(root: string, project: AtlasProject) {
  const generatedAt = new Date().toISOString();
  const exportId = randomUUID();
  const sourceRevision = await architectureSourceRevision(root);
  const intelligence = normalizeCodeIntelligence(project.intelligence);
  const shared = {
    schemaVersion: 1,
    exportId,
    generatedAt,
    architectureSourceRevision: sourceRevision,
    project: {
      name: project.manifest.name,
      updatedAt: project.manifest.updatedAt,
      nodes: project.nodes.length,
      edges: project.edges.length,
      flows: project.flows.length,
      views: project.views.length,
      proposals: project.proposals.length,
      versions: project.versions.length
    }
  };

  const evidence = {
    ...shared,
    kind: "evidence",
    artifacts: {
      codeMap: "architecture/evidence/code-map.json",
      codeIntelligence: "architecture/evidence/code-intelligence.json",
      splitFiles: [
        "architecture/evidence/project-structure.json",
        "architecture/evidence/file-summaries.json",
        "architecture/evidence/classes.json",
        "architecture/evidence/code-symbols.json",
        "architecture/evidence/routes.json",
        "architecture/evidence/schemas.json",
        "architecture/evidence/dependencies.json",
        "architecture/evidence/test-map.json"
      ]
    },
    codeEvidence: {
      items: project.evidence.length
    },
    codeIntelligence: {
      generatedAt: intelligence.generatedAt,
      projectStructure: intelligence.projectStructure.length,
      files: intelligence.files.length,
      symbols: intelligence.symbols.length,
      classes: intelligence.classes.length,
      routes: intelligence.routes.length,
      schemas: intelligence.schemas?.length ?? 0,
      dependencies: intelligence.dependencies.length,
      testMap: intelligence.testMap.length
    }
  };

  const generated = {
    ...shared,
    kind: "generated",
    artifacts: {
      atlasSnapshot: "architecture/generated/atlas.json",
      overview: "architecture/generated/overview.md",
      contextPack: "architecture/generated/context-pack.md",
      architectureDoc: "architecture/generated/ARCHITECTURE.md",
      diagrams: project.views.map((view) => `architecture/generated/diagrams/${slug(view.id)}.mmd`)
    },
    relatedEvidenceMetadata: "architecture/evidence/metadata.json",
    note: "Generated atlas.json is a lightweight architecture snapshot. Persistent code intelligence is stored under architecture/evidence/."
  };

  return { evidence, generated };
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

async function collectRevision(root: string, current: string, hash: ReturnType<typeof createHash>, excludedPaths: string[] = []) {
  const entries = await fs.readdir(current, { withFileTypes: true });

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name === ".DS_Store") continue;
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).replace(/\\/g, "/");
    if (excludedPaths.some((excluded) => relative === excluded || relative.startsWith(`${excluded}/`))) continue;

    if (entry.isDirectory()) {
      await collectRevision(root, absolute, hash, excludedPaths);
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
  // Atomic write: a crash, kill, or disk-full mid-write must never leave a
  // truncated, unparseable file in the user's source-of-truth pack. Write to a
  // pid-scoped temp file, then rename (atomic on a single volume) into place.
  const tempPath = `${absolute}.${process.pid}.tmp`;
  try {
    await fs.writeFile(tempPath, content, "utf8");
    await fs.rename(tempPath, absolute);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
  files.push(relative);
}

// Folders whose entire contents exportAtlas regenerates from the project model.
// A file here that no longer corresponds to a current node/flow/view/proposal/
// version (e.g. one the user deleted) is an orphan: loadAtlasFromPack would
// otherwise read it back and silently resurrect the deleted entity on reload.
const managedPackFolders = unique([
  ...Object.values(conceptFolders),
  "flows",
  "views",
  "proposals",
  "versions",
  "generated",
  "evidence"
]);

async function removeOrphanedPackFiles(root: string, keep: Set<string>) {
  for (const folder of managedPackFolders) {
    await pruneOrphans(safeJoin(root, `architecture/${folder}`), keep);
  }
}

// Recursively delete files under `directory` whose absolute path is not in
// `keep`, then remove any directory left empty. Returns whether anything was
// kept, so callers can prune now-empty parents (e.g. a removed proposal's dir).
async function pruneOrphans(directory: string, keep: Set<string>): Promise<boolean> {
  let entries: Array<import("node:fs").Dirent>;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return false;
  }
  let kept = 0;
  for (const entry of entries) {
    const absolute = path.resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (await pruneOrphans(absolute, keep)) {
        kept += 1;
      } else {
        await fs.rm(absolute, { recursive: true, force: true });
      }
    } else if (keep.has(absolute)) {
      kept += 1;
    } else {
      await fs.rm(absolute, { force: true });
    }
  }
  return kept > 0;
}

function normalizeProject(project: AtlasProject, options: { includeIntelligence?: boolean } = {}): AtlasProject {
  const includeIntelligence = options.includeIntelligence ?? true;
  return {
    ...project,
    views: project.views ?? defaultViews(),
    proposals: project.proposals ?? [],
    versions: project.versions ?? [],
    evidence: project.evidence ?? [],
    intelligence: includeIntelligence ? normalizeCodeIntelligence(project.intelligence) : emptyCodeIntelligence()
  };
}

function projectSnapshotForAtlasJson(project: AtlasProject): AtlasProject {
  return {
    ...project,
    intelligence: emptyCodeIntelligence()
  };
}

async function withOptionalCodeIntelligence(root: string, project: AtlasProject, includeIntelligence: boolean): Promise<AtlasProject> {
  if (!includeIntelligence || hasCodeIntelligence(project.intelligence)) return project;
  return {
    ...project,
    intelligence: await readCodeIntelligence(root)
  };
}

function hasCodeIntelligence(intelligence: CodeIntelligence) {
  return Boolean(
    intelligence.generatedAt ||
    intelligence.projectStructure.length ||
    intelligence.files.length ||
    intelligence.symbols.length ||
    intelligence.classes.length ||
    intelligence.routes.length ||
    (intelligence.schemas?.length ?? 0) ||
    intelligence.dependencies.length ||
    intelligence.testMap.length
  );
}

function normalizeCodeIntelligence(intelligence?: Partial<CodeIntelligence>): CodeIntelligence {
  const empty = emptyCodeIntelligence();
  return {
    generatedAt: intelligence?.generatedAt ?? empty.generatedAt,
    projectStructure: intelligence?.projectStructure ?? empty.projectStructure,
    files: intelligence?.files ?? empty.files,
    symbols: intelligence?.symbols ?? empty.symbols,
    classes: intelligence?.classes ?? empty.classes,
    routes: intelligence?.routes ?? empty.routes,
    schemas: intelligence?.schemas ?? empty.schemas,
    dependencies: intelligence?.dependencies ?? empty.dependencies,
    testMap: intelligence?.testMap ?? empty.testMap
  };
}

export function safeJoin(root: string, relative: string) {
  const resolvedRoot = path.resolve(root);
  const absolute = path.resolve(root, relative);
  const fromRoot = path.relative(resolvedRoot, absolute);
  // Reject only genuine parent escapes (`..` exactly or `../…`) and absolute
  // paths. A bare `startsWith("..")` would also reject a legitimate filename
  // like `..foo`, so gate on a path-separator boundary instead.
  if (fromRoot === ".." || fromRoot.startsWith(`..${path.sep}`) || path.isAbsolute(fromRoot)) {
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
  if (isOpenApiFile(relative) || /\.(graphql|proto)$/i.test(relative)) return { kind: "contract", language: language(relative) };
  if (/\.prisma$/i.test(relative)) return { kind: "source", language: "prisma" };
  if (/\.(test|spec)\.(ts|tsx|js|jsx|py|rb|go|rs)$/.test(relative)) return { kind: "test", language: language(relative) };
  if (/migrations?\//.test(relative) || /migrations?.*\.(sql|ts|js)$/.test(relative)) return { kind: "migration", language: language(relative) };
  if (/\.(ts|tsx|js|jsx|py|rb|go|rs|java|cs|php|sql)$/.test(relative)) return { kind: "source", language: language(relative) };
  if (/\.(json|yaml|yml|toml|env|config\.[a-z]+)$/.test(relative)) return { kind: "config", language: language(relative) };
  if (/\.(md|mdx|txt)$/.test(relative)) return { kind: "document", language: "markdown" };
  return null;
}

function isOpenApiFile(relative: string) {
  return /(?:openapi|asyncapi|swagger)\.(json|ya?ml)$/i.test(relative);
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

function dedupeClasses(classes: CodeClass[]) {
  const seen = new Set<string>();
  return classes.filter((item) => {
    const key = `${item.path}:${item.name}`;
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
    prisma: "prisma",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml"
  };
  return ext ? map[ext] : undefined;
}
