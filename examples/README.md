# examples/

这个目录用于放置 **“可复用的实现模式”**，帮助 AI 在实现新功能时更稳定地遵循本仓库的约定。
当前我们优先用“指向仓库内真实文件”的方式作为 examples（避免复制粘贴导致漂移）。如果后续发现某些模式经常被误用，可以再把最小片段抽到 `examples/snippets/`。

## 优先参考清单（按常用程度）

- **导入/导出校验 & issue 汇总模式**：[`src/model/validation.ts`](../src/model/validation.ts)
  - 关键点：`validateModel(unknown)` 不 throw，通过 `issues[]` 汇总（含 `fieldPath/id/suggestion`）
- **用户旅程集成测试（轻量 E2E）**：[`src/components/__tests__/app.integration.test.tsx`](../src/components/__tests__/app.integration.test.tsx)
  - 关键点：`vi.mock("reactflow")` 把 ReactFlow 替换成可控 DOM；并 stub `crypto.randomUUID`
- **顶层状态编排（单一 source of truth）**：[`src/App.tsx`](../src/App.tsx)
  - 关键点：`model/positions/selection/dirty` 都在 `App` 管；组件尽量只做渲染与事件上报
- **ReactFlow 节点/边组织方式**：[`src/components/Canvas.tsx`](../src/components/Canvas.tsx)
  - 关键点：`useMemo` 生成 nodes/edges；edge hover tooltip；markerStart/markerEnd 由 `arrowType` 决定
- **数据模型定义**：[`src/model/types.ts`](../src/model/types.ts)
- **布局策略（确定性网格）**：[`src/model/layout.ts`](../src/model/layout.ts)
- **ID/默认 Attribute**：[`src/model/utils.ts`](../src/model/utils.ts)

## 常见“不要做”的事

- 不要把校验改成 throw + try/catch 流程（会破坏现有 ErrorModal 的 issue 展示方式）。
- 不要在测试中依赖真实 ReactFlow 复杂行为；优先沿用现有 mock 流程来覆盖用户旅程。
- 不要引入全新状态管理/表单框架，除非 PRP 明确要求并说明原因。

