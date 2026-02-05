import { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  EdgeLabelRenderer,
  MarkerType,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from "reactflow";
import type { ObjectEntity, Relationship } from "../model/types";
import ObjectNode from "./ObjectNode";
import RelationshipEdge from "./RelationshipEdge";

type Selection =
  | { type: "object"; id: string }
  | { type: "relationship"; id: string }
  | null;

type CanvasProps = {
  objects: ObjectEntity[];
  relationships: Relationship[];
  positions: Record<string, { x: number; y: number }>;
  selection: Selection;
  adjacentRelationshipIds: Set<string>;
  creatingRelationship: boolean;
  pendingFromId: string | null;
  onSelectObject: (id: string) => void;
  onSelectRelationship: (id: string) => void;
  onCreateRelationship: (fromId: string, toId: string) => void;
  onPendingFrom: (id: string) => void;
  onCancelCreateRelationship: () => void;
  onMoveObject: (id: string, position: { x: number; y: number }) => void;
  onInit: (instance: ReactFlowInstance) => void;
  onRequestImport: () => void;
  onRequestNew: () => void;
};

type HoveredEdge = {
  id: string;
  x: number;
  y: number;
  relationship: Relationship;
};

const nodeTypes = { objectNode: ObjectNode };
const edgeTypes = { relationship: RelationshipEdge };

const Canvas = ({
  objects,
  relationships,
  positions,
  selection,
  adjacentRelationshipIds,
  creatingRelationship,
  pendingFromId,
  onSelectObject,
  onSelectRelationship,
  onCreateRelationship,
  onPendingFrom,
  onCancelCreateRelationship,
  onMoveObject,
  onInit,
  onRequestImport,
  onRequestNew,
}: CanvasProps) => {
  const [hoveredEdge, setHoveredEdge] = useState<HoveredEdge | null>(null);

  const nodes = useMemo<Node[]>(
    () =>
      objects.map((object) => ({
        id: object.id,
        type: "objectNode",
        position: positions[object.id] ?? { x: 0, y: 0 },
        data: {
          object,
          isSelected: selection?.type === "object" && selection.id === object.id,
          isPendingSource: creatingRelationship && pendingFromId === object.id,
        },
      })),
    [creatingRelationship, objects, pendingFromId, positions, selection]
  );

  const edges = useMemo<Edge[]>(
    () =>
      relationships.map((relationship) => {
        const isSelected =
          selection?.type === "relationship" && selection.id === relationship.id;
        const isAdjacent = adjacentRelationshipIds.has(relationship.id);
        const markerEnd =
          relationship.arrowType === "single" || relationship.arrowType === "double"
            ? { type: MarkerType.ArrowClosed }
            : undefined;
        const markerStart =
          relationship.arrowType === "double"
            ? { type: MarkerType.ArrowClosed }
            : undefined;

        return {
          id: relationship.id,
          type: "relationship",
          source: relationship.fromId,
          target: relationship.toId,
          markerEnd,
          markerStart,
          data: {
            relationship,
            isSelected,
            isAdjacent,
            onHover: (
              id: string | null,
              coords?: { x: number; y: number }
            ) => {
              if (!id || !coords) {
                setHoveredEdge(null);
                return;
              }
              setHoveredEdge({ id, x: coords.x, y: coords.y, relationship });
            },
          },
        };
      }),
    [adjacentRelationshipIds, relationships, selection]
  );

  return (
    <div className="canvas-shell">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={onInit}
        fitView
        onNodeClick={(_, node) => {
          const nodeId = node.id;
          if (!creatingRelationship) {
            onSelectObject(nodeId);
            return;
          }

          if (!pendingFromId) {
            onPendingFrom(nodeId);
            return;
          }

          if (pendingFromId) {
            onCreateRelationship(pendingFromId, nodeId);
          }
        }}
        onEdgeClick={(_, edge) => onSelectRelationship(edge.id)}
        onPaneClick={() => {
          if (creatingRelationship) {
            onCancelCreateRelationship();
          }
        }}
        onNodeDragStop={(_, node) => onMoveObject(node.id, node.position)}
        panOnScroll
        zoomOnScroll
        minZoom={0.2}
        maxZoom={2}
      >
        <Background color="#CBD5E1" gap={16} />
        <Controls position="bottom-left" />
        <EdgeLabelRenderer>
          {hoveredEdge && (
            <div
              className="edge-tooltip"
              style={{
                transform: `translate(-50%, -110%) translate(${hoveredEdge.x}px, ${hoveredEdge.y}px)`,
              }}
            >
              <div className="edge-tooltip-title">{hoveredEdge.relationship.name}</div>
              {hoveredEdge.relationship.label && (
                <div className="edge-tooltip-label">
                  label：{hoveredEdge.relationship.label}
                </div>
              )}
              <div className="edge-tooltip-desc">
                {hoveredEdge.relationship.description ||
                  "Hover 在线上可预览；点击后在右侧编辑。"}
              </div>
            </div>
          )}
        </EdgeLabelRenderer>
      </ReactFlow>
      {objects.length === 0 && (
        <div className="canvas-empty">
          <div className="canvas-empty-card">
            <div className="canvas-empty-title">从这里开始</div>
            <div className="canvas-empty-desc">
              导入一个外置 JSON 文件即可看到完整的 Object/Relationship 画布。也可以先新建模型，再逐步补齐对象、属性、关系与布局。
            </div>
            <div className="canvas-empty-actions">
              <button className="btn primary" onClick={onRequestImport}>
                导入 JSON
              </button>
              <button className="btn ghost" onClick={onRequestNew}>
                新建模型
              </button>
            </div>
            <div className="canvas-empty-hint">
              提示：支持滚轮缩放、拖拽平移；拖动对象时连线实时跟随
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;
