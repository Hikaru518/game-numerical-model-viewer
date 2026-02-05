import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "reactflow";
import type { Relationship } from "../model/types";

type RelationshipEdgeData = {
  relationship: Relationship;
  isSelected: boolean;
  isAdjacent: boolean;
  onHover?: (id: string | null, coords?: { x: number; y: number }) => void;
};

const RelationshipEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  markerStart,
  data,
}: EdgeProps<RelationshipEdgeData>) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });
  const relationship = data?.relationship;
  const labelText =
    relationship?.label || (relationship?.arrowType === "none" ? "undirected" : "");

  const stroke = data?.isSelected
    ? "#2563EB"
    : data?.isAdjacent
      ? "#94A3B8"
      : "#CBD5E1";
  const strokeWidth = data?.isSelected ? 3 : 2;

  const handleHover = (enter: boolean) => {
    if (!data?.onHover || !relationship) return;
    if (enter) {
      data.onHover(id, { x: labelX, y: labelY });
    } else {
      data.onHover(null);
    }
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{ stroke, strokeWidth }}
      />
      <path
        d={edgePath}
        stroke="transparent"
        strokeWidth={14}
        fill="none"
        pointerEvents="stroke"
        className="react-flow__edge-interaction"
        onMouseEnter={() => handleHover(true)}
        onMouseLeave={() => handleHover(false)}
      />
      {labelText && (
        <EdgeLabelRenderer>
          <div
            className="edge-label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default RelationshipEdge;
