import { AtlasEdge, AtlasFlow, AtlasNode, AtlasProject, EDGE_TYPES, NODE_TYPES } from "../types";

interface InspectorProps {
  project: AtlasProject;
  selectedNode?: AtlasNode;
  selectedEdge?: AtlasEdge;
  selectedFlow?: AtlasFlow;
  onSelect: (id: string) => void;
  onChange: (project: AtlasProject) => void;
}

export function Inspector({ project, selectedNode, selectedEdge, selectedFlow, onChange }: InspectorProps) {
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
        <TextareaList label="Responsibilities" values={selectedNode.responsibilities} onChange={(values) => updateNode(project, selectedNode.id, { responsibilities: values }, onChange)} />
        <TextareaList label="Invariants" values={selectedNode.invariants} onChange={(values) => updateNode(project, selectedNode.id, { invariants: values }, onChange)} />
        <TextareaList label="Linked files" values={selectedNode.linkedFiles} onChange={(values) => updateNode(project, selectedNode.id, { linkedFiles: values }, onChange)} />
        <TextareaList label="Linked tests" values={selectedNode.linkedTests} onChange={(values) => updateNode(project, selectedNode.id, { linkedTests: values }, onChange)} />
        <TextareaList label="Risks" values={selectedNode.risks} onChange={(values) => updateNode(project, selectedNode.id, { risks: values }, onChange)} />
        <label className="field">Notes <textarea rows={5} value={selectedNode.notes ?? ""} onChange={(event) => updateNode(project, selectedNode.id, { notes: event.target.value }, onChange)} /></label>
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
