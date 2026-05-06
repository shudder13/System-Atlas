import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import ts from "typescript";
import YAML from "yaml";
import { AtlasFlow, AtlasNode, AtlasProject, AtlasProposal, AtlasVersion, AtlasView, CodeClass, CodeDependency, CodeEvidence, CodeFileSummary, CodeIntelligence, CodeRoute, CodeScanResult, CodeSymbol, CodeTestMapEntry, ProjectStructureEntry } from "../src/types";
import { defaultViews, emptyCodeIntelligence, generateContextPack, generateMermaid, generateMigrationBrief, generateOverview, validateAtlas } from "../src/lib/atlas";

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
  risk: "reliability"
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

  for (const view of project.views) {
    await writeFile(root, `architecture/generated/diagrams/${slug(view.id)}.mmd`, generateMermaid(project, view.id), files);
  }

  await writeFile(root, "architecture/generated/metadata.json", JSON.stringify(metadata.generated, null, 2), files);

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
    classes: dedupeClasses(classes).slice(0, 40),
    imports: unique(imports).slice(0, 120),
    exports: unique(exports).slice(0, 80),
    routes: unique(routes).slice(0, 80)
  };
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
    return JSON.parse(await fs.readFile(safeJoin(root, "architecture/evidence/code-intelligence.json"), "utf8")) as CodeIntelligence;
  } catch {
    return {
      generatedAt: "",
      projectStructure: await readEvidenceArray<ProjectStructureEntry>(root, "architecture/evidence/project-structure.json"),
      files: await readEvidenceArray<CodeFileSummary>(root, "architecture/evidence/file-summaries.json"),
      symbols: await readEvidenceArray<CodeSymbol>(root, "architecture/evidence/code-symbols.json"),
      classes: await readEvidenceArray<CodeClass>(root, "architecture/evidence/classes.json"),
      routes: await readEvidenceArray<CodeRoute>(root, "architecture/evidence/routes.json"),
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

async function writeCodeIntelligenceFiles(root: string, intelligence: CodeIntelligence, files: string[]) {
  await writeFile(root, "architecture/evidence/code-intelligence.json", JSON.stringify(intelligence, null, 2), files);
  await writeFile(root, "architecture/evidence/project-structure.json", JSON.stringify(intelligence.projectStructure, null, 2), files);
  await writeFile(root, "architecture/evidence/file-summaries.json", JSON.stringify(intelligence.files, null, 2), files);
  await writeFile(root, "architecture/evidence/code-symbols.json", JSON.stringify(intelligence.symbols, null, 2), files);
  await writeFile(root, "architecture/evidence/classes.json", JSON.stringify(intelligence.classes, null, 2), files);
  await writeFile(root, "architecture/evidence/routes.json", JSON.stringify(intelligence.routes, null, 2), files);
  await writeFile(root, "architecture/evidence/dependencies.json", JSON.stringify(intelligence.dependencies, null, 2), files);
  await writeFile(root, "architecture/evidence/test-map.json", JSON.stringify(intelligence.testMap, null, 2), files);
}

async function exportMetadata(root: string, project: AtlasProject) {
  const generatedAt = new Date().toISOString();
  const exportId = randomUUID();
  const sourceRevision = await architectureSourceRevision(root);
  const intelligence = project.intelligence ?? emptyCodeIntelligence();
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
  await fs.writeFile(absolute, content, "utf8");
  files.push(relative);
}

function normalizeProject(project: AtlasProject, options: { includeIntelligence?: boolean } = {}): AtlasProject {
  const includeIntelligence = options.includeIntelligence ?? true;
  return {
    ...project,
    views: project.views ?? defaultViews(),
    proposals: project.proposals ?? [],
    versions: project.versions ?? [],
    evidence: project.evidence ?? [],
    intelligence: includeIntelligence ? project.intelligence ?? emptyCodeIntelligence() : emptyCodeIntelligence()
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
    intelligence.dependencies.length ||
    intelligence.testMap.length
  );
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
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml"
  };
  return ext ? map[ext] : undefined;
}
