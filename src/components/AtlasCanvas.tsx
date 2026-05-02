import {
  applyNodeChanges,
  Background,
  Connection,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  ReactFlow
} from "@xyflow/react";
import { useMemo } from "react";
import { AtlasEdge, AtlasNode } from "../types";
import { nodeColors, nodeIcons, prettyType } from "../lib/nodeVisuals";

interface AtlasCanvasProps {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  selectedId: string;
  onSelect: (id: string) => void;
  onConnect: (source: string, target: string) => void;
  onPositionChange: (positions: Map<string, { x: number; y: number } | undefined>) => void;
}

export function AtlasCanvas({ nodes, edges, selectedId, onSelect, onConnect, onPositionChange }: AtlasCanvasProps) {
  const flowNodes = useMemo<Node[]>(() => nodes.map((node) => {
    const Icon = nodeIcons[node.type];
    const color = nodeColors[node.type];

    return {
      id: node.id,
      position: node.position ?? { x: 0, y: 0 },
      initialWidth: 196,
      initialHeight: 84,
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
          </div>
        )
      },
      selected: selectedId === node.id,
      style: {
        borderColor: selectedId === node.id ? "#111827" : color,
        borderWidth: selectedId === node.id ? 2 : 1,
        borderRadius: 8,
        color: "#111827",
        width: 196,
        minHeight: 84,
        boxShadow: selectedId === node.id ? "0 12px 30px rgba(17, 24, 39, 0.16)" : "0 8px 20px rgba(17, 24, 39, 0.08)"
      }
    };
  }), [nodes, selectedId]);

  const flowEdges = useMemo<Edge[]>(() => edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label ?? edge.type.replace(/_/g, " "),
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      strokeWidth: selectedId === edge.id ? 2.5 : 1.6,
      stroke: selectedId === edge.id ? "#111827" : "#64748b"
    },
    labelStyle: { fill: "#334155", fontWeight: 600, fontSize: 11 },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.92 }
  })), [edges, selectedId]);

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
          const nextNodes = applyNodeChanges(changes, flowNodes);
          const positions = new Map(nextNodes.map((node) => [node.id, node.position]));
          onPositionChange(positions);
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
