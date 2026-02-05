# Canvas — ReactFlow 节点/边组织方式（snapshot）

目标：用 `useMemo` 从 `objects/relationships/positions` 生成 nodes/edges，并通过 `arrowType` 决定 marker。

```tsx
import { useMemo, useState } from "react";
import { MarkerType, type Node, type Edge } from "reactflow";
import type { ObjectEntity, Relationship } from "../model/types";

type HoveredEdge = {
  id: string;
  x: number;
  y: number;
  relationship: Relationship;
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
  onMoveObject,
  onInit,
}: {
  objects: ObjectEntity[];
  relationships: Relationship[];
  positions: Record<string, { x: number; y: number }>;
  selection: { type: "object"; id: string } | { type: "relationship"; id: string } | null;
  adjacentRelationshipIds: Set<string>;
  creatingRelationship: boolean;
  pendingFromId: string | null;
  onSelectObject: (id: string) => void;
  onSelectRelationship: (id: string) => void;
  onCreateRelationship: (fromId: string, toId: string) => void;
  onPendingFrom: (id: string) => void;
  onCancelCreateRelationship: () => void;
  onMoveObject: (id: string, position: { x: number; y: number }) => void;
  onInit: (instance: unknown) => void;
}) => {
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
          relationship.arrowType === "double" ? { type: MarkerType.ArrowClosed } : undefined;

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
            onHover: (id: string | null, coords?: { x: number; y: number }) => {
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

  // ... ReactFlow props: onNodeClick to create relationship, onEdgeClick, onNodeDragStop, etc. ...
};
```

