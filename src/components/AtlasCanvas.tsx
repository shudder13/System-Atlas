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
import { AtlasEdge, AtlasNode } from "../types";
import { nodeColors, nodeIcons, prettyType } from "../lib/nodeVisuals";

interface AtlasCanvasProps {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  selectedId: string;
  highlightedNodeIds?: string[];
  onSelect: (id: string) => void;
  onConnect: (source: string, target: string) => void;
  onPositionChange: (positions: Map<string, { x: number; y: number } | undefined>) => void;
}

export function AtlasCanvas({ nodes, edges, selectedId, highlightedNodeIds = [], onSelect, onConnect, onPositionChange }: AtlasCanvasProps) {
  const highlightedNodes = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds]);
  const hasFlowHighlight = highlightedNodes.size > 0;

  const flowNodes = useMemo<Node[]>(() => nodes.map((node) => {
    const Icon = nodeIcons[node.type];
    const color = nodeColors[node.type];
    const isHighlighted = !hasFlowHighlight || highlightedNodes.has(node.id);
    const isSelected = selectedId === node.id;

    return {
      id: node.id,
      position: node.position ?? { x: 0, y: 0 },
      width: 196,
      height: 84,
      initialWidth: 196,
      initialHeight: 84,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      handles: [
        { id: "target-left", type: "target", position: Position.Left, x: 0, y: 38, width: 8, height: 8 },
        { id: "target-top", type: "target", position: Position.Top, x: 94, y: 0, width: 8, height: 8 },
        { id: "source-right", type: "source", position: Position.Right, x: 188, y: 38, width: 8, height: 8 },
        { id: "source-bottom", type: "source", position: Position.Bottom, x: 94, y: 76, width: 8, height: 8 }
      ],
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
      selected: isSelected,
      style: {
        borderColor: isSelected ? "#111827" : color,
        borderWidth: isSelected || isHighlighted ? 2 : 1,
        borderRadius: 8,
        color: "#111827",
        width: 196,
        minHeight: 84,
        opacity: isHighlighted ? 1 : 0.34,
        boxShadow: isSelected
          ? "0 12px 30px rgba(17, 24, 39, 0.16)"
          : isHighlighted && hasFlowHighlight
            ? "0 10px 24px rgba(15, 118, 110, 0.16)"
            : "0 8px 20px rgba(17, 24, 39, 0.08)"
      }
    };
  }), [hasFlowHighlight, highlightedNodes, nodes, selectedId]);

  const flowEdges = useMemo<Edge[]>(() => {
    const nodesById = new Map(nodes.map((node) => [node.id, node]));

    return edges.map((edge) => {
      const sourceNode = nodesById.get(edge.source);
      const targetNode = nodesById.get(edge.target);
      const sourcePosition = sourceNode?.position ?? { x: 0, y: 0 };
      const targetPosition = targetNode?.position ?? { x: 0, y: 0 };
      const isVertical = sourceNode && targetNode
        ? targetPosition.y > sourcePosition.y + 40 && Math.abs(targetPosition.x - sourcePosition.x) < 330
        : false;
      const isHighlighted = !hasFlowHighlight || (highlightedNodes.has(edge.source) && highlightedNodes.has(edge.target));

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: isVertical ? "source-bottom" : "source-right",
        targetHandle: isVertical ? "target-top" : "target-left",
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
