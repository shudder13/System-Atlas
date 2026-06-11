import {
  AlertTriangle,
  Bot,
  Boxes,
  Check,
  CheckCircle2,
  Cloud,
  Code2,
  Copy,
  Database,
  FileDown,
  FileText,
  GitCompare,
  History,
  Network,
  Play,
  Plus,
  RefreshCcw,
  Redo2,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Undo2,
  Workflow
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api, type WorkspaceRegistry } from "./lib/api";
import {
  applyProposal,
  commitWorkspaceEdit,
  CONTEXT_PACK_SCOPES,
  createNode,
  createFlow,
  createProposal,
  createVersion,
  defaultViews,
  emptyCodeIntelligence,
  generateArchitectureReview,
  generateContextPack,
  generateMermaid,
  generateMigrationBrief,
  generateOverview,
  layoutProjectForView,
  mergeCodeEvidence,
  preferredViewForNodeType,
  proposalWorkspace,
  restoreVersion,
  semanticDiff,
  validateAtlas,
  VIEW_FAMILIES,
  viewSupportsNodeType
} from "./lib/atlas";
import { AtlasProject, CodeIntelligence, ContextPackScope, EDGE_TYPES, EdgeType, NodeType, PackHealth, ValidationIssue, ViewId } from "./types";
import { templates as localTemplates } from "./data/templates";
import { AtlasCanvas } from "./components/AtlasCanvas";
import { CodeIntelligenceExplorer } from "./components/CodeIntelligenceExplorer";
import { ImportReview } from "./components/ImportReview";
import { Inspector } from "./components/Inspector";
import { Inventory } from "./components/Inventory";
import { PreviewPanel } from "./components/PreviewPanel";
import { WorkspaceOnboarding } from "./components/WorkspaceOnboarding";
import { WorkspacePicker } from "./components/WorkspacePicker";

type ProjectHistory = {
  past: AtlasProject[];
  future: AtlasProject[];
};

type SyncStatus = "idle" | "dirty" | "saving" | "synced" | "external-changes" | "error";

const HISTORY_LIMIT = 50;

