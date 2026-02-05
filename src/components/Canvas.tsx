import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  EdgeLabelRenderer,
  MarkerType,
  type Connection,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from "reactflow";
import type { HandleLocation, ObjectEntity, Relationship } from "../model/types";
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
  onStartRelationshipFrom: (id: string) => void;
  onMoveObject: (id: string, position: { x: number; y: number }) => void;
  onInit: (instance: ReactFlowInstance) => void;
  onCreateObjectAt: (position: { x: number; y: number }) => void;
  onRequestImport: () => void;
  onRequestNew: () => void;
  onReconnectRelationship: (edgeId: string, connection: Connection) => boolean;
  onDeselect: () => void;
  onConnect: (connection: Connection) => void;
};

type HoveredEdge = {
  id: string;
  x: number;
  y: number;
  relationship: Relationship;
};

const nodeTypes = { objectNode: ObjectNode };
const edgeTypes = { relationship: RelationshipEdge };

const toSourceHandleId = (location: HandleLocation) => `source-${location}`;
const toTargetHandleId = (location: HandleLocation) => `target-${location}`;

type ContextMenuState =
  | {
      kind: "pane";
      left: number;
      top: number;
      clientX: number;
      clientY: number;
    }
  | {
      kind: "object";
      objectId: string;
      left: number;
      top: number;
      clientX: number;
      clientY: number;
    };

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
  onStartRelationshipFrom,
  onMoveObject,
  onInit,
  onCreateObjectAt,
  onRequestImport,
  onRequestNew,
  onReconnectRelationship,
  onDeselect,
  onConnect,
}: CanvasProps) => {
  const [hoveredEdge, setHoveredEdge] = useState<HoveredEdge | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const flowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const edgeUpdateSuccessfulRef = useRef(false);

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    if (!contextMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        closeContextMenu();
        return;
      }
      if (menuRef.current?.contains(target)) return;
      closeContextMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeContextMenu();
        if (creatingRelationship) onCancelCreateRelationship();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu, creatingRelationship, onCancelCreateRelationship]);

  const openContextMenu = (
    next:
      | { kind: "pane"; clientX: number; clientY: number }
      | { kind: "object"; objectId: string; clientX: number; clientY: number }
  ) => {
    const shell = shellRef.current;
    const bounds = shell?.getBoundingClientRect();
    const left = bounds ? next.clientX - bounds.left : next.clientX;
    const top = bounds ? next.clientY - bounds.top : next.clientY;
    setContextMenu({ ...next, left, top });
  };

  const resolveFlowPosition = (clientX: number, clientY: number) => {
    const bounds = shellRef.current?.getBoundingClientRect();
    const local = bounds ? { x: clientX - bounds.left, y: clientY - bounds.top } : { x: clientX, y: clientY };
    const instance = flowInstanceRef.current as unknown as {
      screenToFlowPosition?: (pos: { x: number; y: number }) => { x: number; y: number };
      project?: (pos: { x: number; y: number }) => { x: number; y: number };
    } | null;

    if (instance?.screenToFlowPosition) {
      return instance.screenToFlowPosition({ x: clientX, y: clientY });
    }
    if (instance?.project) {
      return instance.project(local);
    }
    return local;
  };

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
          sourceHandle: toSourceHandleId(relationship.fromHandle ?? "right"),
          target: relationship.toId,
          targetHandle: toTargetHandleId(relationship.toHandle ?? "left"),
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
    <div className="canvas-shell" ref={shellRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        edgesUpdatable
        edgeUpdaterRadius={18}
        onInit={(instance) => {
          flowInstanceRef.current = instance;
          onInit(instance);
        }}
        fitView
        onEdgeUpdateStart={() => {
          edgeUpdateSuccessfulRef.current = false;
        }}
        onEdgeUpdate={(oldEdge, newConnection) => {
          const ok = onReconnectRelationship(oldEdge.id, newConnection);
          edgeUpdateSuccessfulRef.current = ok;
        }}
        onEdgeUpdateEnd={() => {
          // If update did not snap to a valid handle, ReactFlow will revert since edges are controlled.
          edgeUpdateSuccessfulRef.current = false;
        }}
        onNodeClick={(_, node) => {
          const nodeId = node.id;
          closeContextMenu();
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
        onNodeContextMenu={(event, node) => {
          event.preventDefault();
          event.stopPropagation();
          openContextMenu({
            kind: "object",
            objectId: node.id,
            clientX: event.clientX,
            clientY: event.clientY,
          });
        }}
        onEdgeClick={(_, edge) => onSelectRelationship(edge.id)}
        onPaneClick={() => {
          closeContextMenu();
          if (creatingRelationship) {
            onCancelCreateRelationship();
          }
          onDeselect();
        }}
        onPaneContextMenu={(event) => {
          event.preventDefault();
          openContextMenu({
            kind: "pane",
            clientX: event.clientX,
            clientY: event.clientY,
          });
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
      {contextMenu && (
        <div
          className="context-menu"
          ref={menuRef}
          style={{ left: contextMenu.left, top: contextMenu.top }}
          role="menu"
        >
          {contextMenu.kind === "pane" ? (
            <button
              className="context-menu-item"
              role="menuitem"
              onClick={() => {
                const position = resolveFlowPosition(
                  contextMenu.clientX,
                  contextMenu.clientY
                );
                onCreateObjectAt({ x: position.x - 110, y: position.y - 60 });
                closeContextMenu();
              }}
            >
              新建 Object
            </button>
          ) : (
            <button
              className="context-menu-item"
              role="menuitem"
              onClick={() => {
                onStartRelationshipFrom(contextMenu.objectId);
                closeContextMenu();
              }}
            >
              新建 Relationship
            </button>
          )}
        </div>
      )}
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
