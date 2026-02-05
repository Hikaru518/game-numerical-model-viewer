# App — 顶层状态编排 + 导入/导出流程（snapshot）

目标：把 `model / positions / selection / dirty` 等状态集中在 `App` 编排，组件尽量只做渲染与事件上报。

```tsx
import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactFlowInstance } from "reactflow";
import type { ModelData, ObjectEntity, Relationship, ValidationIssue } from "./model/types";
import { coerceModel, validateForExport, validateModel } from "./model/validation";
import { autoLayout, nextGridPosition } from "./model/layout";
import { createId } from "./model/utils";

type Selection =
  | { type: "object"; id: string }
  | { type: "relationship"; id: string };

type ErrorModalState = {
  title: string;
  issues: ValidationIssue[];
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
};

const initialModel: ModelData = { schemaVersion: 1, objects: [], relationships: [] };

function App() {
  const [model, setModel] = useState<ModelData>(initialModel);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dirty, setDirty] = useState(false);
  const [creatingRelationship, setCreatingRelationship] = useState(false);
  const [pendingFromId, setPendingFromId] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<ErrorModalState | null>(null);

  const flowRef = useRef<ReactFlowInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFileDialog = useCallback(() => fileInputRef.current?.click(), []);

  const handleImportFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        const message = error instanceof Error ? error.message : "JSON 解析失败";
        setErrorModal({
          title: "导入失败",
          issues: [{ message: `JSON 解析失败：${message}`, suggestion: "请检查文件内容是否为合法 JSON" }],
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
      setPositions(autoLayout(coerced.objects));
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

    const exportData = { ...model, schemaVersion: 1 };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "numerical-model.json";
    link.click();
    URL.revokeObjectURL(url);
    setDirty(false);
  }, [model]);

  const createObject = useCallback(() => {
    const id = createId("obj");
    const newObject: ObjectEntity = { id, name: "未命名对象", description: "", attributes: [] };
    setModel((prev) => ({ ...prev, objects: [...prev.objects, newObject] }));
    setPositions((prev) => ({ ...prev, [id]: nextGridPosition(model.objects.length) }));
    setSelection({ type: "object", id });
    setDirty(true);
    requestAnimationFrame(() => {
      flowRef.current?.fitView({ padding: 0.2, duration: 300 });
    });
  }, [model.objects.length]);

  // ... relationship creation, updates, deletes, beforeunload, keyboard delete, render ...
}
```

