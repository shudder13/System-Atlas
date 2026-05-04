import {
  AlertTriangle,
  Bot,
  Boxes,
  CheckCircle2,
  Cloud,
  Code2,
  Database,
  FileDown,
  FileText,
  GitCompare,
  Network,
  Play,
  Plus,
  RefreshCcw,
  Redo2,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Undo2,
  Workflow
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import {
  createNode,
  createFlow,
  createProposal,
  defaultViews,
  generateContextPack,
  generateMermaid,
  generateMigrationBrief,
  generateOverview,
  layoutProjectForView,
  mergeCodeEvidence,
  preferredViewForNodeType,
  proposalWorkspace,
  semanticDiff,
  updateProposalAfter,
  validateAtlas,
  VIEW_FAMILIES,
  viewSupportsNodeType
} from "./lib/atlas";
import { AtlasProject, EDGE_TYPES, EdgeType, NodeType, ValidationIssue, ViewId } from "./types";
import { templates as localTemplates } from "./data/templates";
import { AtlasCanvas } from "./components/AtlasCanvas";
import { Inspector } from "./components/Inspector";
import { Inventory } from "./components/Inventory";
import { PreviewPanel } from "./components/PreviewPanel";

type ProjectHistory = {
  past: AtlasProject[];
  future: AtlasProject[];
};

const HISTORY_LIMIT = 50;
const CORE_VIEW_IDS = new Set<ViewId>(["overview", "containers", "components", "flows", "deployment", "data", "health", "proposals"]);

const viewIcons: Record<ViewId, typeof Network> = {
  overview: Network,
  containers: Boxes,
  components: Boxes,
  code: Code2,
  flows: Workflow,
  deployment: Cloud,
  data: Database,
  domain: Boxes,
  security: ShieldCheck,
  health: ShieldCheck,
  decisions: FileText,
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
  const [history, setHistory] = useState<ProjectHistory>({ past: [], future: [] });
  const [showAdvancedViews, setShowAdvancedViews] = useState(false);

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

  const activeProposal = project.proposals.find((proposal) => proposal.id === activeProposalId);
  const workingProject = useMemo(() => proposalWorkspace(project, activeProposalId), [project, activeProposalId]);
  const selectedNode = workingProject.nodes.find((node) => node.id === selectedId);
  const selectedEdge = workingProject.edges.find((edge) => edge.id === selectedId);
  const selectedFlow = workingProject.flows.find((flow) => flow.id === selectedId);
  const graph = useMemo(() => layoutProjectForView(workingProject, viewId), [workingProject, viewId]);
  const selectedFlowNodeIds = useMemo(
    () => selectedFlow?.steps.map((step) => step.nodeId).filter((id): id is string => Boolean(id)) ?? [],
    [selectedFlow]
  );
  const overview = useMemo(() => generateOverview(workingProject), [workingProject]);
  const mermaid = useMemo(() => generateMermaid(workingProject, viewId), [workingProject, viewId]);
  const migrationBrief = useMemo(() => {
    if (!activeProposal) return generateMigrationBrief(workingProject);
    return generateMigrationBrief(project, activeProposal);
  }, [activeProposal, project, workingProject]);
  const diff = activeProposal ? semanticDiff(activeProposal.before, activeProposal.after) : null;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const visibleViewFamilies = useMemo(() =>
    VIEW_FAMILIES.map((family) => ({
      ...family,
      views: showAdvancedViews ? family.views : family.views.filter((id) => CORE_VIEW_IDS.has(id))
    })).filter((family) => family.views.length > 0),
  [showAdvancedViews]);

  useEffect(() => {
    if (!showAdvancedViews && !CORE_VIEW_IDS.has(viewId)) {
      setViewId("overview");
    }
  }, [showAdvancedViews, viewId]);

  function applyLoadedProject(next: AtlasProject, revision: string) {
    const withViews = mergeDefaultViews(next);
    setProject(withViews);
    setSelectedId(withViews.nodes[0]?.id ?? withViews.flows[0]?.id ?? "");
    setActiveProposalId("");
    setIssues(validateAtlas(withViews));
    setAiBrief(generateContextPack(withViews));
    setDiskRevision(revision);
    setHasUnsavedChanges(false);
    setHistory({ past: [], future: [] });
  }

  function applyProjectState(next: AtlasProject, statusText?: string) {
    const nextActiveProposalId = next.proposals.some((proposal) => proposal.id === activeProposalId) ? activeProposalId : "";
    const nextWorkingProject = proposalWorkspace(next, nextActiveProposalId);

    setProject(next);
    setIssues(validateAtlas(nextWorkingProject));
    setAiBrief(generateContextPack(nextWorkingProject));
    setHasUnsavedChanges(true);
    if (activeProposalId && !nextActiveProposalId) {
      setActiveProposalId("");
    }
    if (
      !nextWorkingProject.nodes.some((node) => node.id === selectedId) &&
      !nextWorkingProject.edges.some((edge) => edge.id === selectedId) &&
      !nextWorkingProject.flows.some((flow) => flow.id === selectedId)
    ) {
      setSelectedId(nextWorkingProject.nodes[0]?.id ?? nextWorkingProject.flows[0]?.id ?? "");
    }
    if (statusText) setStatus(statusText);
  }

  function updateProject(next: AtlasProject, options: { recordHistory?: boolean } = {}) {
    const updatedAt = new Date().toISOString();
    const rootProject = activeProposalId
      ? {
          ...project,
          manifest: { ...project.manifest, updatedAt },
          views: next.views,
          evidence: next.evidence
        }
      : { ...next, manifest: { ...next.manifest, updatedAt } };
    const withProposal = activeProposalId
      ? updateProposalAfter(rootProject, activeProposalId, next)
      : rootProject;
    const nextWorkingProject = proposalWorkspace(withProposal, activeProposalId);

    if (options.recordHistory !== false) {
      setHistory((current) => ({
        past: [...current.past, structuredClone(project)].slice(-HISTORY_LIMIT),
        future: []
      }));
    }
    setProject(withProposal);
    setIssues(validateAtlas(nextWorkingProject));
    setHasUnsavedChanges(true);
  }

  function undoProjectChange() {
    if (!canUndo) return;
    const previous = history.past[history.past.length - 1];
    setHistory({
      past: history.past.slice(0, -1),
      future: [structuredClone(project), ...history.future].slice(0, HISTORY_LIMIT)
    });
    applyProjectState(structuredClone(previous), "Undid last architecture edit");
  }

  function redoProjectChange() {
    if (!canRedo) return;
    const next = history.future[0];
    setHistory({
      past: [...history.past, structuredClone(project)].slice(-HISTORY_LIMIT),
      future: history.future.slice(1)
    });
    applyProjectState(structuredClone(next), "Redid architecture edit");
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
    setHistory({ past: [], future: [] });
    setStatus(`Loaded template: ${template.name}`);
  }

  function selectConcept(id: string) {
    const node = workingProject.nodes.find((item) => item.id === id);
    const flow = workingProject.flows.find((item) => item.id === id);

    if (node && !graph.nodes.some((item) => item.id === id)) {
      const targetView = preferredViewForNodeType(node.type);
      setViewId(targetView);
      setStatus(`Showing ${node.name} in ${workingProject.views.find((view) => view.id === targetView)?.name ?? targetView} view`);
    }

    if (flow) {
      setViewId("flows");
      setStatus(`Showing ${flow.name} in Flows view`);
    }

    setSelectedId(id);
  }

  function addNode() {
    const node = createNode(nodeType, workingProject.nodes.length);
    const targetView = viewSupportsNodeType(viewId, node.type) ? viewId : preferredViewForNodeType(node.type);

    updateProject({ ...workingProject, nodes: [...workingProject.nodes, node] });
    setSelectedId(node.id);
    setViewId(targetView);
    setStatus(`Added ${node.name} in ${workingProject.views.find((view) => view.id === targetView)?.name ?? targetView} view`);
  }

  function addFlow() {
    const flow = createFlow(workingProject.flows.length);
    updateProject({ ...workingProject, flows: [...workingProject.flows, flow] });
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
    updateProject({ ...workingProject, edges: [...workingProject.edges, edge] });
    setSelectedId(edge.id);
  }

  function deleteNode(id: string) {
    const remainingNodes = workingProject.nodes.filter((node) => node.id !== id);
    updateProject({
      ...workingProject,
      nodes: remainingNodes,
      edges: workingProject.edges.filter((edge) => edge.source !== id && edge.target !== id),
      flows: workingProject.flows.map((flow) => ({
        ...flow,
        steps: flow.steps.map((step) => step.nodeId === id ? { ...step, nodeId: undefined } : step)
      }))
    });
    setSelectedId(remainingNodes[0]?.id ?? workingProject.flows[0]?.id ?? "");
  }

  function deleteEdge(id: string) {
    const remainingEdges = workingProject.edges.filter((edge) => edge.id !== id);
    updateProject({ ...workingProject, edges: remainingEdges });
    setSelectedId(workingProject.nodes[0]?.id ?? workingProject.flows[0]?.id ?? "");
  }

  function deleteFlow(id: string) {
    const remainingFlows = workingProject.flows.filter((flow) => flow.id !== id);
    updateProject({ ...workingProject, flows: remainingFlows });
    setSelectedId(workingProject.nodes[0]?.id ?? remainingFlows[0]?.id ?? "");
  }

  function startProposal() {
    const proposal = createProposal(workingProject, "Proposed architecture upgrade");
    const next = {
      ...project,
      manifest: { ...project.manifest, updatedAt: new Date().toISOString() },
      views: workingProject.views,
      evidence: workingProject.evidence,
      proposals: [...project.proposals, proposal]
    };
    setHistory((current) => ({
      past: [...current.past, structuredClone(project)].slice(-HISTORY_LIMIT),
      future: []
    }));
    setProject(next);
    setActiveProposalId(proposal.id);
    setIssues(validateAtlas(proposalWorkspace(next, proposal.id)));
    setHasUnsavedChanges(true);
    setViewId("proposals");
    setPreviewTab("ai");
    setAiBrief(generateMigrationBrief(next, proposal));
    setStatus("Proposal mode started");
  }

  function exitProposal() {
    setActiveProposalId("");
    setIssues(validateAtlas(project));
    setAiBrief(generateContextPack(project));
    if (
      !project.nodes.some((node) => node.id === selectedId) &&
      !project.edges.some((edge) => edge.id === selectedId) &&
      !project.flows.some((flow) => flow.id === selectedId)
    ) {
      setSelectedId(project.nodes[0]?.id ?? project.flows[0]?.id ?? "");
    }
    setViewId("overview");
    setStatus("Returned to main atlas");
  }

  async function validateDraft() {
    try {
      const response = await api.validate(workingProject);
      setIssues(response.issues);
      setPreviewTab("validation");
      setStatus(response.issues.length ? `Validation returned ${response.issues.length} issues` : "Validation passed");
    } catch {
      const local = validateAtlas(workingProject);
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
      const withCodeEvidence = mergeCodeEvidence(workingProject, response.evidence);
      updateProject(withCodeEvidence);
      setShowAdvancedViews(true);
      setViewId("code");
      setStatus(`Scanned ${response.evidence.length} evidence items and updated the Code view`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Scan failed");
    }
  }

  async function generateAiBrief() {
    const targetIds = selectedId ? [selectedId] : [];
    try {
      const response = activeProposalId
        ? await api.migrationBrief(project, activeProposalId)
        : await api.contextPack(workingProject, targetIds, "Implement an architecture-safe change using this atlas.");
      setAiBrief(response.markdown);
    } catch {
      setAiBrief(activeProposalId ? migrationBrief : generateContextPack(workingProject, targetIds));
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
            <p>C4, runtime, deployment, data, domain, security, decisions, and AI migration briefs.</p>
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
          <button type="button" onClick={undoProjectChange} disabled={!canUndo} title="Undo last architecture edit"><Undo2 size={16} /> Undo</button>
          <button type="button" onClick={redoProjectChange} disabled={!canRedo} title="Redo architecture edit"><Redo2 size={16} /> Redo</button>
          <button type="button" onClick={scanWorkspace} title="Scan code evidence"><Search size={16} /> Scan</button>
          <button type="button" onClick={startProposal} title="Create proposal"><GitCompare size={16} /> Proposal</button>
          {activeProposal && <button type="button" onClick={exitProposal} title="Return to the current architecture"><GitCompare size={16} /> Main Atlas</button>}
          <button type="button" onClick={validateDraft} title="Validate atlas"><CheckCircle2 size={16} /> Validate</button>
          <button type="button" onClick={generateAiBrief} title="Generate AI brief"><Bot size={16} /> AI Brief</button>
          <button type="button" className="primary" onClick={exportAtlas} title="Export architecture pack"><Save size={16} /> Export</button>
        </div>
      </header>

      <nav className="view-tabs" aria-label="Architecture views">
        {visibleViewFamilies.map((family) => (
          <section className="view-family" key={family.id} aria-label={family.name}>
            <span>{family.name}</span>
            <div>
              {family.views.map((id) => {
                const Icon = viewIcons[id];
                return (
                  <button key={id} type="button" className={viewId === id ? "active" : ""} onClick={() => setViewId(id)} title={workingProject.views.find((view) => view.id === id)?.description}>
                    <Icon size={15} /> {workingProject.views.find((view) => view.id === id)?.name ?? id}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        <button
          type="button"
          className={showAdvancedViews ? "view-toggle active" : "view-toggle"}
          onClick={() => setShowAdvancedViews((value) => !value)}
          title="Show or hide advanced architecture lenses"
        >
          <SlidersHorizontal size={15} /> {showAdvancedViews ? "All Views" : "More Views"}
        </button>
      </nav>

      <main className="workbench">
        <Inventory
          project={workingProject}
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
              <h2>{workingProject.views.find((view) => view.id === viewId)?.name}</h2>
              <p>{workingProject.views.find((view) => view.id === viewId)?.description}</p>
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
                ...workingProject,
                views: workingProject.views.map((view) =>
                  view.id === viewId
                    ? { ...view, positions: { ...(view.positions ?? {}), ...nextPositions } }
                    : view
                )
              }, { recordHistory: false });
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
          project={workingProject}
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
        {activeProposal && <span>Editing proposal: {activeProposal.name}</span>}
        {hasUnsavedChanges && <span>Unsaved UI changes</span>}
        <span><FileDown size={14} /> Exports to <code>architecture/</code></span>
      </footer>
    </div>
  );
}

function mergeDefaultViews(project: AtlasProject): AtlasProject {
  const existing = new Map(project.views.map((view) => [view.id, view]));
  const merged = defaultViews().map((view) => ({ ...view, ...(existing.get(view.id) ?? {}) }));
  return { ...project, views: merged };
}
