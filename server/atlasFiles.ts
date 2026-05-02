import fs from "node:fs/promises";
import path from "node:path";
import { AtlasFlow, AtlasNode, AtlasProject, AtlasProposal, AtlasView, CodeEvidence } from "../src/types";
import { defaultViews, generateContextPack, generateMermaid, generateMigrationBrief, generateOverview, validateAtlas } from "../src/lib/atlas";

const conceptFolders: Record<string, string> = {
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
  flow: "flows",
  risk: "reliability"
};

export async function loadAtlas(root: string): Promise<AtlasProject | null> {
  const snapshotPath = safeJoin(root, "architecture/generated/atlas.json");
  try {
    const raw = await fs.readFile(snapshotPath, "utf8");
    return JSON.parse(raw) as AtlasProject;
  } catch {
    return loadAtlasFromPack(root);
  }
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

async function loadAtlasFromPack(root: string): Promise<AtlasProject | null> {
  const manifestPath = safeJoin(root, "architecture/manifest.yaml");
  try {
    const rawManifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as Record<string, unknown>;
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
        evidence.push({ path: relative, kind: kind.kind, language: kind.language });
      }
    }
  }

  await walk(root);
  return evidence.slice(0, 2000);
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
      tags: node.tags ?? []
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
      values.push(JSON.parse(raw) as T);
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
        proposals.push(JSON.parse(await fs.readFile(proposalPath, "utf8")) as AtlasProposal);
      } catch {
        continue;
      }
    }
    return proposals;
  } catch {
    return [];
  }
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return JSON.parse(match[1]);
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
    position: value.position as AtlasNode["position"]
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
  return JSON.stringify(value, null, 2);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
}

function classify(relative: string): Pick<CodeEvidence, "kind" | "language"> | null {
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
