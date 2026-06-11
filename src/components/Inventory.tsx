import { ChevronDown, ChevronRight, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
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

const FLOWS_GROUP = "__flows__";

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
  const [filter, setFilter] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const query = filter.trim().toLowerCase();
  const filtering = query.length > 0;

  const flows = useMemo(
    () => project.flows.filter((flow) => !query || flow.name.toLowerCase().includes(query)),
    [project.flows, query]
  );

  const grouped = useMemo(() => {
    const matches = (node: AtlasProject["nodes"][number]) =>
      !query ||
      node.name.toLowerCase().includes(query) ||
      prettyType(node.type).toLowerCase().includes(query);
    return project.nodes.reduce<Record<string, AtlasProject["nodes"]>>((groups, node) => {
      if (!matches(node)) return groups;
      groups[node.type] = groups[node.type] ?? [];
      groups[node.type].push(node);
      return groups;
    }, {});
  }, [project.nodes, query]);

  const totalMatches = flows.length + Object.values(grouped).reduce((sum, nodes) => sum + nodes.length, 0);

  const isOpen = (key: string) => filtering || !collapsed.has(key);
  const toggle = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  return (
    <aside className="panel inventory">
      <div className="panel-title">
        <div>
          <h2>Inventory</h2>
          <p>{project.manifest.name} · {project.nodes.length} concepts, {project.edges.length} links, {project.flows.length} flows</p>
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

      <div className="inventory-filter">
        <Search size={14} />
        <input
          type="text"
          placeholder="Filter elements…"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filter elements by name or type"
        />
        {filter && (
          <button type="button" onClick={() => setFilter("")} aria-label="Clear filter" title="Clear filter">
            <X size={13} />
          </button>
        )}
      </div>

      <div className="inventory-scroll">
        {flows.length > 0 && (
          <section className="inventory-group">
            <button type="button" className="inventory-group-head" onClick={() => toggle(FLOWS_GROUP)} aria-expanded={isOpen(FLOWS_GROUP)}>
              {isOpen(FLOWS_GROUP) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>Flows</span>
              <small>{flows.length}</small>
            </button>
            {isOpen(FLOWS_GROUP) &&
              flows.map((flow) => (
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
              ))}
          </section>
        )}

        {Object.entries(grouped).map(([type, nodes]) => (
          <section key={type} className="inventory-group">
            <button type="button" className="inventory-group-head" onClick={() => toggle(type)} aria-expanded={isOpen(type)}>
              {isOpen(type) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>{prettyType(type)}</span>
              <small>{nodes.length}</small>
            </button>
            {isOpen(type) &&
              nodes.map((node) => (
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

        {filtering && totalMatches === 0 && <p className="inventory-empty">No elements match “{filter}”.</p>}
        {!filtering && project.nodes.length === 0 && project.flows.length === 0 && (
          <p className="inventory-empty">No elements yet. Add a node or flow above.</p>
        )}
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