const viewIcons: Record<ViewId, typeof Network> = {
  overview: Network,
  containers: Boxes,
  components: Boxes,
  code: Code2,
  class_diagram: Code2,
  flows: Workflow,
  api_surface: FileText,
  deployment: Cloud,
  data: Database,
  schema_model: Database,
  domain: Boxes,
  security: ShieldCheck,
  concerns: Target,
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
  const [previewTab, setPreviewTab] = useState<"overview" | "validation" | "review" | "ai">("overview");
  const [canvasMode, setCanvasMode] = useState<"graph" | "mermaid">("graph");
  const [mermaidCopied, setMermaidCopied] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<"inspector" | "code" | "import">("inspector");
  const [issues, setIssues] = useState<ValidationIssue[]>(validateAtlas(localTemplates[0].project));
  const [aiBrief, setAiBrief] = useState(generateContextPack(localTemplates[0].project, [], undefined, "focused"));
  const [status, setStatus] = useState("Ready");
  const [activeProposalId, setActiveProposalId] = useState<string>("");
  const [diskRevision, setDiskRevision] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [externalRevision, setExternalRevision] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [packHealth, setPackHealth] = useState<PackHealth | null>(null);
  const [history, setHistory] = useState<ProjectHistory>({ past: [], future: [] });
  const [showAdvancedViews, setShowAdvancedViews] = useState(false);
  const [contextScope, setContextScope] = useState<ContextPackScope>("focused");
  const [codeIntelligenceLoaded, setCodeIntelligenceLoaded] = useState(hasCodeIntelligence(localTemplates[0].project.intelligence));
  const [codeIntelligenceLoading, setCodeIntelligenceLoading] = useState(false);
  const [workspaceRegistry, setWorkspaceRegistry] = useState<WorkspaceRegistry | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const saveInFlightRef = useRef(false);
  const changeSeqRef = useRef(0);
  const codeIntelligenceVersionRef = useRef(0);
  const persistedCodeIntelligenceVersionRef = useRef(0);
  const codeIntelligenceLoadRef = useRef<Promise<CodeIntelligence | null> | null>(null);
  // Monotonic workspace generation. codeIntelligenceVersionRef resets to 0 on a
  // workspace switch, so an in-flight intelligence load started in the OLD
  // workspace saw version 0 === 0 in the NEW one and merged the old workspace's
  // intelligence into the new project (then autosynced it to disk). The epoch
  // only ever increases, so cross-workspace responses can never pass the guard.
  const workspaceEpochRef = useRef(0);

  const resetWorkspaceLocalState = useCallback(() => {
    workspaceEpochRef.current += 1;
    setHistory({ past: [], future: [] });
    setHasUnsavedChanges(false);
    setSyncStatus("idle");
    setExternalRevision("");
    setLastSyncedAt("");
    setActiveProposalId("");
    setCodeIntelligenceLoaded(false);
    codeIntelligenceLoadRef.current = null;
    codeIntelligenceVersionRef.current = 0;
    persistedCodeIntelligenceVersionRef.current = 0;
  }, []);

  const applyLoadedProject = useCallback((next: AtlasProject, revision: string) => {
    const withViews = mergeDefaultViews(next);
    changeSeqRef.current = 0;
    setProject(withViews);
    setSelectedId(withViews.nodes[0]?.id ?? withViews.flows[0]?.id ?? "");
    setActiveProposalId("");
    setIssues(validateAtlas(withViews));
    setAiBrief(generateContextPack(withViews, [], undefined, contextScope));
    setDiskRevision(revision);
    setExternalRevision("");
    setHasUnsavedChanges(false);
    setSyncStatus(revision ? "synced" : "idle");
    setLastSyncedAt(revision ? new Date().toISOString() : "");
    setPackHealth(null);
    setHistory({ past: [], future: [] });
    codeIntelligenceVersionRef.current = 0;
    persistedCodeIntelligenceVersionRef.current = 0;
    codeIntelligenceLoadRef.current = null;
    setCodeIntelligenceLoaded(hasCodeIntelligence(withViews.intelligence));
    setCodeIntelligenceLoading(false);
    // Keep the active tab valid: a loaded pack can mark the current view
    // non-core while advanced views are hidden.
    if (!showAdvancedViews && withViews.views.find((view) => view.id === viewId)?.core === false) {
      setViewId("overview");
    }
  }, [contextScope, showAdvancedViews, viewId]);

  const initialiseCurrentWorkspace = useCallback(async () => {
    try {
      const [templateResponse, projectResponse, healthResponse] = await Promise.all([
        api.templates(),
        api.project(),
        api.packHealth()
      ]);
      setTemplates(templateResponse.templates);
      resetWorkspaceLocalState();
      applyLoadedProject(projectResponse.project, projectResponse.revision);
      setPackHealth(healthResponse.packHealth);
      setStatus(projectResponse.loadedFromDisk ? "Loaded architecture pack" : "Loaded starter atlas");
    } catch (error) {
      if (error instanceof ApiError && error.code === "no_workspace") {
        // Onboarding will render instead of the workbench.
        return;
      }
      setStatus(error instanceof Error ? error.message : "Could not load project");
    }
  }, [applyLoadedProject, resetWorkspaceLocalState]);

  const bootedRef = useRef(false);
  useEffect(() => {
    // Bootstrap exactly once. initialiseCurrentWorkspace's identity changes
    // with its dependencies, so without the guard a tab/scope change after
    // mount would re-run the whole workspace bootstrap.
    if (bootedRef.current) return;
    bootedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const registry = await api.workspaces();
        if (cancelled) return;
        setWorkspaceRegistry(registry);
        if (registry.currentWorkspaceId) {
          await initialiseCurrentWorkspace();
        }
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "API unavailable");
      } finally {
        if (!cancelled) setWorkspaceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialiseCurrentWorkspace]);

  const refreshWorkspaceRegistry = useCallback(async () => {
    const registry = await api.workspaces();
    setWorkspaceRegistry(registry);
    return registry;
  }, []);

  const addWorkspaceAction = useCallback(async (path: string, name?: string) => {
    await api.addWorkspace(path, name);
    await refreshWorkspaceRegistry();
    await initialiseCurrentWorkspace();
  }, [initialiseCurrentWorkspace, refreshWorkspaceRegistry]);

  const switchWorkspaceAction = useCallback(async (id: string) => {
    await api.selectWorkspace(id);
    await refreshWorkspaceRegistry();
    await initialiseCurrentWorkspace();
  }, [initialiseCurrentWorkspace, refreshWorkspaceRegistry]);

  const removeWorkspaceAction = useCallback(async (id: string) => {
    const registry = await api.removeWorkspace(id);
    setWorkspaceRegistry(registry);
    if (registry.currentWorkspaceId) {
      await initialiseCurrentWorkspace();
    } else {
      resetWorkspaceLocalState();
      setProject(localTemplates[0].project);
    }
  }, [initialiseCurrentWorkspace, resetWorkspaceLocalState]);

  const renameWorkspaceAction = useCallback(async (id: string, name: string) => {
    await api.renameWorkspace(id, name);
    await refreshWorkspaceRegistry();
  }, [refreshWorkspaceRegistry]);

  const reloadProjectFromDisk = useCallback(async (reason = "Reloaded architecture pack") => {
    const [projectResponse, healthResponse] = await Promise.all([api.project(), api.packHealth()]);
    applyLoadedProject(projectResponse.project, projectResponse.revision);
    setPackHealth(healthResponse.packHealth);
    setStatus(projectResponse.loadedFromDisk ? reason : "No architecture pack on disk; using starter atlas");
  }, [applyLoadedProject]);

  const loadSavedCodeIntelligence = useCallback(async () => {
    if (hasUnpersistedCodeIntelligence() || codeIntelligenceLoaded) return project.intelligence;
    if (codeIntelligenceLoadRef.current) return codeIntelligenceLoadRef.current;

    setCodeIntelligenceLoading(true);
    const loadStartedAtVersion = codeIntelligenceVersionRef.current;
    const loadStartedAtEpoch = workspaceEpochRef.current;
    const request: Promise<CodeIntelligence | null> = api.codeIntelligence()
      .then(({ intelligence }) => {
        // The epoch check rejects responses that started in a previous
        // workspace: the version ref resets to 0 on switch, so the version
        // check alone let a stale cross-workspace response through.
        if (
          workspaceEpochRef.current !== loadStartedAtEpoch ||
          codeIntelligenceVersionRef.current !== loadStartedAtVersion ||
          hasUnpersistedCodeIntelligence()
        ) {
          return null;
        }

        setProject((current) => ({ ...current, intelligence }));
        setCodeIntelligenceLoaded(true);
        if (hasCodeIntelligence(intelligence)) {
          setStatus(`Loaded saved code intelligence for ${intelligence.files.length} files`);
        }
        return intelligence;
      })
      .catch((error) => {
        setStatus(error instanceof Error ? error.message : "Could not load saved code intelligence");
        return null;
      })
      .finally(() => {
        if (codeIntelligenceLoadRef.current === request) {
          codeIntelligenceLoadRef.current = null;
          setCodeIntelligenceLoading(false);
        }
      });

    codeIntelligenceLoadRef.current = request;
    return request;
  }, [codeIntelligenceLoaded, project.intelligence]);

  const saveProjectToDisk = useCallback(async (mode: "auto" | "manual", force = false) => {
    if (saveInFlightRef.current) return;

    const savingSeq = changeSeqRef.current;
    saveInFlightRef.current = true;
    setSyncStatus("saving");

    try {
      const includeIntelligence = hasUnpersistedCodeIntelligence();
      const savingIntelligenceVersion = codeIntelligenceVersionRef.current;
      const response = await api.export(project, { baseRevision: diskRevision, force, includeIntelligence });
      setIssues(response.issues);
      setDiskRevision(response.revision);
      setPackHealth(response.packHealth);
      setExternalRevision("");
      setLastSyncedAt(new Date().toISOString());
      if (includeIntelligence && codeIntelligenceVersionRef.current === savingIntelligenceVersion) {
        persistedCodeIntelligenceVersionRef.current = savingIntelligenceVersion;
      }

      if (changeSeqRef.current === savingSeq) {
        setHasUnsavedChanges(false);
        setSyncStatus("synced");
      } else {
        setHasUnsavedChanges(true);
        setSyncStatus("dirty");
      }

      setStatus(mode === "auto" ? `Synced ${response.files.length} architecture files` : `Exported ${response.files.length} architecture files`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "revision_conflict") {
        const revision = typeof error.details === "object" && error.details && "revision" in error.details
          ? String((error.details as { revision?: unknown }).revision ?? "")
          : "";
        setExternalRevision(revision);
        setSyncStatus("external-changes");
        setStatus("Architecture files changed on disk; reload to accept them or Export to overwrite");
      } else {
        setSyncStatus("error");
        setStatus(error instanceof Error ? error.message : "Sync failed");
      }
    } finally {
      saveInFlightRef.current = false;
    }
  }, [diskRevision, project]);

  useEffect(() => {
    if (!hasUnsavedChanges || syncStatus === "saving" || syncStatus === "external-changes") return;

    const timeout = window.setTimeout(() => {
      void saveProjectToDisk("auto");
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [hasUnsavedChanges, project, saveProjectToDisk, syncStatus]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const response = await api.projectRevision();
        if (!response.revision || response.revision === diskRevision) return;
        if (saveInFlightRef.current) return;

        if (hasUnsavedChanges) {
          setExternalRevision(response.revision);
          setSyncStatus("external-changes");
          setStatus("Architecture files changed on disk; reload to accept them or Export to overwrite");
          return;
        }

        await reloadProjectFromDisk("Auto-reloaded architecture pack from disk");
      } catch {
        // Keep the current in-memory atlas if the local API is temporarily unavailable.
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [diskRevision, hasUnsavedChanges, reloadProjectFromDisk]);

  // Memoized so unrelated state changes (status text, sync badges, copy
  // feedback) keep stable references and don't cascade re-renders into
  // Inspector and AtlasCanvas.
  const activeProposal = useMemo(
    () => project.proposals.find((proposal) => proposal.id === activeProposalId),
    [project.proposals, activeProposalId]
  );
  const workingProject = useMemo(() => proposalWorkspace(project, activeProposalId), [project, activeProposalId]);
  const graph = useMemo(() => layoutProjectForView(workingProject, viewId), [workingProject, viewId]);
  const persistedSelectedNode = useMemo(
    () => workingProject.nodes.find((node) => node.id === selectedId),
    [workingProject.nodes, selectedId]
  );
  const selectedNode = useMemo(
    () => persistedSelectedNode ?? graph.nodes.find((node) => node.id === selectedId),
    [graph.nodes, persistedSelectedNode, selectedId]
  );
  const selectedNodeReadOnly = Boolean(selectedNode && !persistedSelectedNode);
  const selectedEdge = useMemo(
    () => workingProject.edges.find((edge) => edge.id === selectedId),
    [workingProject.edges, selectedId]
  );
  const selectedFlow = useMemo(
    () => workingProject.flows.find((flow) => flow.id === selectedId),
    [workingProject.flows, selectedId]
  );
  const selectedFlowNodeIds = useMemo(
    () => selectedFlow?.steps.map((step) => step.nodeId).filter((id): id is string => Boolean(id)) ?? [],
    [selectedFlow]
  );
  const overview = useMemo(() => generateOverview(workingProject), [workingProject]);
  const architectureReview = useMemo(() => previewTab === "review" ? generateArchitectureReview(workingProject) : "", [workingProject, previewTab]);
  const mermaid = useMemo(() => generateMermaid(workingProject, viewId), [workingProject, viewId]);
  const copyMermaid = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mermaid);
      setMermaidCopied(true);
      window.setTimeout(() => setMermaidCopied(false), 1600);
    } catch {
      setStatus("Clipboard unavailable; select the text to copy manually");
    }
  }, [mermaid]);
  const migrationBrief = useMemo(() => {
    if (!activeProposal) return generateMigrationBrief(workingProject);
    return generateMigrationBrief(project, activeProposal);
  }, [activeProposal, project, workingProject]);
  const diff = useMemo(
    () => activeProposal ? semanticDiff(activeProposal.before, activeProposal.after) : null,
    [activeProposal]
  );
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const visibleViewFamilies = useMemo(() =>
    VIEW_FAMILIES.map((family) => ({
      ...family,
      views: showAdvancedViews ? family.views : family.views.filter((id) => workingProject.views.find((view) => view.id === id)?.core !== false)
    })).filter((family) => family.views.length > 0),
  [showAdvancedViews, workingProject.views]);

  useEffect(() => {
    if (["code", "import"].includes(rightPanelMode) || ["code", "class_diagram", "api_surface", "schema_model"].includes(viewId)) {
      void loadSavedCodeIntelligence();
    }
  }, [loadSavedCodeIntelligence, rightPanelMode, viewId]);

  function markUnsaved() {
    changeSeqRef.current += 1;
    setHasUnsavedChanges(true);
    setSyncStatus((current) => current === "external-changes" ? current : "dirty");
  }

  function applyProjectState(next: AtlasProject, statusText?: string) {
    const nextActiveProposalId = next.proposals.some((proposal) => proposal.id === activeProposalId) ? activeProposalId : "";
    const nextWorkingProject = proposalWorkspace(next, nextActiveProposalId);

    if (next.intelligence !== project.intelligence) markCodeIntelligenceDirty();
    setProject(next);
    setIssues(validateAtlas(nextWorkingProject));
    setAiBrief(generateContextPack(nextWorkingProject, [], undefined, contextScope));
    markUnsaved();
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
    if (next.intelligence !== project.intelligence) markCodeIntelligenceDirty();
    const withProposal = commitWorkspaceEdit(project, next, activeProposalId);
    const nextWorkingProject = proposalWorkspace(withProposal, activeProposalId);

    if (options.recordHistory !== false) {
      setHistory((current) => ({
        past: [...current.past, structuredClone(project)].slice(-HISTORY_LIMIT),
        future: []
      }));
    }
    setProject(withProposal);
    setIssues(validateAtlas(nextWorkingProject));
    markUnsaved();
  }

  function markCodeIntelligenceDirty() {
    codeIntelligenceVersionRef.current += 1;
    setCodeIntelligenceLoaded(true);
  }

  function hasUnpersistedCodeIntelligence() {
    return codeIntelligenceVersionRef.current !== persistedCodeIntelligenceVersionRef.current;
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
    setAiBrief(generateContextPack(next, [], undefined, contextScope));
    markUnsaved();
    setHistory({ past: [], future: [] });
    setPackHealth(null);
    codeIntelligenceVersionRef.current = 0;
    persistedCodeIntelligenceVersionRef.current = 0;
    codeIntelligenceLoadRef.current = null;
    setCodeIntelligenceLoaded(hasCodeIntelligence(next.intelligence));
    setCodeIntelligenceLoading(false);
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
    markUnsaved();
    setViewId("proposals");
    setPreviewTab("ai");
    setAiBrief(generateMigrationBrief(next, proposal));
    setStatus("Proposal mode started");
  }

  function exitProposal() {
    setActiveProposalId("");
    setIssues(validateAtlas(project));
    setAiBrief(generateContextPack(project, [], undefined, contextScope));
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

  function applyActiveProposal() {
    if (!activeProposal) return;
    setHistory((current) => ({
      past: [...current.past, structuredClone(project)].slice(-HISTORY_LIMIT),
      future: []
    }));
    const applied = applyProposal(project, activeProposal.id);
    setProject(applied);
    setActiveProposalId("");
    setIssues(validateAtlas(applied));
    setAiBrief(generateContextPack(applied, [], undefined, contextScope));
    markUnsaved();
    setSelectedId(applied.nodes[0]?.id ?? applied.flows[0]?.id ?? "");
    setViewId("overview");
    setPreviewTab("overview");
    setStatus(`Applied proposal: ${activeProposal.name}`);
  }

  function createCheckpoint() {
    const checkpoint = createVersion(workingProject);
    const next = {
      ...project,
      manifest: { ...project.manifest, updatedAt: new Date().toISOString() },
      versions: [...project.versions, checkpoint]
    };
    setHistory((current) => ({
      past: [...current.past, structuredClone(project)].slice(-HISTORY_LIMIT),
      future: []
    }));
    setProject(next);
    markUnsaved();
    setStatus(`Created checkpoint: ${checkpoint.name}`);
  }

  function restoreCheckpoint(versionId: string) {
    if (!versionId) return;
    const version = project.versions.find((item) => item.id === versionId);
    if (!version) return;
    if (!window.confirm(`Restore checkpoint "${version.name}" into the main atlas? Current unsaved edits will be replaced in memory.`)) return;

    setHistory((current) => ({
      past: [...current.past, structuredClone(project)].slice(-HISTORY_LIMIT),
      future: []
    }));
    const restored = restoreVersion(project, versionId);
    setProject(restored);
    setActiveProposalId("");
    setIssues(validateAtlas(restored));
    setAiBrief(generateContextPack(restored, [], undefined, contextScope));
    markUnsaved();
    setSelectedId(restored.nodes[0]?.id ?? restored.flows[0]?.id ?? "");
    setViewId("overview");
    setPreviewTab("overview");
    setStatus(`Restored checkpoint: ${version.name}`);
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
    const force = syncStatus === "external-changes"
      ? window.confirm("Architecture files changed on disk. Export will overwrite those disk changes with the current UI state. Continue?")
      : false;

    if (syncStatus === "external-changes" && !force) {
      setStatus("Export cancelled; reload disk changes or export again to overwrite");
      return;
    }

    await saveProjectToDisk("manual", force);
  }

  async function scanWorkspace() {
    try {
      const response = await api.scan();
      const withCodeEvidence = mergeCodeEvidence(workingProject, response.evidence, response.intelligence);
      updateProject(withCodeEvidence);
      setCodeIntelligenceLoaded(true);
      setCodeIntelligenceLoading(false);
      codeIntelligenceLoadRef.current = null;
      setShowAdvancedViews(true);
      setViewId("code");
      setRightPanelMode("import");
      setStatus(`Scanned ${response.intelligence.files.length} files, ${response.intelligence.classes.length} classes, ${response.intelligence.routes.length} routes, ${response.intelligence.schemas.length} schemas`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Scan failed");
    }
  }

  async function generateAiBrief() {
    const targetIds = selectedId ? [selectedId] : [];
    const includeIntelligence = hasUnpersistedCodeIntelligence();
    try {
      const response = activeProposalId
        ? await api.migrationBrief(project, activeProposalId, includeIntelligence)
        : await api.contextPack(workingProject, targetIds, "Implement an architecture-safe change using this atlas.", contextScope, includeIntelligence);
      setAiBrief(response.markdown);
    } catch {
      setAiBrief(activeProposalId ? migrationBrief : generateContextPack(workingProject, targetIds, undefined, contextScope));
    }
    setPreviewTab("ai");
    setStatus(activeProposalId ? "Generated migration brief" : "Generated AI context pack");
  }

  const noWorkspace = !workspaceRegistry?.currentWorkspaceId;

  if (workspaceLoading) {
    return (
      <div className="app-shell">
        <div className="workspace-loading" role="status" aria-live="polite">Loading System Atlas…</div>
      </div>
    );
  }

  if (noWorkspace) {
    return (
      <div className="app-shell">
        <header className="topbar topbar-onboarding">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true"><Network size={20} /></div>
            <div>
              <h1>System Atlas</h1>
              <p>Architecture workbench for your projects.</p>
            </div>
          </div>
          {workspaceRegistry && workspaceRegistry.workspaces.length > 0 && (
            <WorkspacePicker
              workspaces={workspaceRegistry.workspaces}
              currentId={workspaceRegistry.currentWorkspaceId}
              onSwitch={(id) => void switchWorkspaceAction(id)}
              onAdd={addWorkspaceAction}
              onRemove={(id) => void removeWorkspaceAction(id)}
              onRename={renameWorkspaceAction}
            />
          )}
        </header>
        <WorkspaceOnboarding onAdd={addWorkspaceAction} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><Network size={20} /></div>
          <div>
            <h1>System Atlas</h1>
            <p>C4, runtime, deployment, data, domain, security, decisions, and AI migration briefs.</p>
          </div>
        </div>

        <div className="toolbar">
          <WorkspacePicker
            workspaces={workspaceRegistry?.workspaces ?? []}
            currentId={workspaceRegistry?.currentWorkspaceId ?? null}
            onSwitch={(id) => void switchWorkspaceAction(id)}
            onAdd={addWorkspaceAction}
            onRemove={(id) => void removeWorkspaceAction(id)}
            onRename={renameWorkspaceAction}
          />
          <select aria-label="Starter atlas" onChange={(event) => loadTemplate(event.target.value)} value="">
            <option value="" disabled>Start from...</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
          <select aria-label="AI context budget" value={contextScope} onChange={(event) => setContextScope(event.target.value as ContextPackScope)} title="AI context pack budget">
            {CONTEXT_PACK_SCOPES.map((scope) => <option key={scope} value={scope}>Context: {prettyScope(scope)}</option>)}
          </select>
          <button
            type="button"
            className="icon-only"
            aria-label="Reload architecture from disk"
            onClick={() => {
              if (!hasUnsavedChanges || window.confirm("Reload from disk and discard unsaved UI changes?")) {
                reloadProjectFromDisk();
              }
            }}
            title="Reload architecture files from disk"
          >
            <RefreshCcw size={16} />
          </button>
          <button type="button" className="icon-only" aria-label="Undo" onClick={undoProjectChange} disabled={!canUndo} title="Undo last architecture edit"><Undo2 size={16} /></button>
          <button type="button" className="icon-only" aria-label="Redo" onClick={redoProjectChange} disabled={!canRedo} title="Redo architecture edit"><Redo2 size={16} /></button>
          <button type="button" className="icon-only" aria-label="Create checkpoint" onClick={createCheckpoint} title="Create architecture version checkpoint"><History size={16} /></button>
          {project.versions.length > 0 && (
            <select aria-label="Restore checkpoint" value="" onChange={(event) => restoreCheckpoint(event.target.value)} title="Restore a saved architecture checkpoint">
              <option value="" disabled>Restore...</option>
              {project.versions.slice().reverse().map((version) => <option key={version.id} value={version.id}>{version.name}</option>)}
            </select>
          )}
          <button type="button" onClick={scanWorkspace} title="Scan code evidence"><Search size={16} /> Scan</button>
          <button type="button" onClick={startProposal} title="Create proposal"><GitCompare size={16} /> Proposal</button>
          {activeProposal && <button type="button" className="primary" onClick={applyActiveProposal} title="Promote proposal after-state to the main atlas"><CheckCircle2 size={16} /> Apply Proposal</button>}
          {activeProposal && <button type="button" onClick={exitProposal} title="Return to the current architecture"><GitCompare size={16} /> Main Atlas</button>}
          <button type="button" onClick={validateDraft} title="Validate atlas"><CheckCircle2 size={16} /> Validate</button>
          <button type="button" onClick={generateAiBrief} title="Generate AI brief"><Bot size={16} /> AI Brief</button>
          <button type="button" className="primary" onClick={exportAtlas} title="Save architecture pack now"><Save size={16} /> Export</button>
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
                  <button key={id} type="button" className={viewId === id ? "active" : ""} aria-pressed={viewId === id} onClick={() => setViewId(id)} title={workingProject.views.find((view) => view.id === id)?.description}>
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
          onClick={() => {
            // Clamp in the event handler (not an effect): hiding advanced views
            // while one is active would leave a tab-less, invisible selection.
            if (showAdvancedViews && workingProject.views.find((view) => view.id === viewId)?.core === false) {
              setViewId("overview");
            }
            setShowAdvancedViews((value) => !value);
          }}
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
              <div className="canvas-mode-toggle" role="group" aria-label="Canvas mode">
                <button type="button" className={canvasMode === "graph" ? "active" : ""} aria-pressed={canvasMode === "graph"} onClick={() => setCanvasMode("graph")} title="Interactive graph for this view"><Network size={14} /> Graph</button>
                <button type="button" className={canvasMode === "mermaid" ? "active" : ""} aria-pressed={canvasMode === "mermaid"} onClick={() => setCanvasMode("mermaid")} title="Mermaid source for this view"><Code2 size={14} /> Mermaid</button>
              </div>
              <span><Boxes size={14} /> {graph.nodes.length} nodes</span>
              <span><Workflow size={14} /> {graph.edges.length} edges</span>
              {diff && <span><AlertTriangle size={14} /> {diff.addedNodes.length + diff.removedNodes.length + diff.changedNodes.length} proposed changes</span>}
              <button type="button" onClick={addNode} title={`Add ${nodeType.replace(/_/g, " ")}`}><Plus size={14} /> Add Node</button>
              <button type="button" onClick={addFlow} title="Add flow"><Plus size={14} /> Add Flow</button>
            </div>
          </div>
          {canvasMode === "graph" ? (
            <AtlasCanvas
              viewId={viewId}
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
          ) : (
            <div className="canvas-mermaid">
              <div className="canvas-mermaid-bar">
                <span>Mermaid source · {workingProject.views.find((view) => view.id === viewId)?.name ?? viewId} view</span>
                <button type="button" onClick={copyMermaid} title="Copy Mermaid source to clipboard">
                  {mermaidCopied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
              <pre>{mermaid}</pre>
            </div>
          )}
          <PreviewPanel
            tab={previewTab}
            onTabChange={setPreviewTab}
            overview={overview}
            issues={issues}
            architectureReview={architectureReview}
            aiBrief={aiBrief}
            migrationBrief={migrationBrief}
            activeProposal={activeProposal}
          />
        </section>

        <aside className="right-rail" aria-label="Inspector and code intelligence">
          <div className="right-rail-tabs" role="group" aria-label="Right panel">
            <button type="button" className={rightPanelMode === "inspector" ? "active" : ""} aria-pressed={rightPanelMode === "inspector"} onClick={() => setRightPanelMode("inspector")}>
              <FileText size={14} /> Inspector
            </button>
            <button type="button" className={rightPanelMode === "code" ? "active" : ""} aria-pressed={rightPanelMode === "code"} onClick={() => setRightPanelMode("code")}>
              <Code2 size={14} /> Code Intel
            </button>
            <button type="button" className={rightPanelMode === "import" ? "active" : ""} aria-pressed={rightPanelMode === "import"} onClick={() => setRightPanelMode("import")}>
              <FileDown size={14} /> Import
            </button>
          </div>
          {rightPanelMode === "code" ? (
            <section className="panel code-intel-panel">
              <CodeIntelligenceExplorer
                project={workingProject}
                selectedId={selectedId}
                isLoading={codeIntelligenceLoading}
                onSelect={(id) => {
                  selectConcept(id);
                  setRightPanelMode("inspector");
                }}
              />
            </section>
          ) : rightPanelMode === "import" ? (
            <section className="panel code-intel-panel">
              <ImportReview
                project={workingProject}
                isLoading={codeIntelligenceLoading}
                onChange={updateProject}
                onPreview={(candidate) => {
                  setViewId(candidate.viewId);
                  setSelectedId(candidate.node.id);
                  setRightPanelMode("inspector");
                }}
              />
            </section>
          ) : (
            <Inspector
              project={workingProject}
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              selectedFlow={selectedFlow}
              readOnly={selectedNodeReadOnly}
              onSelect={setSelectedId}
              onCreateEdge={addEdge}
              onDeleteNode={deleteNode}
              onDeleteEdge={deleteEdge}
              onDeleteFlow={deleteFlow}
              onChange={updateProject}
            />
          )}
        </aside>
      </main>

      <footer className="statusbar">
        <span><Play size={14} /> {status}</span>
        {activeProposal && <span>Editing proposal: {activeProposal.name}</span>}
        <span>{project.versions.length} checkpoints</span>
        <span>{prettySyncStatus(syncStatus)}{lastSyncedAt ? ` · ${formatSyncTime(lastSyncedAt)}` : ""}</span>
        <span className={`pack-health ${packHealthClass(packHealth)}`} title={packHealthTitle(packHealth)}>
          {packHealthLabel(packHealth)}
        </span>
        {hasUnsavedChanges && <span>{syncStatus === "external-changes" ? "Unsaved UI changes; disk changed" : "Unsaved UI changes"}</span>}
        {externalRevision && <span>External revision waiting</span>}
        <span><FileDown size={14} /> Syncs to <code>architecture/</code></span>
      </footer>
    </div>
  );
}

function mergeDefaultViews(project: AtlasProject): AtlasProject {
  const existing = new Map(project.views.map((view) => [view.id, view]));
  const merged = defaultViews().map((view) => ({ ...view, ...(existing.get(view.id) ?? {}) }));
  return { ...project, views: merged, versions: project.versions ?? [], proposals: project.proposals ?? [], evidence: project.evidence ?? [], intelligence: project.intelligence ?? emptyCodeIntelligence() };
}

function prettyScope(scope: ContextPackScope) {
  return scope.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function prettySyncStatus(status: SyncStatus) {
  const labels: Record<SyncStatus, string> = {
    idle: "No architecture pack yet",
    dirty: "Sync pending",
    saving: "Syncing",
    synced: "Synced",
    "external-changes": "External changes detected",
    error: "Sync error"
  };
  return labels[status];
}

function packHealthLabel(health: PackHealth | null) {
  if (!health) return "Pack Health: unknown";
  const labels: Record<PackHealth["status"], string> = {
    missing: "Pack Health: missing",
    healthy: "Pack Health: healthy",
    stale: "Pack Health: stale",
    misaligned: "Pack Health: misaligned"
  };
  return labels[health.status];
}

function packHealthClass(health: PackHealth | null) {
  return health?.status ?? "unknown";
}

function packHealthTitle(health: PackHealth | null) {
  if (!health) return "Generated/evidence metadata has not been loaded yet.";
  return [
    health.message,
    health.generated?.generatedAt ? `Generated: ${health.generated.generatedAt}` : "",
    health.evidence?.generatedAt ? `Evidence: ${health.evidence.generatedAt}` : "",
    ...health.issues
  ].filter(Boolean).join("\n");
}

function formatSyncTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
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
