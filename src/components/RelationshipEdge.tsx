import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "reactflow";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import type { Relationship } from "../model/types";
import { buildCatmullRomPath } from "./relationshipCurvePath";

type RelationshipEdgeData = {
  relationship: Relationship;
  isSelected: boolean;
  isAdjacent: boolean;
  resolveFlowPosition?: (clientX: number, clientY: number) => { x: number; y: number };
  onMoveCurvePoint?: (
    relationshipId: string,
    pointIndex: number,
    point: { x: number; y: number }
  ) => void;
  onRequestEdgeContextMenu?: (params: {
    relationshipId: string;
    point: { x: number; y: number };
    insertIndex: number;
    clientX: number;
    clientY: number;
  }) => void;
  onRequestCurvePointContextMenu?: (
    relationshipId: string,
    pointIndex: number,
    clientX: number,
    clientY: number
  ) => void;
};

const distanceToSegmentSquared = (
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
) => {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const abLen2 = abx * abx + aby * aby;
  if (abLen2 === 0) return apx * apx + apy * apy;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2));
  const projx = a.x + abx * t;
  const projy = a.y + aby * t;
  const dx = p.x - projx;
  const dy = p.y - projy;
  return dx * dx + dy * dy;
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
  const [fallbackPath, fallbackLabelX, fallbackLabelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });
  const relationship = data?.relationship;
  const curvePoints = useMemo(() => relationship?.curvePoints ?? [], [relationship?.curvePoints]);

  const [dragging, setDragging] = useState<{
    relationshipId: string;
    pointIndex: number;
    pointerId: number;
    previewPoint: { x: number; y: number };
  } | null>(null);

  const effectiveCurvePoints = useMemo(() => {
    if (!dragging) return curvePoints;
    if (dragging.relationshipId !== relationship?.id) return curvePoints;
    if (dragging.pointIndex < 0 || dragging.pointIndex >= curvePoints.length) return curvePoints;
    return curvePoints.map((p, i) => (i === dragging.pointIndex ? dragging.previewPoint : p));
  }, [curvePoints, dragging, relationship?.id]);

  const hasUserPoints = effectiveCurvePoints.length > 0;

  const pathPoints = hasUserPoints
    ? [{ x: sourceX, y: sourceY }, ...effectiveCurvePoints, { x: targetX, y: targetY }]
    : null;
  const edgePath = pathPoints ? buildCatmullRomPath(pathPoints) : fallbackPath;
  const labelX = pathPoints
    ? pathPoints.reduce((sum, p) => sum + p.x, 0) / pathPoints.length
    : fallbackLabelX;
  const labelY = pathPoints
    ? pathPoints.reduce((sum, p) => sum + p.y, 0) / pathPoints.length
    : fallbackLabelY;

  const labelText =
    relationship?.label || (relationship?.arrowType === "none" ? "undirected" : "");

  const stroke = data?.isSelected
    ? "#2563EB"
    : data?.isAdjacent
      ? "#94A3B8"
      : "#CBD5E1";
  const strokeWidth = data?.isSelected ? 3 : 2;

  const handleContextMenu = (event: MouseEvent<SVGPathElement>) => {
    if (!relationship || !data?.onRequestEdgeContextMenu) return;
    event.preventDefault();
    event.stopPropagation();

    const resolve = data.resolveFlowPosition;
    const point = resolve
      ? resolve(event.clientX, event.clientY)
      : { x: event.clientX, y: event.clientY };

    const existing = relationship.curvePoints ?? [];
    const poly = [{ x: sourceX, y: sourceY }, ...existing, { x: targetX, y: targetY }];

    let bestSegment = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < poly.length - 1; i += 1) {
      const dist = distanceToSegmentSquared(point, poly[i], poly[i + 1]);
      if (dist < bestDist) {
        bestDist = dist;
        bestSegment = i;
      }
    }

    // segment i corresponds to insertion index i in user-points array:
    // [source, ...userPoints, target]
    const insertIndex = Math.max(0, Math.min(existing.length, bestSegment));
    data.onRequestEdgeContextMenu({
      relationshipId: relationship.id,
      point,
      insertIndex,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragging.pointerId) return;
      const resolve = data?.resolveFlowPosition;
      const nextPoint = resolve
        ? resolve(event.clientX, event.clientY)
        : { x: event.clientX, y: event.clientY };
      setDragging((prev) => {
        if (!prev) return prev;
        if (prev.pointerId !== event.pointerId) return prev;
        return { ...prev, previewPoint: nextPoint };
      });
    };

    const finish = (event: PointerEvent) => {
      if (event.pointerId !== dragging.pointerId) return;
      data?.onMoveCurvePoint?.(dragging.relationshipId, dragging.pointIndex, dragging.previewPoint);
      setDragging(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [data, dragging]);

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
        data-testid={`relationship-edge-interaction-${id}`}
        style={{ pointerEvents: "stroke" }}
        onContextMenu={handleContextMenu}
      />
      {data?.isSelected && curvePoints.length > 0 && (
        <EdgeLabelRenderer>
          <div style={{ pointerEvents: "all" }}>
            {effectiveCurvePoints.map((p, index) => (
              <button
                key={`${id}-${index}`}
                type="button"
                className="curve-point nodrag nopan"
                data-testid={`curve-point-${id}-${index}`}
                style={{
                  position: "absolute",
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  border: "2px solid #2563EB",
                  background: "#EFF6FF",
                  cursor:
                    dragging?.relationshipId === relationship?.id &&
                    dragging?.pointIndex === index
                      ? "grabbing"
                      : "grab",
                  touchAction: "none",
                  pointerEvents: "all",
                  zIndex: 50,
                  transform: `translate(-50%, -50%) translate(${p.x}px, ${p.y}px)`,
                }}
                onPointerDown={(event) => {
                  if (!relationship) return;
                  if (!data?.resolveFlowPosition) return;
                  if (event.button !== 0) return;
                  event.preventDefault();
                  event.stopPropagation();
                  const start = data.resolveFlowPosition(event.clientX, event.clientY);
                  setDragging({
                    relationshipId: relationship.id,
                    pointIndex: index,
                    pointerId: event.pointerId,
                    previewPoint: start,
                  });
                }}
                onContextMenu={(event) => {
                  if (!relationship || !data?.onRequestCurvePointContextMenu) return;
                  event.preventDefault();
                  event.stopPropagation();
                  data.onRequestCurvePointContextMenu(
                    relationship.id,
                    index,
                    event.clientX,
                    event.clientY
                  );
                }}
                aria-label={`curve point ${index + 1}`}
              />
            ))}
          </div>
        </EdgeLabelRenderer>
      )}
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
