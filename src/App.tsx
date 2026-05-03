import {
  AlertTriangle,
  Bot,
  Boxes,
  CheckCircle2,
  Database,
  FileDown,
  GitCompare,
  Network,
  Play,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Workflow
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import {
  createNode,
  createFlow,
  createProposal,
  generateContextPack,
  generateMermaid,
  generateMigrationBrief,
  generateOverview,
  layoutProjectForView,
  preferredViewForNodeType,
  semanticDiff,
  updateProposalAfter,
  validateAtlas,
  viewSupportsNodeType
} from "./lib/atlas";
import { AtlasProject, EDGE_TYPES, EdgeType, NodeType, ValidationIssue, ViewId, VIEW_IDS } from "./types";
import { templates as localTemplates } from "./data/templates";
import { AtlasCanvas } from "./components/AtlasCanvas";
import { Inspector } from "./components/Inspector";
import { Inventory } from "./components/Inventory";
import { PreviewPanel } from "./components/PreviewPanel";

const viewIcons: Record<ViewId, typeof Network> = {
  overview: Network,
  components: Boxes,
  flows: Workflow,
  data: Database,
  health: ShieldCheck,
  proposals: GitCompare
};

export function App() {
  const [templates, setTemplates] = useState(localTemplates);
  const [project, setProject] = useState<AtlasProject>(localTemplates[0].project);
  const [selectedId, setSelectedId] = useState<string>(localTemplates[0].project.nodes[0]?.id ?? "");
  const [viewId, setViewId] = useState<ViewId>("overview");
  const [edgeType, setEdgeType] = useState<(typeof EDGE_TYPES)[number]>("calls");
  const [nodeType, setNodeType] = useState<NodeType>("service");
  const [previewTab, setPreviewTab] = useState<"overview" | "mermaid" | "validation" | "ai">("overview");
  const [issues, setIssues] = useState<ValidationIssue[]>(validateAtlas(localTemplates[0].project));
  const [aiBrief, setAiBrief] = useState(generateContextPack(localTemplates[0].project));
  const [status, setStatus] = useState("Ready");
  const [activeProposalId, setActiveProposalId] = useState<string>("");
  const [diskRevision, setDiskRevision] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    Promise.all([api.templates(), api.project()])
      .then(([templateResponse, projectResponse]) => {
        setTemplates(templateResponse.templates);
        applyLoadedProject(projectResponse.project, projectResponse.revision);
        setStatus(projectResponse.loadedFromDisk ? "Loaded architecture pack" : "Loaded starter atlas");
      })
      .catch(() => {
        setStatus("API unavailable; using local starter atlas");
      });
  }, []);

  const reloadProjectFromDisk = useCallback(async (reason = "Reloaded architecture pack") => {
    const response = await api.project();
    applyLoadedProject(response.project, response.revision);
    setStatus(response.loadedFromDisk ? reason : "No architecture pack on disk; using starter atlas");
  }, []);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (hasUnsavedChanges) return;

      try {
        const response = await api.projectRevision();
        if (!response.revision || response.revision === diskRevision) return;
        await reloadProjectFromDisk("Auto-reloaded architecture pack from disk");
      } catch {
        // Keep the current in-memory atlas if the local API is temporarily unavailable.
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [diskRevision, hasUnsavedChanges, reloadProjectFromDisk]);

  const selectedNode = project.nodes.find((node) => node.id === selectedId);
  const selectedEdge = project.edges.find((edge) => edge.id === selectedId);
  const selectedFlow = project.flows.find((flow) => flow.id === selectedId);
  const activeProposal = project.proposals.find((proposal) => proposal.id === activeProposalId);
  const graph = useMemo(() => layoutProjectForView(project, viewId), [project, viewId]);
  const selectedFlowNodeIds = useMemo(
    () => selectedFlow?.steps.map((step) => step.nodeId).filter((id): id is string => Boolean(id)) ?? [],
    [selectedFlow]
  );
  const overview = useMemo(() => generateOverview(project), [project]);
  const mermaid = useMemo(() => generateMermaid(project, viewId), [project, viewId]);
  const migrationBrief = useMemo(() => {
    if (!activeProposal) return generateMigrationBrief(project);
    return generateMigrationBrief(project, { ...activeProposal, after: { nodes: project.nodes, edges: project.edges, flows: project.flows } });
  }, [activeProposal, project]);
  const diff = activeProposal ? semanticDiff(activeProposal.before, { nodes: project.nodes, edges: project.edges, flows: project.flows }) : null;

  function applyLoadedProject(next: AtlasProject, revision: string) {
    setProject(next);
    setSelectedId(next.nodes[0]?.id ?? next.flows[0]?.id ?? "");
    setActiveProposalId("");
    setIssues(validateAtlas(next));
    setAiBrief(generateContextPack(next));
    setDiskRevision(revision);
    setHasUnsavedChanges(false);
  }

  function updateProject(next: AtlasProject) {
    const withProposal = updateProposalAfter({ ...next, manifest: { ...next.manifest, updatedAt: new Date().toISOString() } }, activeProposalId);
    setProject(withProposal);
    setIssues(validateAtlas(withProposal));
    setHasUnsavedChanges(true);
  }

  function loadTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    const next = structuredClone(template.project);
    setProject(next);
    setSelectedId(next.nodes[0]?.id ?? "");
    setActiveProposalId("");
    setIssues(validateAtlas(next));
    setAiBrief(generateContextPack(next));
    setHasUnsavedChanges(true);
    setStatus(`Loaded template: ${template.name}`);
  }

  function selectConcept(id: string) {
    const node = project.nodes.find((item) => item.id === id);
    const flow = project.flows.find((item) => item.id === id);

    if (node && !graph.nodes.some((item) => item.id === id)) {
      const targetView = preferredViewForNodeType(node.type);
      setViewId(targetView);
      setStatus(`Showing ${node.name} in ${project.views.find((view) => view.id === targetView)?.name ?? targetView} view`);
    }

    if (flow) {
      setViewId("flows");
      setStatus(`Showing ${flow.name} in Flows view`);
    }

    setSelectedId(id);
  }

  function addNode() {
    const node = createNode(nodeType, project.nodes.length);
    const targetView = viewSupportsNodeType(viewId, node.type) ? viewId : preferredViewForNodeType(node.type);

    updateProject({ ...project, nodes: [...project.nodes, node] });
    setSelectedId(node.id);
    setViewId(targetView);
    setStatus(`Added ${node.name} in ${project.views.find((view) => view.id === targetView)?.name ?? targetView} view`);
  }

  function addFlow() {
    const flow = createFlow(project.flows.length);
    updateProject({ ...project, flows: [...project.flows, flow] });
    setSelectedId(flow.id);
    setViewId("flows");
  }

  function connect(source: string, target: string) {
    addEdge(source, target, edgeType);
  }

  function addEdge(source: string, target: string, type: EdgeType, label?: string) {
    const edge = {
      id: `${source}-${type}-${target}-${Date.now()}`,
      source,
      target,
      type,
      label: label?.trim() || type.replace(/_/g, " ")
    };
    updateProject({ ...project, edges: [...project.edges, edge] });
    setSelectedId(edge.id);
  }

  function deleteNode(id: string) {
    const remainingNodes = project.nodes.filter((node) => node.id !== id);
    updateProject({
      ...project,
      nodes: remainingNodes,
      edges: project.edges.filter((edge) => edge.source !== id && edge.target !== id),
      flows: project.flows.map((flow) => ({
        ...flow,
        steps: flow.steps.map((step) => step.nodeId === id ? { ...step, nodeId: undefined } : step)
      }))
    });
    setSelectedId(remainingNodes[0]?.id ?? project.flows[0]?.id ?? "");
  }

  function deleteEdge(id: string) {
    const remainingEdges = project.edges.filter((edge) => edge.id !== id);
    updateProject({ ...project, edges: remainingEdges });
    setSelectedId(project.nodes[0]?.id ?? project.flows[0]?.id ?? "");
  }

  function deleteFlow(id: string) {
    const remainingFlows = project.flows.filter((flow) => flow.id !== id);
    updateProject({ ...project, flows: remainingFlows });
    setSelectedId(project.nodes[0]?.id ?? remainingFlows[0]?.id ?? "");
  }

  function startProposal() {
    const proposal = createProposal(project, "Proposed architecture upgrade");
    updateProject({ ...project, proposals: [...project.proposals, proposal] });
    setActiveProposalId(proposal.id);
    setViewId("proposals");
    setPreviewTab("ai");
    setAiBrief(generateMigrationBrief(project, proposal));
    setStatus("Proposal mode started");
  }

  async function validateDraft() {
    try {
      const response = await api.validate(project);
      setIssues(response.issues);
      setPreviewTab("validation");
      setStatus(response.issues.length ? `Validation returned ${response.issues.length} issues` : "Validation passed");
    } catch {
      const local = validateAtlas(project);
      setIssues(local);
      setPreviewTab("validation");
      setStatus("Validated locally");
    }
  }

  async function exportAtlas() {
    try {
      const response = await api.export(project);
      setIssues(response.issues);
      setDiskRevision(response.revision);
      setHasUnsavedChanges(false);
      setStatus(`Exported ${response.files.length} architecture files`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Export failed");
    }
  }

  async function scanWorkspace() {
    try {
      const response = await api.scan();
      updateProject({ ...project, evidence: response.evidence });
      setStatus(`Scanned ${response.evidence.length} code evidence items`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Scan failed");
    }
  }

  async function generateAiBrief() {
    const targetIds = selectedId ? [selectedId] : [];
    try {
      const response = activeProposalId
        ? await api.migrationBrief(project, activeProposalId)
        : await api.contextPack(project, targetIds, "Implement an architecture-safe change using this atlas.");
      setAiBrief(response.markdown);
    } catch {
      setAiBrief(activeProposalId ? migrationBrief : generateContextPack(project, targetIds));
    }
    setPreviewTab("ai");
    setStatus(activeProposalId ? "Generated migration brief" : "Generated AI context pack");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Network size={20} /></div>
          <div>
            <h1>System Atlas</h1>
            <p>Architecture overview, components, flows, data, health, and change proposals.</p>
          </div>
        </div>

        <div className="toolbar">
          <select aria-label="Starter atlas" onChange={(event) => loadTemplate(event.target.value)} value="">
            <option value="" disabled>Start from...</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
          <button
            type="button"
            onClick={() => {
              if (!hasUnsavedChanges || window.confirm("Reload from disk and discard unsaved UI changes?")) {
                reloadProjectFromDisk();
              }
            }}
            title="Reload architecture files from disk"
          >
            <RefreshCcw size={16} /> Reload
          </button>
          <button type="button" onClick={scanWorkspace} title="Scan code evidence"><Search size={16} /> Scan</button>
          <button type="button" onClick={startProposal} title="Create proposal"><GitCompare size={16} /> Proposal</button>
          <button type="button" onClick={validateDraft} title="Validate atlas"><CheckCircle2 size={16} /> Validate</button>
          <button type="button" onClick={generateAiBrief} title="Generate AI brief"><Bot size={16} /> AI Brief</button>
          <button type="button" className="primary" onClick={exportAtlas} title="Export architecture pack"><Save size={16} /> Export</button>
        </div>
      </header>

      <nav className="view-tabs" aria-label="Architecture views">
        {VIEW_IDS.map((id) => {
          const Icon = viewIcons[id];
          return (
            <button key={id} type="button" className={viewId === id ? "active" : ""} onClick={() => setViewId(id)}>
              <Icon size={15} /> {project.views.find((view) => view.id === id)?.name ?? id}
            </button>
          );
        })}
      </nav>

      <main className="workbench">
        <Inventory
          project={project}
          selectedId={selectedId}
          nodeType={nodeType}
          edgeType={edgeType}
          onSelect={selectConcept}
          onNodeTypeChange={setNodeType}
          onEdgeTypeChange={setEdgeType}
          onAddNode={addNode}
          onAddFlow={addFlow}
        />

        <section className="canvas-region">
          <div className="canvas-header">
            <div>
              <h2>{project.views.find((view) => view.id === viewId)?.name}</h2>
              <p>{project.views.find((view) => view.id === viewId)?.description}</p>
            </div>
            <div className="canvas-metrics">
              <span><Boxes size={14} /> {graph.nodes.length} nodes</span>
              <span><Workflow size={14} /> {graph.edges.length} edges</span>
              {diff && <span><AlertTriangle size={14} /> {diff.addedNodes.length + diff.removedNodes.length + diff.changedNodes.length} proposed changes</span>}
              <button type="button" onClick={addNode} title={`Add ${nodeType.replace(/_/g, " ")}`}><Plus size={14} /> Add Node</button>
              <button type="button" onClick={addFlow} title="Add flow"><Plus size={14} /> Add Flow</button>
            </div>
          </div>
          <AtlasCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            selectedId={selectedId}
            highlightedNodeIds={viewId === "flows" ? selectedFlowNodeIds : []}
            onSelect={setSelectedId}
            onConnect={connect}
            onPositionChange={(positions) => {
              const nextPositions: NonNullable<AtlasProject["views"][number]["positions"]> = {};
              positions.forEach((position, id) => {
                if (position) nextPositions[id] = position;
              });

              updateProject({
                ...project,
                views: project.views.map((view) =>
                  view.id === viewId
                    ? { ...view, positions: { ...(view.positions ?? {}), ...nextPositions } }
                    : view
                )
              });
            }}
            key={viewId}
          />
          <PreviewPanel
            tab={previewTab}
            onTabChange={setPreviewTab}
            overview={overview}
            mermaid={mermaid}
            issues={issues}
            aiBrief={aiBrief}
            migrationBrief={migrationBrief}
            activeProposal={activeProposal}
          />
        </section>

        <Inspector
          project={project}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          selectedFlow={selectedFlow}
          onSelect={setSelectedId}
          onCreateEdge={addEdge}
          onDeleteNode={deleteNode}
          onDeleteEdge={deleteEdge}
          onDeleteFlow={deleteFlow}
          onChange={updateProject}
        />
      </main>

      <footer className="statusbar">
        <span><Play size={14} /> {status}</span>
        {hasUnsavedChanges && <span>Unsaved UI changes</span>}
        <span><FileDown size={14} /> Exports to <code>architecture/</code></span>
      </footer>
    </div>
  );
}
