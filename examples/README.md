# examples/

这个目录用于放置 **“可复用的实现模式（快照）”**，帮助 AI 在实现新功能时更稳定地遵循本仓库的约定。

当你有意修改某个核心模式（例如校验策略、ReactFlow 测试 mock 方式）时，需要**同步更新对应 snippet**。

## 优先参考清单（按常用程度）

- **导入/导出校验 & issue 汇总模式**：[`snippets/validation-import-export.md`](snippets/validation-import-export.md)
  - 关键点：`validateModel(unknown)` 不 throw，通过 `issues[]` 汇总（含 `fieldPath/id/suggestion`）
- **用户旅程集成测试（轻量 E2E）**：[`snippets/reactflow-mock-integration-test.md`](snippets/reactflow-mock-integration-test.md)
  - 关键点：`vi.mock("reactflow")` 把 ReactFlow 替换成可控 DOM；并 stub `crypto.randomUUID`
- **顶层状态编排（单一 source of truth）**：[`snippets/app-state-import-export.md`](snippets/app-state-import-export.md)
  - 关键点：`model/positions/selection/dirty` 都在 `App` 管；组件尽量只做渲染与事件上报
- **ReactFlow 节点/边组织方式**：[`snippets/canvas-nodes-edges.md`](snippets/canvas-nodes-edges.md)
  - 关键点：`useMemo` 生成 nodes/edges；edge hover tooltip；markerStart/markerEnd 由 `arrowType` 决定
- **数据模型定义**：[`snippets/model-types.md`](snippets/model-types.md)
- **布局策略（确定性网格）**：[`snippets/layout-grid.md`](snippets/layout-grid.md)
- **ID/默认 Attribute**：[`snippets/utils-createId-attribute.md`](snippets/utils-createId-attribute.md)

## 常见“不要做”的事

- 不要把校验改成 throw + try/catch 流程（会破坏现有 ErrorModal 的 issue 展示方式）。
- 不要在测试中依赖真实 ReactFlow 复杂行为；优先沿用现有 mock 流程来覆盖用户旅程。
- 不要引入全新状态管理/表单框架，除非 PRP 明确要求并说明原因。

