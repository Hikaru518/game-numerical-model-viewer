import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactFlowInstance } from "reactflow";
import { ReactFlowProvider } from "reactflow";
import type { Connection } from "reactflow";
import Canvas from "./components/Canvas";
import ErrorModal from "./components/ErrorModal";
import SidePanel from "./components/SidePanel";
import TopBar from "./components/TopBar";
import { autoLayout, nextGridPosition } from "./model/layout";
import type {
  HandleLocation,
  ModelData,
  ObjectEntity,
  Relationship,
  ValidationIssue,
} from "./model/types";
import { coerceModel, validateForExport, validateModel } from "./model/validation";
import { createEmptyAttribute, createId } from "./model/utils";
import "./styles.css";

type Selection =
  | { type: "object"; id: string }
  | { type: "relationship"; id: string };

type ErrorModalState = {
  title: string;
  issues: ValidationIssue[];
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
};

const initialModel: ModelData = {
  schemaVersion: 1,
  objects: [],
  relationships: [],
};

const parseHandleLocation = (
  raw: string | null | undefined,
  prefix: "source-" | "target-"
): HandleLocation | null => {
  if (!raw) return null;
  if (!raw.startsWith(prefix)) return null;
  const maybe = raw.slice(prefix.length);
  if (maybe === "left" || maybe === "right" || maybe === "top" || maybe === "bottom") {
    return maybe;
  }
  return null;
};

