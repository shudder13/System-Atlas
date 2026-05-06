import {
  Background,
  Connection,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  Position,
  ReactFlow
} from "@xyflow/react";
import { useMemo } from "react";
import { AtlasEdge, AtlasNode, MetadataValue, ViewId } from "../types";
import { nodeColors, nodeIcons, prettyType } from "../lib/nodeVisuals";

interface AtlasCanvasProps {
  viewId: ViewId;
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  selectedId: string;
  highlightedNodeIds?: string[];
  onSelect: (id: string) => void;
  onConnect: (source: string, target: string) => void;
  onPositionChange: (positions: Map<string, { x: number; y: number } | undefined>) => void;
}

export function AtlasCanvas({ viewId, nodes, edges, selectedId, highlightedNodeIds = [], onSelect, onConnect, onPositionChange }: AtlasCanvasProps) {
  const highlightedNodes = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds]);
  const hasFlowHighlight = highlightedNodes.size > 0;

  const flowNodes = useMemo<Node[]>(() => nodes.map((node) => {
    const Icon = nodeIcons[node.type];
    const color = nodeColors[node.type];
    const isHighlighted = !hasFlowHighlight || highlightedNodes.has(node.id);
    const isSelected = selectedId === node.id;
    const details = viewDetails(node, viewId);
    const nodeHeight = details.length ? 118 : 84;

    return {
      id: node.id,
      position: node.position ?? { x: 0, y: 0 },
      width: 196,
      height: nodeHeight,
      initialWidth: 196,
      initialHeight: nodeHeight,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: (
          <div className="atlas-node-content">
            <div className="node-title-row">
              <span className="node-icon" style={{ color, borderColor: color, background: `${color}12` }}>
                <Icon size={15} strokeWidth={2.2} />
              </span>
              <div className="node-text">
                <span className="node-kicker">{prettyType(node.type)}</span>
                <strong>{node.name}</strong>
              </div>
            </div>
            <small>{node.owner} · {node.criticality}</small>
            {details.length > 0 && (
              <div className="node-details">
                {details.map((detail) => <span key={detail}>{detail}</span>)}
              </div>
            )}
          </div>
        )
      },
      selected: isSelected,
      style: {
        borderColor: isSelected ? "#111827" : color,
        borderWidth: isSelected || isHighlighted ? 2 : 1,
        borderRadius: 8,
        color: "#111827",
        width: 196,
        minHeight: nodeHeight,
        opacity: isHighlighted ? 1 : 0.34,
        boxShadow: isSelected
          ? "0 12px 30px rgba(17, 24, 39, 0.16)"
          : isHighlighted && hasFlowHighlight
            ? "0 10px 24px rgba(15, 118, 110, 0.16)"
            : "0 8px 20px rgba(17, 24, 39, 0.08)"
      }
    };
  }), [hasFlowHighlight, highlightedNodes, nodes, selectedId, viewId]);

  const flowEdges = useMemo<Edge[]>(() => {
    return edges.map((edge) => {
      const isHighlighted = !hasFlowHighlight || (highlightedNodes.has(edge.source) && highlightedNodes.has(edge.target));

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        label: edge.label ?? edge.type.replace(/_/g, " "),
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
          strokeWidth: selectedId === edge.id ? 2.8 : isHighlighted ? 2.1 : 1.4,
          stroke: selectedId === edge.id ? "#111827" : isHighlighted && hasFlowHighlight ? "#0f766e" : "#64748b",
          opacity: isHighlighted ? 1 : 0.22
        },
        labelStyle: { fill: "#334155", fontWeight: 700, fontSize: 11 },
        labelShowBg: false
      };
    });
  }, [edges, hasFlowHighlight, highlightedNodes, nodes, selectedId]);

  return (
    <div className="canvas-wrap">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        fitView
        minZoom={0.25}
        onNodeClick={(_, node) => onSelect(node.id)}
        onEdgeClick={(_, edge) => onSelect(edge.id)}
        onConnect={(connection: Connection) => {
          if (connection.source && connection.target) {
            onConnect(connection.source, connection.target);
          }
        }}
        onNodesChange={(changes) => {
          const positions = new Map<string, { x: number; y: number } | undefined>();
          changes.forEach((change) => {
            if (change.type === "position") positions.set(change.id, change.position);
          });
          if (positions.size > 0) onPositionChange(positions);
        }}
        defaultEdgeOptions={{
          markerEnd: { type: MarkerType.ArrowClosed }
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color="#d8dee9" />
        <Controls position="bottom-right" />
        <MiniMap
          pannable
          zoomable
          position="bottom-left"
          nodeColor={(node) => {
            const atlasNode = nodes.find((item) => item.id === node.id);
            return atlasNode ? nodeColors[atlasNode.type] : "#94a3b8";
          }}
        />
      </ReactFlow>
    </div>
  );
}

function viewDetails(node: AtlasNode, viewId: ViewId) {
  const metadata = node.metadata ?? {};
  if (viewId === "class_diagram" && node.type === "code_symbol") {
    const attributes = listValue(metadata.attributes);
    const methods = listValue(metadata.methods);
    const relation = [
      textValue(metadata.extends) ? `extends ${textValue(metadata.extends)}` : "",
      listValue(metadata.implements).length ? `implements ${listValue(metadata.implements).slice(0, 2).join(", ")}` : ""
    ].filter(Boolean).join(" · ");
    return [
      relation,
      attributes.length ? `${attributes.length} attrs: ${attributes.slice(0, 2).join(", ")}` : "",
      methods.length ? `${methods.length} methods: ${methods.slice(0, 2).join(", ")}` : ""
    ].filter(Boolean).slice(0, 3);
  }

  if (viewId === "api_surface" && node.type === "api_contract") {
    return [
      textValue(metadata.routeMethod) && textValue(metadata.routePath) ? `${textValue(metadata.routeMethod)} ${textValue(metadata.routePath)}` : "",
      textValue(metadata.auth) ? `auth: ${textValue(metadata.auth)}` : "",
      textValue(metadata.sourceFile) ? textValue(metadata.sourceFile) : ""
    ].filter(Boolean).slice(0, 3);
  }

  if (viewId === "schema_model" && ["schema", "data_entity", "datastore", "migration"].includes(node.type)) {
    const columns = listValue(metadata.columns);
    const indexes = listValue(metadata.indexes);
    const relations = listValue(metadata.relations);
    return [
      textValue(metadata.schemaName) || textValue(metadata.entityName) || textValue(metadata.databaseEngine),
      columns.length ? `${columns.length} cols: ${columns.slice(0, 2).join(", ")}` : "",
      indexes.length ? `${indexes.length} indexes` : relations.length ? `${relations.length} relations` : ""
    ].filter(Boolean).slice(0, 3);
  }

  return [];
}

function listValue(value: MetadataValue) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

function textValue(value: MetadataValue) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
