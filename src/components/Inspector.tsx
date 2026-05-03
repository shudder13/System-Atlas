import { useEffect, useMemo, useState } from "react";
import { AtlasEdge, AtlasFlow, AtlasNode, AtlasProject, CodeEvidence, EDGE_TYPES, EdgeType, NODE_TYPES } from "../types";

interface InspectorProps {
  project: AtlasProject;
  selectedNode?: AtlasNode;
  selectedEdge?: AtlasEdge;
  selectedFlow?: AtlasFlow;
  onSelect: (id: string) => void;
  onCreateEdge: (source: string, target: string, type: EdgeType, label?: string) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onDeleteFlow: (id: string) => void;
  onChange: (project: AtlasProject) => void;
}

export function Inspector({
  project,
  selectedNode,
  selectedEdge,
  selectedFlow,
  onSelect,
  onCreateEdge,
  onDeleteNode,
  onDeleteEdge,
  onDeleteFlow,
  onChange
}: InspectorProps) {
  if (selectedNode) {
    return (
      <aside className="panel inspector">
        <Header title={selectedNode.name} subtitle={`${selectedNode.type} · ${selectedNode.id}`} />
        <label className="field">Name <input value={selectedNode.name} onChange={(event) => updateNode(project, selectedNode.id, { name: event.target.value }, onChange)} /></label>
        <label className="field">Type
          <select value={selectedNode.type} onChange={(event) => updateNode(project, selectedNode.id, { type: event.target.value as AtlasNode["type"] }, onChange)}>
            {NODE_TYPES.map((type) => <option key={type} value={type}>{pretty(type)}</option>)}
          </select>
        </label>
        <label className="field">Owner <input value={selectedNode.owner} onChange={(event) => updateNode(project, selectedNode.id, { owner: event.target.value }, onChange)} /></label>
        <label className="field">Status
          <select value={selectedNode.status} onChange={(event) => updateNode(project, selectedNode.id, { status: event.target.value as AtlasNode["status"] }, onChange)}>
            {["planned", "active", "deprecated", "unknown"].map((status) => <option key={status} value={status}>{pretty(status)}</option>)}
          </select>
        </label>
        <label className="field">Criticality
          <select value={selectedNode.criticality} onChange={(event) => updateNode(project, selectedNode.id, { criticality: event.target.value as AtlasNode["criticality"] }, onChange)}>
            {["low", "medium", "high", "critical"].map((criticality) => <option key={criticality} value={criticality}>{pretty(criticality)}</option>)}
          </select>
        </label>
        <NodeRelationships
          project={project}
          node={selectedNode}
          onSelect={onSelect}
          onCreateEdge={onCreateEdge}
          onDeleteEdge={onDeleteEdge}
        />
        <NodeEvidence project={project} node={selectedNode} />
        <TextareaList label="Responsibilities" values={selectedNode.responsibilities} onChange={(values) => updateNode(project, selectedNode.id, { responsibilities: values }, onChange)} />
        <TextareaList label="Invariants" values={selectedNode.invariants} onChange={(values) => updateNode(project, selectedNode.id, { invariants: values }, onChange)} />
        <TextareaList label="Linked files" values={selectedNode.linkedFiles} onChange={(values) => updateNode(project, selectedNode.id, { linkedFiles: values }, onChange)} />
        <TextareaList label="Linked tests" values={selectedNode.linkedTests} onChange={(values) => updateNode(project, selectedNode.id, { linkedTests: values }, onChange)} />
        <TextareaList label="Risks" values={selectedNode.risks} onChange={(values) => updateNode(project, selectedNode.id, { risks: values }, onChange)} />
        <label className="field">Notes <textarea rows={5} value={selectedNode.notes ?? ""} onChange={(event) => updateNode(project, selectedNode.id, { notes: event.target.value }, onChange)} /></label>
        <div className="inspector-actions">
          <button type="button" className="danger stretch" onClick={() => confirmDelete(`Delete ${selectedNode.name}? Connected edges will also be removed.`, () => onDeleteNode(selectedNode.id))}>
            Delete Node
          </button>
        </div>
      </aside>
    );
  }

  if (selectedEdge) {
    return (
      <aside className="panel inspector">
        <Header title={selectedEdge.label || selectedEdge.type} subtitle={`${selectedEdge.source} -> ${selectedEdge.target}`} />
        <label className="field">Type
          <select value={selectedEdge.type} onChange={(event) => updateEdge(project, selectedEdge.id, { type: event.target.value as AtlasEdge["type"] }, onChange)}>
            {EDGE_TYPES.map((type) => <option key={type} value={type}>{pretty(type)}</option>)}
          </select>
        </label>
        <label className="field">Label <input value={selectedEdge.label ?? ""} onChange={(event) => updateEdge(project, selectedEdge.id, { label: event.target.value }, onChange)} /></label>
        <label className="field">Description <textarea rows={5} value={selectedEdge.description ?? ""} onChange={(event) => updateEdge(project, selectedEdge.id, { description: event.target.value }, onChange)} /></label>
        <label className="field">Risk <textarea rows={4} value={selectedEdge.risk ?? ""} onChange={(event) => updateEdge(project, selectedEdge.id, { risk: event.target.value }, onChange)} /></label>
        <div className="inspector-actions">
          <button type="button" className="danger stretch" onClick={() => confirmDelete(`Delete edge ${selectedEdge.label || selectedEdge.type}?`, () => onDeleteEdge(selectedEdge.id))}>
            Delete Edge
          </button>
        </div>
      </aside>
    );
  }

  if (selectedFlow) {
    return (
      <aside className="panel inspector">
        <Header title={selectedFlow.name} subtitle={`${selectedFlow.steps.length} steps · ${selectedFlow.criticality}`} />
        <label className="field">Name <input value={selectedFlow.name} onChange={(event) => updateFlow(project, selectedFlow.id, { name: event.target.value }, onChange)} /></label>
        <label className="field">Owner <input value={selectedFlow.owner} onChange={(event) => updateFlow(project, selectedFlow.id, { owner: event.target.value }, onChange)} /></label>
        <label className="field">Criticality
          <select value={selectedFlow.criticality} onChange={(event) => updateFlow(project, selectedFlow.id, { criticality: event.target.value as AtlasFlow["criticality"] }, onChange)}>
            {["low", "medium", "high", "critical"].map((criticality) => <option key={criticality} value={criticality}>{pretty(criticality)}</option>)}
          </select>
        </label>
        <label className="field">Description <textarea rows={4} value={selectedFlow.description} onChange={(event) => updateFlow(project, selectedFlow.id, { description: event.target.value }, onChange)} /></label>
        <label className="field">
          Steps
          <textarea
            rows={5}
            value={selectedFlow.steps.map((step) => `${step.label}${step.nodeId ? ` | ${step.nodeId}` : ""}`).join("\n")}
            onChange={(event) => updateFlow(project, selectedFlow.id, { steps: parseSteps(event.target.value) }, onChange)}
          />
        </label>
        <TextareaList label="Failure modes" values={selectedFlow.failureModes} onChange={(values) => updateFlow(project, selectedFlow.id, { failureModes: values }, onChange)} />
        <TextareaList label="Acceptance checks" values={selectedFlow.acceptanceChecks} onChange={(values) => updateFlow(project, selectedFlow.id, { acceptanceChecks: values }, onChange)} />
        <TextareaList label="Linked tests" values={selectedFlow.linkedTests} onChange={(values) => updateFlow(project, selectedFlow.id, { linkedTests: values }, onChange)} />
        <div className="inspector-actions">
          <button type="button" className="danger stretch" onClick={() => confirmDelete(`Delete ${selectedFlow.name}?`, () => onDeleteFlow(selectedFlow.id))}>
            Delete Flow
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="panel inspector empty-state">
      <h2>No selection</h2>
      <p>Select a node, edge, or flow to edit architecture meaning, linked evidence, invariants, and risks.</p>
    </aside>
  );
}

function NodeEvidence({ project, node }: { project: AtlasProject; node: AtlasNode }) {
  const evidence = evidenceForNode(project, node).slice(0, 8);

  return (
    <section className="code-evidence">
      <h3>Code Evidence</h3>
      {evidence.length ? evidence.map((item) => (
        <article className="evidence-card" key={item.path}>
          <strong>{item.path}</strong>
          <span>{[item.kind, item.language, item.lines ? `${item.lines} lines` : ""].filter(Boolean).join(" · ")}</span>
          {item.exports?.length ? <small>Exports: {item.exports.slice(0, 6).join(", ")}</small> : null}
          {item.routes?.length ? <small>Routes: {item.routes.slice(0, 4).join(", ")}</small> : null}
          {item.symbols?.length ? <SymbolList symbols={item.symbols} /> : null}
        </article>
      )) : <p className="muted">No scanned evidence linked yet. Run Scan, then link files or inspect generated Code view nodes.</p>}
    </section>
  );
}

function SymbolList({ symbols }: { symbols: NonNullable<CodeEvidence["symbols"]> }) {
  return (
    <ul className="symbol-list">
      {symbols.slice(0, 8).map((symbol) => (
        <li key={`${symbol.kind}-${symbol.name}-${symbol.line ?? ""}`}>
          <span>{symbol.kind}</span>
          <strong>{symbol.name}</strong>
          {symbol.line ? <em>:{symbol.line}</em> : null}
        </li>
      ))}
    </ul>
  );
}

function evidenceForNode(project: AtlasProject, node: AtlasNode) {
  const linkedFiles = new Set(node.linkedFiles);
  return project.evidence.filter((item) =>
    item.linkedNodeIds?.includes(node.id) ||
    linkedFiles.has(item.path) ||
    node.linkedFiles.some((linkedPath) => item.path === linkedPath || item.path.startsWith(`${linkedPath}/`))
  );
}

function NodeRelationships({
  project,
  node,
  onSelect,
  onCreateEdge,
  onDeleteEdge
}: {
  project: AtlasProject;
  node: AtlasNode;
  onSelect: (id: string) => void;
  onCreateEdge: (source: string, target: string, type: EdgeType, label?: string) => void;
  onDeleteEdge: (id: string) => void;
}) {
  const targetOptions = useMemo(() => project.nodes.filter((item) => item.id !== node.id), [node.id, project.nodes]);
  const [targetId, setTargetId] = useState(targetOptions[0]?.id ?? "");
  const [type, setType] = useState<EdgeType>("calls");
  const [label, setLabel] = useState("");
  const linkedEdges = project.edges.filter((edge) => edge.source === node.id || edge.target === node.id);

  useEffect(() => {
    if (!targetOptions.some((target) => target.id === targetId)) {
      setTargetId(targetOptions[0]?.id ?? "");
    }
  }, [targetId, targetOptions]);

  return (
    <section className="relationship-editor">
      <h3>Edges</h3>
      <div className="edge-composer">
        <label className="field">Target
          <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
            {targetOptions.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
          </select>
        </label>
        <label className="field">Type
          <select value={type} onChange={(event) => setType(event.target.value as EdgeType)}>
            {EDGE_TYPES.map((edgeType) => <option key={edgeType} value={edgeType}>{pretty(edgeType)}</option>)}
          </select>
        </label>
        <label className="field">Label
          <input value={label} placeholder={pretty(type)} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <button
          type="button"
          className="stretch"
          disabled={!targetId}
          onClick={() => {
            onCreateEdge(node.id, targetId, type, label);
            setLabel("");
          }}
        >
          Add Edge
        </button>
      </div>

      <div className="relationship-list">
        {linkedEdges.length ? linkedEdges.map((edge) => {
          const otherId = edge.source === node.id ? edge.target : edge.source;
          const other = project.nodes.find((item) => item.id === otherId);
          const direction = edge.source === node.id ? "to" : "from";

          return (
            <div className="relationship-row" key={edge.id}>
              <button type="button" onClick={() => onSelect(edge.id)}>
                <strong>{edge.label || pretty(edge.type)}</strong>
                <span>{direction} {other?.name ?? otherId}</span>
              </button>
              <button type="button" className="danger compact" onClick={() => confirmDelete(`Delete edge ${edge.label || edge.type}?`, () => onDeleteEdge(edge.id))}>
                Delete
              </button>
            </div>
          );
        }) : <p className="muted">No edges connected to this node.</p>}
      </div>
    </section>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="panel-title inspector-title">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function TextareaList({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  return (
    <label className="field">
      {label}
      <textarea
        rows={4}
        value={values.join("\n")}
        onChange={(event) => onChange(event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))}
      />
    </label>
  );
}

function updateNode(project: AtlasProject, id: string, patch: Partial<AtlasNode>, onChange: (project: AtlasProject) => void) {
  onChange({ ...project, nodes: project.nodes.map((node) => node.id === id ? { ...node, ...patch } : node) });
}

function updateEdge(project: AtlasProject, id: string, patch: Partial<AtlasEdge>, onChange: (project: AtlasProject) => void) {
  onChange({ ...project, edges: project.edges.map((edge) => edge.id === id ? { ...edge, ...patch } : edge) });
}

function updateFlow(project: AtlasProject, id: string, patch: Partial<AtlasFlow>, onChange: (project: AtlasProject) => void) {
  onChange({ ...project, flows: project.flows.map((flow) => flow.id === id ? { ...flow, ...patch } : flow) });
}

function pretty(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseSteps(value: string) {
  return value.split("\n").map((line, index) => {
    const [label, nodeId] = line.split("|").map((part) => part.trim());
    return label ? { id: `step.${index + 1}`, label, nodeId: nodeId || undefined } : null;
  }).filter(Boolean) as AtlasFlow["steps"];
}

function confirmDelete(message: string, action: () => void) {
  if (window.confirm(message)) action();
}