function App() {
  const [model, setModel] = useState<ModelData>(initialModel);
  const modelRef = useRef<ModelData>(model);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(
    {}
  );
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dirty, setDirty] = useState(false);
  const [creatingRelationship, setCreatingRelationship] = useState(false);
  const [pendingFromId, setPendingFromId] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<ErrorModalState | null>(null);

  const flowRef = useRef<ReactFlowInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  const setFlowInstance = useCallback((instance: ReactFlowInstance) => {
    flowRef.current = instance;
  }, []);

  const selectedObject = useMemo(
    () =>
      selection?.type === "object"
        ? model.objects.find((obj) => obj.id === selection.id) ?? null
        : null,
    [model.objects, selection]
  );

  const adjacentRelationshipIds = useMemo(() => {
    if (!selectedObject) return new Set<string>();
    const ids = new Set<string>();
    model.relationships.forEach((rel) => {
      if (rel.fromId === selectedObject.id || rel.toId === selectedObject.id) {
        ids.add(rel.id);
      }
    });
    return ids;
  }, [model.relationships, selectedObject]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    async (file: File) => {
      const readBlobText = async (blob: Blob): Promise<string> => {
        if (typeof (blob as Blob & { text?: unknown }).text === "function") {
          return await (blob as Blob).text();
        }
        // Fallback for test env / older DOM shims.
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
          reader.onerror = () =>
            reject(reader.error ?? new Error("无法读取文件内容（FileReader.onerror）"));
          reader.readAsText(blob);
        });
      };

      const text = await readBlobText(file);
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "JSON 解析失败";
        setErrorModal({
          title: "导入失败",
          issues: [
            {
              message: `JSON 解析失败：${message}`,
              suggestion: "请检查文件内容是否为合法 JSON",
            },
          ],
          primaryAction: { label: "重新选择文件", onClick: openFileDialog },
          secondaryAction: { label: "关闭", onClick: () => setErrorModal(null) },
        });
        return;
      }

      const result = validateModel(parsed);
      if (!result.ok) {
        setErrorModal({
          title: "导入失败",
          issues: result.issues,
          primaryAction: { label: "重新选择文件", onClick: openFileDialog },
          secondaryAction: { label: "关闭", onClick: () => setErrorModal(null) },
        });
        return;
      }

      const coerced = coerceModel(parsed as ModelData);
      setModel(coerced);
      const baseLayout = autoLayout(coerced.objects);
      const rawPositions = (parsed as { positions?: unknown } | null)?.positions;
      if (rawPositions && typeof rawPositions === "object" && !Array.isArray(rawPositions)) {
        const knownIds = new Set(coerced.objects.map((o) => o.id));
        const importedPositions: Record<string, { x: number; y: number }> = {};
        Object.entries(rawPositions as Record<string, unknown>).forEach(([objectId, raw]) => {
          if (!knownIds.has(objectId)) return;
          if (!raw || typeof raw !== "object") return;
          const maybe = raw as { x?: unknown; y?: unknown };
          if (typeof maybe.x !== "number" || !Number.isFinite(maybe.x)) return;
          if (typeof maybe.y !== "number" || !Number.isFinite(maybe.y)) return;
          importedPositions[objectId] = { x: maybe.x, y: maybe.y };
        });
        setPositions({ ...baseLayout, ...importedPositions });
      } else {
        setPositions(baseLayout);
      }
      setSelection(null);
      setDirty(false);
      setCreatingRelationship(false);
      setPendingFromId(null);
      requestAnimationFrame(() => {
        flowRef.current?.fitView({ padding: 0.2, duration: 300 });
      });
    },
    [openFileDialog]
  );

  const onFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      handleImportFile(file);
      event.target.value = "";
    },
    [handleImportFile]
  );

  const handleExport = useCallback(() => {
    const result = validateForExport(model);
    if (!result.ok) {
      setErrorModal({
        title: "导出失败",
        issues: result.issues,
        secondaryAction: { label: "关闭", onClick: () => setErrorModal(null) },
      });
      return;
    }

    const exportData = { ...model, schemaVersion: 1, positions };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "numerical-model.json";
    link.click();
    URL.revokeObjectURL(url);
    setDirty(false);
  }, [model, positions]);

  const createObject = useCallback(() => {
    const id = createId("obj");
    const newObject: ObjectEntity = {
      id,
      name: "未命名对象",
      description: "",
      attributes: [],
    };
    setModel((prev) => ({
      ...prev,
      objects: [...prev.objects, newObject],
    }));
    setPositions((prev) => ({
      ...prev,
      [id]: nextGridPosition(model.objects.length),
    }));
    setSelection({ type: "object", id });
    setDirty(true);
    requestAnimationFrame(() => {
      flowRef.current?.fitView({ padding: 0.2, duration: 300 });
    });
  }, [model.objects.length]);

  const createObjectAt = useCallback((position: { x: number; y: number }) => {
    const id = createId("obj");
    const newObject: ObjectEntity = {
      id,
      name: "未命名对象",
      description: "",
      attributes: [],
    };
    setModel((prev) => ({
      ...prev,
      objects: [...prev.objects, newObject],
    }));
    setPositions((prev) => ({
      ...prev,
      [id]: position,
    }));
    setSelection({ type: "object", id });
    setDirty(true);
  }, []);

  const startRelationshipFrom = useCallback((id: string) => {
    setSelection({ type: "object", id });
    setCreatingRelationship(true);
    setPendingFromId(id);
  }, []);

  const createRelationshipWithHandles = useCallback(
    (
      fromId: string,
      toId: string,
      fromHandle: HandleLocation = "right",
      toHandle: HandleLocation = "left"
    ) => {
      if (fromId === toId) {
        setErrorModal({
          title: "无法创建关系",
          issues: [
            {
              message: "起点与终点不能相同",
              suggestion: "请选择两个不同的对象",
            },
          ],
          secondaryAction: { label: "关闭", onClick: () => setErrorModal(null) },
        });
        return false;
      }

      const exists = model.relationships.some(
        (rel) =>
          (rel.fromId === fromId && rel.toId === toId) ||
          (rel.fromId === toId && rel.toId === fromId)
      );
      if (exists) {
        setErrorModal({
          title: "无法创建关系",
          issues: [
            {
              message: "同一对对象之间已存在关系",
              suggestion: "请编辑已有关系或选择其他对象",
            },
          ],
          secondaryAction: { label: "关闭", onClick: () => setErrorModal(null) },
        });
        return false;
      }

      const id = createId("rel");
      const newRel: Relationship = {
        id,
        name: "未命名关系",
        description: "",
        fromId,
        toId,
        fromHandle,
        toHandle,
        arrowType: "single",
        label: "",
      };
      setModel((prev) => ({
        ...prev,
        relationships: [...prev.relationships, newRel],
      }));
      setSelection({ type: "relationship", id });
      setDirty(true);
      setCreatingRelationship(false);
      setPendingFromId(null);
      return true;
    },
    [model.relationships]
  );

  const createRelationship = useCallback(
    (fromId: string, toId: string) => {
      createRelationshipWithHandles(fromId, toId, "right", "left");
    },
    [createRelationshipWithHandles]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const fromId = connection.source;
      const toId = connection.target;
      if (!fromId || !toId) return;

      const fromHandle = parseHandleLocation(connection.sourceHandle, "source-") ?? "right";
      const toHandle = parseHandleLocation(connection.targetHandle, "target-") ?? "left";

      createRelationshipWithHandles(fromId, toId, fromHandle, toHandle);
    },
    [createRelationshipWithHandles]
  );

  const updateObject = useCallback((id: string, updater: Partial<ObjectEntity>) => {
    setModel((prev) => ({
      ...prev,
      objects: prev.objects.map((obj) =>
        obj.id === id ? { ...obj, ...updater } : obj
      ),
    }));
    setDirty(true);
  }, []);

  const updateRelationship = useCallback(
    (id: string, updater: Partial<Relationship>) => {
      setModel((prev) => ({
        ...prev,
        relationships: prev.relationships.map((rel) =>
          rel.id === id ? { ...rel, ...updater } : rel
        ),
      }));
      setDirty(true);
    },
    []
  );

  const insertCurvePoint = useCallback(
    (relationshipId: string, point: { x: number; y: number }, insertIndex: number) => {
      const current = modelRef.current.relationships.find((rel) => rel.id === relationshipId);
      const existingLen = current?.curvePoints?.length ?? 0;
      if (existingLen >= 5) {
        setErrorModal({
          title: "无法添加控制点",
          issues: [
            {
              message: "控制点不能超过 5 个",
              fieldPath: "relationships[].curvePoints",
              id: relationshipId,
              suggestion: "请先删除一个控制点再添加",
            },
          ],
          secondaryAction: { label: "关闭", onClick: () => setErrorModal(null) },
        });
        return;
      }

      setModel((prev) => {
        const target = prev.relationships.find((rel) => rel.id === relationshipId);
        if (!target) return prev;

        const existing = target.curvePoints ?? [];
        if (existing.length >= 5) return prev;

        const nextIndex = Math.max(0, Math.min(existing.length, insertIndex));
        const nextPoints = [
          ...existing.slice(0, nextIndex),
          { x: point.x, y: point.y },
          ...existing.slice(nextIndex),
        ];

        return {
          ...prev,
          relationships: prev.relationships.map((rel) =>
            rel.id === relationshipId ? { ...rel, curvePoints: nextPoints } : rel
          ),
        };
      });
      setDirty(true);
    },
    []
  );

  const deleteCurvePoint = useCallback((relationshipId: string, pointIndex: number) => {
    let changed = false;
    setModel((prev) => {
      const target = prev.relationships.find((rel) => rel.id === relationshipId);
      if (!target?.curvePoints || target.curvePoints.length === 0) return prev;

      if (pointIndex < 0 || pointIndex >= target.curvePoints.length) return prev;
      const nextPoints = target.curvePoints.filter((_, index) => index !== pointIndex);
      changed = true;

      return {
        ...prev,
        relationships: prev.relationships.map((rel) =>
          rel.id === relationshipId ? { ...rel, curvePoints: nextPoints } : rel
        ),
      };
    });

    if (changed) setDirty(true);
  }, []);

  const moveCurvePoint = useCallback(
    (relationshipId: string, pointIndex: number, point: { x: number; y: number }) => {
      let changed = false;
      setModel((prev) => {
        const target = prev.relationships.find((rel) => rel.id === relationshipId);
        if (!target?.curvePoints || target.curvePoints.length === 0) return prev;
        if (pointIndex < 0 || pointIndex >= target.curvePoints.length) return prev;

        const nextPoints = target.curvePoints.map((p, index) =>
          index === pointIndex ? { x: point.x, y: point.y } : p
        );
        changed = true;

        return {
          ...prev,
          relationships: prev.relationships.map((rel) =>
            rel.id === relationshipId ? { ...rel, curvePoints: nextPoints } : rel
          ),
        };
      });

      if (changed) setDirty(true);
    },
    []
  );

  const reconnectRelationship = useCallback(
    (edgeId: string, connection: Connection) => {
      const current = model.relationships.find((rel) => rel.id === edgeId);
      if (!current) return false;

      const nextFromId = connection.source ?? current.fromId;
      const nextToId = connection.target ?? current.toId;
      if (!nextFromId || !nextToId) return false;

      const nextFromHandle =
        parseHandleLocation(connection.sourceHandle, "source-") ??
        current.fromHandle ??
        "right";
      const nextToHandle =
        parseHandleLocation(connection.targetHandle, "target-") ??
        current.toHandle ??
        "left";

      const changed =
        nextFromId !== current.fromId ||
        nextToId !== current.toId ||
        nextFromHandle !== (current.fromHandle ?? "right") ||
        nextToHandle !== (current.toHandle ?? "left");
      if (!changed) return false;

      if (nextFromId === nextToId) {
        setErrorModal({
          title: "无法更新关系",
          issues: [
            {
              message: "起点与终点不能相同",
              suggestion: "请选择两个不同的对象",
            },
          ],
          secondaryAction: { label: "关闭", onClick: () => setErrorModal(null) },
        });
        return false;
      }

      const exists = model.relationships.some(
        (rel) =>
          rel.id !== edgeId &&
          ((rel.fromId === nextFromId && rel.toId === nextToId) ||
            (rel.fromId === nextToId && rel.toId === nextFromId))
      );
      if (exists) {
        setErrorModal({
          title: "无法更新关系",
          issues: [
            {
              message: "同一对对象之间已存在关系",
              suggestion: "请编辑已有关系或选择其他对象",
            },
          ],
          secondaryAction: { label: "关闭", onClick: () => setErrorModal(null) },
        });
        return false;
      }

      updateRelationship(edgeId, {
        fromId: nextFromId,
        toId: nextToId,
        fromHandle: nextFromHandle,
        toHandle: nextToHandle,
      });
      setSelection({ type: "relationship", id: edgeId });
      return true;
    },
    [model.relationships, updateRelationship]
  );

  const addAttribute = useCallback((objectId: string) => {
    setModel((prev) => ({
      ...prev,
      objects: prev.objects.map((obj) =>
        obj.id === objectId
          ? { ...obj, attributes: [...obj.attributes, createEmptyAttribute()] }
          : obj
      ),
    }));
    setDirty(true);
  }, []);

  const updateAttribute = useCallback(
    (objectId: string, index: number, updater: Partial<ObjectEntity["attributes"][0]>) => {
      setModel((prev) => ({
        ...prev,
        objects: prev.objects.map((obj) => {
          if (obj.id !== objectId) return obj;
          const nextAttributes = obj.attributes.map((attr, attrIndex) =>
            attrIndex === index ? { ...attr, ...updater } : attr
          );
          return { ...obj, attributes: nextAttributes };
        }),
      }));
      setDirty(true);
    },
    []
  );

  const deleteRelationship = useCallback((id: string) => {
    setModel((prev) => ({
      ...prev,
      relationships: prev.relationships.filter((rel) => rel.id !== id),
    }));
    setSelection(null);
    setDirty(true);
  }, []);

  const deleteObject = useCallback(
    (id: string) => {
      const hasRelationships = model.relationships.some(
        (rel) => rel.fromId === id || rel.toId === id
      );
      if (hasRelationships) {
        setErrorModal({
          title: "无法删除对象",
          issues: [
            {
              message: "该对象仍存在关联关系，无法删除。",
              suggestion: "请先删除相关 Relationship，再尝试删除对象。",
            },
          ],
          secondaryAction: { label: "关闭", onClick: () => setErrorModal(null) },
        });
        return;
      }

      setModel((prev) => ({
        ...prev,
        objects: prev.objects.filter((obj) => obj.id !== id),
      }));
      setPositions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSelection(null);
      setDirty(true);
    },
    [model.relationships]
  );

  const deleteSelected = useCallback(() => {
    if (!selection) return;
    if (selection.type === "relationship") {
      deleteRelationship(selection.id);
      return;
    }
    if (selection.type === "object") {
      deleteObject(selection.id);
    }
  }, [deleteObject, deleteRelationship, selection]);

  const handleFitView = useCallback(() => {
    flowRef.current?.fitView({ padding: 0.2, duration: 300 });
  }, []);

  const focusSelection = useCallback(() => {
    if (!flowRef.current) return;
    if (selection?.type === "object") {
      const node = flowRef.current.getNode(selection.id);
      if (node) {
        const width = node.width ?? 220;
        const height = node.height ?? 120;
        flowRef.current.setCenter(node.position.x + width / 2, node.position.y + height / 2, {
          zoom: 1.1,
          duration: 350,
        });
      }
      return;
    }

    if (selection?.type === "relationship") {
      const rel = model.relationships.find((item) => item.id === selection.id);
      if (!rel) return;
      const from = positions[rel.fromId];
      const to = positions[rel.toId];
      if (from && to) {
        const x = (from.x + to.x) / 2 + 120;
        const y = (from.y + to.y) / 2 + 60;
        flowRef.current.setCenter(x, y, { zoom: 1, duration: 350 });
      }
      return;
    }

    flowRef.current.fitView({ padding: 0.2, duration: 300 });
  }, [model.relationships, positions, selection]);

  const focusObjectById = useCallback(
    (id: string) => {
      setSelection({ type: "object", id });
      if (!flowRef.current) return;
      const node = flowRef.current.getNode(id);
      if (!node) return;
      const width = node.width ?? 220;
      const height = node.height ?? 120;
      flowRef.current.setCenter(node.position.x + width / 2, node.position.y + height / 2, {
        zoom: 1.1,
        duration: 350,
      });
    },
    []
  );

  const handleDeselect = useCallback(() => setSelection(null), []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();
        if (
          tagName === "input" ||
          tagName === "textarea" ||
          tagName === "select" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      deleteSelected();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected]);

  return (
    <div className="app-shell">
      <ReactFlowProvider>
        <TopBar
          dirty={dirty}
          creatingRelationship={creatingRelationship}
          pendingFromId={pendingFromId}
          onImport={openFileDialog}
          onExport={handleExport}
          onFitView={handleFitView}
          onFocusSelection={focusSelection}
        />
        <div className="app-content">
          <Canvas
            objects={model.objects}
            relationships={model.relationships}
            positions={positions}
            selection={selection}
            adjacentRelationshipIds={adjacentRelationshipIds}
            creatingRelationship={creatingRelationship}
            pendingFromId={pendingFromId}
            onSelectObject={(id) => setSelection({ type: "object", id })}
            onSelectRelationship={(id) => setSelection({ type: "relationship", id })}
            onCreateRelationship={createRelationship}
            onPendingFrom={(id) => setPendingFromId(id)}
            onCancelCreateRelationship={() => {
              setCreatingRelationship(false);
              setPendingFromId(null);
            }}
            onStartRelationshipFrom={startRelationshipFrom}
            onMoveObject={(id, position) => {
              setPositions((prev) => ({ ...prev, [id]: position }));
              setDirty(true);
            }}
            onInit={setFlowInstance}
            onCreateObjectAt={createObjectAt}
            onRequestImport={openFileDialog}
            onRequestNew={createObject}
            onReconnectRelationship={reconnectRelationship}
            onDeselect={handleDeselect}
            onConnect={handleConnect}
            onInsertCurvePoint={insertCurvePoint}
            onDeleteCurvePoint={deleteCurvePoint}
            onMoveCurvePoint={moveCurvePoint}
          />
          <SidePanel
            objects={model.objects}
            relationships={model.relationships}
            selection={selection}
            onSelectRelationship={(id) => setSelection({ type: "relationship", id })}
            onUpdateObject={updateObject}
            onUpdateRelationship={updateRelationship}
            onAddAttribute={addAttribute}
            onUpdateAttribute={updateAttribute}
            onFocusObject={focusObjectById}
            onDeleteObject={deleteObject}
            onDeleteRelationship={deleteRelationship}
          />
        </div>
        <input
          ref={fileInputRef}
          className="hidden-input"
          type="file"
          accept="application/json"
          onChange={onFileChange}
        />
        {errorModal && (
          <ErrorModal
            title={errorModal.title}
            issues={errorModal.issues}
            primaryAction={errorModal.primaryAction}
            secondaryAction={errorModal.secondaryAction}
            onClose={() => setErrorModal(null)}
          />
        )}
      </ReactFlowProvider>
    </div>
  );
}

export default App;
