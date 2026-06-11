import { Boxes, Database, FileCode2, GitBranch, Network, Route, Search, TestTube2 } from "lucide-react";
import { matchesQuery } from "../lib/shared";
import { useMemo, useState } from "react";
import { AtlasNode, AtlasProject, CodeClass, CodeDependency, CodeFileSummary, CodeRoute, CodeSchema, CodeTestMapEntry } from "../types";

type CodeIntelTab = "files" | "classes" | "routes" | "schemas" | "dependencies" | "tests";

interface CodeIntelligenceExplorerProps {
  project: AtlasProject;
  selectedId: string;
  isLoading?: boolean;
  onSelect: (id: string) => void;
}

export function CodeIntelligenceExplorer({ project, selectedId, isLoading = false, onSelect }: CodeIntelligenceExplorerProps) {
  const [tab, setTab] = useState<CodeIntelTab>("files");
  const [query, setQuery] = useState("");
  const intelligence = project.intelligence;
  // Depend on the two slices codeLinks actually reads: the full project object
  // changes reference on every edit, which rebuilt these maps even when nodes
  // and evidence were untouched.
  const links = useMemo(() => codeLinks(project.nodes, project.evidence), [project.nodes, project.evidence]);

  const normalizedQuery = query.trim().toLowerCase();
  const files = useMemo(() =>
    intelligence.files
      .filter((file) => matchesQuery(normalizedQuery, file.path, file.kind, file.language, file.summary))
      .slice(0, 120),
  [intelligence.files, normalizedQuery]);
  const classes = useMemo(() =>
    intelligence.classes
      .filter((item) => matchesQuery(normalizedQuery, item.name, item.path, item.extends, ...(item.implements ?? [])))
      .slice(0, 120),
  [intelligence.classes, normalizedQuery]);
  const routes = useMemo(() =>
    intelligence.routes
      .filter((route) => matchesQuery(normalizedQuery, route.method, route.path, route.sourceFile))
      .slice(0, 120),
  [intelligence.routes, normalizedQuery]);
  const schemas = useMemo(() =>
    intelligence.schemas
      .filter((schema) => matchesQuery(normalizedQuery, schema.name, schema.path, schema.kind, ...schema.columns, ...schema.relations))
      .slice(0, 120),
  [intelligence.schemas, normalizedQuery]);
  const dependencies = useMemo(() =>
    intelligence.dependencies
      .filter((dependency) => matchesQuery(normalizedQuery, dependency.source, dependency.target, dependency.importPath, dependency.kind))
      .slice(0, 160),
  [intelligence.dependencies, normalizedQuery]);
  const tests = useMemo(() =>
    intelligence.testMap
      .filter((entry) => matchesQuery(normalizedQuery, entry.testFile, ...entry.targetFiles))
      .slice(0, 120),
  [intelligence.testMap, normalizedQuery]);

  if (isLoading && !intelligence.generatedAt && intelligence.files.length === 0) {
    return (
      <div className="code-intel-empty">
        <FileCode2 size={22} />
        <h3>Loading Code Intelligence</h3>
        <p>Reading saved project structure, files, classes, routes, schemas, dependencies, and tests.</p>
      </div>
    );
  }

  if (!intelligence.generatedAt && intelligence.files.length === 0) {
    return (
      <div className="code-intel-empty">
        <FileCode2 size={22} />
        <h3>No Code Intelligence Yet</h3>
        <p>Run Scan to index files, classes, routes, schemas, dependencies, and tests into the atlas.</p>
      </div>
    );
  }

  return (
    <div className="code-intel-explorer">
      <div className="code-intel-toolbar">
        <div className="code-intel-summary">
          <strong>Code Intelligence</strong>
          <span>{intelligence.files.length} files · {intelligence.classes.length} classes · {intelligence.routes.length} routes · {intelligence.schemas.length} schemas · {intelligence.dependencies.length} deps · {intelligence.testMap.length} tests</span>
        </div>
        <label className="code-intel-search">
          <Search size={14} />
          <input value={query} placeholder="Filter saved code intelligence" aria-label="Filter saved code intelligence" onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>

      <div className="code-intel-tabs" role="tablist" aria-label="Code intelligence sections">
        <ExplorerTab id="files" tab={tab} count={files.length} label="Files" icon={FileCode2} onSelect={setTab} />
        <ExplorerTab id="classes" tab={tab} count={classes.length} label="Classes" icon={Boxes} onSelect={setTab} />
        <ExplorerTab id="routes" tab={tab} count={routes.length} label="Routes" icon={Route} onSelect={setTab} />
        <ExplorerTab id="schemas" tab={tab} count={schemas.length} label="Schemas" icon={Database} onSelect={setTab} />
        <ExplorerTab id="dependencies" tab={tab} count={dependencies.length} label="Deps" icon={GitBranch} onSelect={setTab} />
        <ExplorerTab id="tests" tab={tab} count={tests.length} label="Tests" icon={TestTube2} onSelect={setTab} />
      </div>

      <div className="code-intel-content">
        {tab === "files" && <FilesView files={files} links={links} selectedId={selectedId} onSelect={onSelect} />}
        {tab === "classes" && <ClassesView classes={classes} links={links} selectedId={selectedId} onSelect={onSelect} />}
        {tab === "routes" && <RoutesView routes={routes} links={links} selectedId={selectedId} onSelect={onSelect} />}
        {tab === "schemas" && <SchemasView schemas={schemas} links={links} selectedId={selectedId} onSelect={onSelect} />}
        {tab === "dependencies" && <DependenciesView dependencies={dependencies} links={links} selectedId={selectedId} onSelect={onSelect} />}
        {tab === "tests" && <TestsView tests={tests} links={links} selectedId={selectedId} onSelect={onSelect} />}
      </div>
    </div>
  );
}

