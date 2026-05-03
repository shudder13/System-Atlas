import { Plus } from "lucide-react";
import { nodeColors, nodeIcons, prettyType } from "../lib/nodeVisuals";
import { AtlasProject, EDGE_TYPES, EdgeType, NODE_TYPES, NodeType } from "../types";

interface InventoryProps {
  project: AtlasProject;
  selectedId: string;
  nodeType: NodeType;
  edgeType: EdgeType;
  onSelect: (id: string) => void;
  onNodeTypeChange: (type: NodeType) => void;
  onEdgeTypeChange: (type: EdgeType) => void;
  onAddNode: () => void;
  onAddFlow: () => void;
}

export function Inventory({
  project,
  selectedId,
  nodeType,
  edgeType,
  onSelect,
  onNodeTypeChange,
  onEdgeTypeChange,
  onAddNode,
  onAddFlow
}: InventoryProps) {
  const grouped = project.nodes.reduce<Record<string, typeof project.nodes>>((groups, node) => {
    groups[node.type] = groups[node.type] ?? [];
    groups[node.type].push(node);
    return groups;
  }, {});

  return (
    <aside className="panel inventory">
      <div className="panel-title">
        <div>
          <h2>Inventory</h2>
          <p>{project.nodes.length} concepts, {project.edges.length} links, {project.flows.length} flows</p>
        </div>
      </div>

      <div className="creator">
        <label>
          Node type
          <select value={nodeType} onChange={(event) => onNodeTypeChange(event.target.value as NodeType)}>
            {NODE_TYPES.map((type) => <option key={type} value={type}>{prettyType(type)}</option>)}
        </select>
      </label>
      <button type="button" className="primary stretch" onClick={onAddNode}><Plus size={15} /> Add Node</button>
      <button type="button" className="stretch" onClick={onAddFlow}><Plus size={15} /> Add Flow</button>
    </div>

      <label className="field">
        New edge type
        <select value={edgeType} onChange={(event) => onEdgeTypeChange(event.target.value as EdgeType)}>
          {EDGE_TYPES.map((type) => <option key={type} value={type}>{prettyType(type)}</option>)}
        </select>
      </label>

      <div className="flows-list">
        <h3>Flows</h3>
        {project.flows.length ? (
          project.flows.map((flow) => (
            <button
              key={flow.id}
              type="button"
              className={selectedId === flow.id ? "inventory-item active" : "inventory-item"}
              onClick={() => onSelect(flow.id)}
            >
              <InventoryIcon type="flow" />
              <span>
                <strong>{flow.name}</strong>
                <small>{flow.steps.length} steps · {flow.criticality}</small>
              </span>
            </button>
          ))
        ) : (
          <p className="inventory-empty">No flows yet.</p>
        )}
      </div>

      <div className="inventory-list">
        {Object.entries(grouped).map(([type, nodes]) => (
          <section key={type}>
            <h3>{prettyType(type)}</h3>
            {nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                className={selectedId === node.id ? "inventory-item active" : "inventory-item"}
                onClick={() => onSelect(node.id)}
              >
                <InventoryIcon type={node.type} />
                <span>
                  <strong>{node.name}</strong>
                  <small>{node.owner} · {node.criticality}</small>
                </span>
              </button>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}

function InventoryIcon({ type }: { type: NodeType }) {
  const Icon = nodeIcons[type];
  const color = nodeColors[type];

  return (
    <span className="inventory-icon" style={{ color, borderColor: color, background: `${color}12` }}>
      <Icon size={14} strokeWidth={2.2} />
    </span>
  );
}
