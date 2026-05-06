import { useEffect, useMemo, useState } from "react";
import { MetadataFieldDefinition, metadataFieldsForNode } from "../lib/atlas";
import { AtlasEdge, AtlasFlow, AtlasNode, AtlasProject, CodeEvidence, EDGE_TYPES, EdgeType, MetadataValue, NODE_TYPES } from "../types";

interface InspectorProps {
  project: AtlasProject;
  selectedNode?: AtlasNode;
  selectedEdge?: AtlasEdge;
  selectedFlow?: AtlasFlow;
  readOnly?: boolean;
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
  readOnly = false,
  onSelect,
  onCreateEdge,
  onDeleteNode,
  onDeleteEdge,
  onDeleteFlow,
  onChange
}: InspectorProps) {
  if (selectedNode && readOnly) {
    return <ReadOnlyNodeInspector project={project} node={selectedNode} />;
  }

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
        <MetadataEditor
          node={selectedNode}
          onChange={(metadata) => updateNode(project, selectedNode.id, { metadata }, onChange)}
        />
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
        <FlowStepEditor
          project={project}
          flow={selectedFlow}
          onChange={(steps) => updateFlow(project, selectedFlow.id, { steps }, onChange)}
        />
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

function ReadOnlyNodeInspector({ project, node }: { project: AtlasProject; node: AtlasNode }) {
  const metadata = Object.entries(node.metadata ?? {}).filter(([, value]) =>
    value !== undefined &&
    value !== "" &&
    (!Array.isArray(value) || value.length > 0)
  );

  return (
    <aside className="panel inspector">
      <Header title={node.name} subtitle={`${node.type} · generated view fact`} />
      <section className="metadata-editor">
        <div className="section-heading">
          <h3>Saved Evidence</h3>
          <span>read only</span>
        </div>
        <p className="helper-copy">
          This item is rendered from saved code intelligence or evidence files. Run Scan to refresh it, or create a manual atlas node if you want to edit architecture meaning.
        </p>
        {metadata.slice(0, 12).map(([key, value]) => (
          <div className="evidence-card" key={key}>
            <strong>{pretty(key)}</strong>
            <small>{Array.isArray(value) ? value.join(", ") : String(value)}</small>
          </div>
        ))}
      </section>
      <NodeEvidence project={project} node={node} />
      {node.responsibilities.length > 0 && (
        <TextareaList label="Responsibilities" values={node.responsibilities} onChange={() => undefined} readOnly />
      )}
      {node.linkedFiles.length > 0 && (
        <TextareaList label="Linked files" values={node.linkedFiles} onChange={() => undefined} readOnly />
      )}
      {node.linkedTests.length > 0 && (
        <TextareaList label="Linked tests" values={node.linkedTests} onChange={() => undefined} readOnly />
      )}
    </aside>
  );
}

function MetadataEditor({
  node,
  onChange
}: {
  node: AtlasNode;
  onChange: (metadata: AtlasNode["metadata"]) => void;
}) {
  const fields = metadataFieldsForNode(node.type);
  const metadata = node.metadata ?? {};

  function updateMetadata(key: string, value: MetadataValue) {
    const next = { ...metadata, [key]: value };
    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
      delete next[key];
    }
    onChange(next);
  }

  return (
    <section className="metadata-editor">
      <div className="section-heading">
        <h3>Typed Metadata</h3>
        <span>{fields.length} fields</span>
      </div>
      {fields.map((field) => (
        <MetadataField
          key={field.key}
          field={field}
          value={metadata[field.key]}
          onChange={(value) => updateMetadata(field.key, value)}
        />
      ))}
    </section>
  );
}

function MetadataField({
  field,
  value,
  onChange
}: {
  field: MetadataFieldDefinition;
  value: MetadataValue;
  onChange: (value: MetadataValue) => void;
}) {
  if (field.kind === "boolean") {
    return (
      <label className="metadata-checkbox" title={field.description}>
        <input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked ? true : undefined)} />
        <span>{field.label}</span>
      </label>
    );
  }

  if (field.kind === "number") {
    return (
      <label className="field" title={field.description}>{field.label}
        <input
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
        />
      </label>
    );
  }

  if (field.kind === "list") {
    return (
      <label className="field" title={field.description}>{field.label}
        <textarea
          rows={3}
          value={Array.isArray(value) ? value.join("\n") : ""}
          onChange={(event) => onChange(event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))}
        />
      </label>
    );
  }

  return (
    <label className="field" title={field.description}>{field.label}
      <input value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function FlowStepEditor({
  project,
  flow,
  onChange
}: {
  project: AtlasProject;
  flow: AtlasFlow;
  onChange: (steps: AtlasFlow["steps"]) => void;
}) {
  const nodes = project.nodes;

  function updateStep(id: string, patch: Partial<AtlasFlow["steps"][number]>) {
    onChange(flow.steps.map((step) => step.id === id ? { ...step, ...patch } : step));
  }

  function addStep() {
    onChange([
      ...flow.steps,
      { id: `step.${Date.now()}`, label: `Step ${flow.steps.length + 1}`, nodeId: nodes[0]?.id }
    ]);
  }

  function removeStep(id: string) {
    onChange(flow.steps.filter((step) => step.id !== id));
  }

  return (
    <section className="flow-step-editor">
      <div className="section-heading">
        <h3>Steps</h3>
        <button type="button" className="compact" onClick={addStep}>Add Step</button>
      </div>
      {flow.steps.length ? flow.steps.map((step, index) => (
        <div className="flow-step-row" key={step.id}>
          <span>{index + 1}</span>
          <label className="field">Label
            <input value={step.label} onChange={(event) => updateStep(step.id, { label: event.target.value })} />
          </label>
          <label className="field">Node
            <select value={step.nodeId ?? ""} onChange={(event) => updateStep(step.id, { nodeId: event.target.value || undefined })}>
              <option value="">Unlinked</option>
              {nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
            </select>
          </label>
          <button type="button" className="danger compact" onClick={() => removeStep(step.id)}>Remove</button>
        </div>
      )) : <p className="muted">No steps yet.</p>}
    </section>
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

function TextareaList({ label, values, onChange, readOnly = false }: { label: string; values: string[]; onChange: (values: string[]) => void; readOnly?: boolean }) {
  return (
    <label className="field">
      {label}
      <textarea
        rows={4}
        readOnly={readOnly}
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

function confirmDelete(message: string, action: () => void) {
  if (window.confirm(message)) action();
}