function FilesView({ files, links, selectedId, onSelect }: { files: CodeFileSummary[]; links: CodeLinks; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="code-intel-grid">
      {files.length ? files.map((file) => {
        const node = links.fileNode(file.path);
        return (
          <article className={node?.id === selectedId ? "code-intel-card active" : "code-intel-card"} key={file.path}>
            <div>
              <strong>{file.path}</strong>
              <span>{[file.kind, file.language, file.lines ? `${file.lines} lines` : ""].filter(Boolean).join(" · ")}</span>
            </div>
            <div className="code-intel-pills">
              <span>{file.symbols.length} symbols</span>
              <span>{file.routes.length} routes</span>
              <span>{file.schemas?.length ?? 0} schemas</span>
              <span>{file.imports.length} imports</span>
            </div>
            <OpenNodeButton node={node} onSelect={onSelect} />
          </article>
        );
      }) : <EmptyList label="No files match this filter." />}
    </div>
  );
}

function ClassesView({ classes, links, selectedId, onSelect }: { classes: CodeClass[]; links: CodeLinks; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="code-intel-grid">
      {classes.length ? classes.map((item) => {
        const node = links.symbolNode(item.path, item.name) ?? links.fileNode(item.path);
        return (
          <article className={node?.id === selectedId ? "code-intel-card active" : "code-intel-card"} key={`${item.path}:${item.name}`}>
            <div>
              <strong>{item.name}</strong>
              <span>{item.path}{item.line ? `:${item.line}` : ""}</span>
            </div>
            <div className="code-intel-pills">
              <span>{item.attributes.length} attrs</span>
              <span>{item.methods.length} methods</span>
              {item.extends ? <span>extends {item.extends}</span> : null}
            </div>
            {item.methods.length ? <small>Methods: {item.methods.slice(0, 8).map((method) => method.name).join(", ")}</small> : null}
            <OpenNodeButton node={node} onSelect={onSelect} />
          </article>
        );
      }) : <EmptyList label="No classes match this filter." />}
    </div>
  );
}

function RoutesView({ routes, links, selectedId, onSelect }: { routes: CodeRoute[]; links: CodeLinks; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="code-intel-grid">
      {routes.length ? routes.map((route) => {
        const routeName = `${route.method} ${route.path}`;
        const node = links.symbolNode(route.sourceFile, routeName) ?? links.fileNode(route.sourceFile);
        return (
          <article className={node?.id === selectedId ? "code-intel-card active" : "code-intel-card"} key={route.id}>
            <div>
              <strong>{route.method} {route.path}</strong>
              <span>{route.sourceFile}{route.line ? `:${route.line}` : ""}</span>
            </div>
            <OpenNodeButton node={node} onSelect={onSelect} />
          </article>
        );
      }) : <EmptyList label="No routes match this filter." />}
    </div>
  );
}

function SchemasView({ schemas, links, selectedId, onSelect }: { schemas: CodeSchema[]; links: CodeLinks; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="code-intel-grid">
      {schemas.length ? schemas.map((schema) => {
        const node = links.schemaNode(schema.path, schema.name) ?? links.fileNode(schema.path);
        return (
          <article className={node?.id === selectedId ? "code-intel-card active" : "code-intel-card"} key={schema.id}>
            <div>
              <strong>{schema.name}</strong>
              <span>{schema.kind} · {schema.path}{schema.line ? `:${schema.line}` : ""}</span>
            </div>
            <div className="code-intel-pills">
              <span>{schema.columns.length} fields</span>
              <span>{schema.primaryKeys.length} keys</span>
              <span>{schema.indexes.length} indexes</span>
              <span>{schema.relations.length} relations</span>
            </div>
            {schema.relations.length ? <small>Relations: {schema.relations.slice(0, 6).join(", ")}</small> : null}
            <OpenNodeButton node={node} onSelect={onSelect} />
          </article>
        );
      }) : <EmptyList label="No schemas match this filter." />}
    </div>
  );
}

function DependenciesView({ dependencies, links, selectedId, onSelect }: { dependencies: CodeDependency[]; links: CodeLinks; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="code-intel-grid">
      {dependencies.length ? dependencies.map((dependency) => {
        const sourceNode = links.fileNode(dependency.source);
        const targetNode = dependency.kind === "internal" ? links.fileNode(dependency.target) : undefined;
        return (
          <article className={(sourceNode?.id === selectedId || targetNode?.id === selectedId) ? "code-intel-card active" : "code-intel-card"} key={`${dependency.source}:${dependency.target}:${dependency.importPath}`}>
            <div>
              <strong>{dependency.source}</strong>
              <span>{dependency.kind} dependency via {dependency.importPath}</span>
            </div>
            <div className="dependency-target"><Network size={13} /> {dependency.target}</div>
            <div className="code-intel-actions">
              <OpenNodeButton node={sourceNode} onSelect={onSelect} label="Source" />
              <OpenNodeButton node={targetNode} onSelect={onSelect} label="Target" />
            </div>
          </article>
        );
      }) : <EmptyList label="No dependencies match this filter." />}
    </div>
  );
}

function TestsView({ tests, links, selectedId, onSelect }: { tests: CodeTestMapEntry[]; links: CodeLinks; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="code-intel-grid">
      {tests.length ? tests.map((entry) => {
        const testNode = links.fileNode(entry.testFile);
        return (
          <article className={testNode?.id === selectedId ? "code-intel-card active" : "code-intel-card"} key={entry.testFile}>
            <div>
              <strong>{entry.testFile}</strong>
              <span>{entry.inferred ? "inferred coverage" : "import-based coverage"}</span>
            </div>
            <small>Covers: {entry.targetFiles.slice(0, 8).join(", ") || "unknown targets"}</small>
            <div className="code-intel-actions">
              <OpenNodeButton node={testNode} onSelect={onSelect} label="Test" />
              {entry.targetFiles.slice(0, 2).map((file) => <OpenNodeButton key={file} node={links.fileNode(file)} onSelect={onSelect} label="Target" />)}
            </div>
          </article>
        );
      }) : <EmptyList label="No tests match this filter." />}
    </div>
  );
}

function ExplorerTab({ id, tab, count, label, icon: Icon, onSelect }: { id: CodeIntelTab; tab: CodeIntelTab; count: number; label: string; icon: typeof FileCode2; onSelect: (id: CodeIntelTab) => void }) {
  // The parent row carries role="tablist"; without role="tab" + aria-selected
  // on the children the tablist is invalid and assistive tech misreads it.
  return (
    <button type="button" role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => onSelect(id)}>
      <Icon size={14} /> {label} <span>{count}</span>
    </button>
  );
}

function OpenNodeButton({ node, onSelect, label = "Open" }: { node?: AtlasNode; onSelect: (id: string) => void; label?: string }) {
  if (!node) return <span className="code-intel-unlinked">No atlas node</span>;
  return (
    <button type="button" className="compact" onClick={() => onSelect(node.id)}>
      {label}: {node.name}
    </button>
  );
}

function EmptyList({ label }: { label: string }) {
  return <p className="code-intel-empty-list">{label}</p>;
}

type CodeLinks = {
  fileNode: (path: string) => AtlasNode | undefined;
  symbolNode: (path: string, name: string) => AtlasNode | undefined;
  schemaNode: (path: string, name: string) => AtlasNode | undefined;
};

function codeLinks(nodes: AtlasProject["nodes"], evidence: AtlasProject["evidence"]): CodeLinks {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const evidenceLinks = new Map(evidence.map((item) => [item.path, item.linkedNodeIds ?? []]));
  const fileNodes = new Map<string, AtlasNode>();
  const symbolNodes = new Map<string, AtlasNode>();
  const schemaNodes = new Map<string, AtlasNode>();

  for (const node of nodes) {
    for (const file of node.linkedFiles) {
      if (!fileNodes.has(file)) fileNodes.set(file, node);
    }

    const evidencePath = typeof node.metadata?.evidencePath === "string" ? node.metadata.evidencePath : undefined;
    if (evidencePath && node.type === "code_symbol") {
      symbolNodes.set(symbolKey(evidencePath, node.name), node);
    }

    if (evidencePath && ["schema", "data_entity"].includes(node.type)) {
      const entityName = typeof node.metadata?.entityName === "string" ? node.metadata.entityName : node.name;
      schemaNodes.set(symbolKey(evidencePath, entityName), node);
    }
  }

  return {
    fileNode: (path) => {
      const evidenceNode = evidenceLinks.get(path)?.map((id) => nodesById.get(id)).find(Boolean);
      return evidenceNode ?? fileNodes.get(path);
    },
    symbolNode: (path, name) => symbolNodes.get(symbolKey(path, name)),
    schemaNode: (path, name) => schemaNodes.get(symbolKey(path, name))
  };
}

function symbolKey(path: string, name: string) {
  return `${path}:${name}`;
}

