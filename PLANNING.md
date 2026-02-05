# PLANNING — Game Numerical Model Viewer

本项目是一个 **游戏数值模型可视化编辑器（内部工具）**：以画布方式展示/编辑 **Object / Attribute / Relationship**，并支持从/到外置 JSON 导入/导出。

## 目标与范围

- **目标**：让使用者用“画布 + 侧栏表单”快速搭建数值对象、属性公式、对象之间的影响关系，并能可靠地导入/导出 JSON。
- **核心能力**：
  - 画布拖拽/缩放/适配（ReactFlow）
  - 右侧详情编辑（Object/Relationship）
  - 导入/导出 JSON + 校验（阻断式错误提示）
  - dirty 状态与离开页面提醒
- **非目标（当前）**：
  - 复杂公式解析/执行
  - 后端持久化 / 多人协作

## 技术栈与脚本

- **框架**：Vite + React + TypeScript（ESM）
- **画布**：ReactFlow
- **测试**：Vitest + Testing Library
- **脚本**：见 [package.json](package.json)
  - `npm run dev` / `npm run build` / `npm run preview`
  - `npm run lint`
  - `npm test`（Vitest）

## 代码结构（关键路径）

- **入口与状态管理**：`[src/App.tsx](src/App.tsx)`
  - 单一顶层 state：`model`、`positions`、`selection`、`dirty`、关系创建中间态等
  - 导入/导出、创建/更新/删除、fitView/focusSelection 等交互都在这里编排
- **数据模型**：`[src/model/types.ts](src/model/types.ts)`
  - `ModelData` / `ObjectEntity` / `Relationship` / `ValidationIssue` 等
- **校验与兼容**：`[src/model/validation.ts](src/model/validation.ts)`
  - `validateModel(unknown)`：导入前校验（结构/类型/引用/枚举合法性）
  - `validateForExport(ModelData)`：导出前更严格校验（例如 Object.name 不能为空）
  - `coerceModel(ModelData)`：补齐缺省字段（兼容旧/脏数据）
- **布局**：`[src/model/layout.ts](src/model/layout.ts)`
  - `autoLayout(objects)`：导入后给对象生成确定性网格坐标
  - `nextGridPosition(index)`：新增对象时的默认放置位置
- **工具函数**：`[src/model/utils.ts](src/model/utils.ts)`
  - `createId(prefix)`：默认使用 `crypto.randomUUID()`（测试中会 stub）
  - `createEmptyAttribute()`
- **组件**：
  - 画布：`[src/components/Canvas.tsx](src/components/Canvas.tsx)`
  - Object 节点：`[src/components/ObjectNode.tsx](src/components/ObjectNode.tsx)`
  - Relationship 边：`[src/components/RelationshipEdge.tsx](src/components/RelationshipEdge.tsx)`
  - 侧栏编辑：`[src/components/SidePanel.tsx](src/components/SidePanel.tsx)`
  - 顶栏操作：`[src/components/TopBar.tsx](src/components/TopBar.tsx)`
  - 错误弹窗：`[src/components/ErrorModal.tsx](src/components/ErrorModal.tsx)`

## 核心数据流（导入/编辑/导出）

### 导入 JSON

- `App.handleImportFile(file)`：
  - 读取文本 → `JSON.parse`
  - `validateModel(parsed)`：失败则弹 `ErrorModal` 并阻断导入
  - `coerceModel(...)`：补齐字段
  - `setModel(coerced)` + `setPositions(autoLayout(objects))`
  - 重置 `selection/dirty/creatingRelationship`，并触发一次 `fitView`

### 编辑

- Object/Relationship 的字段编辑发生在 `SidePanel`，通过回调写回 `App`：
  - `onUpdateObject` / `onUpdateRelationship`
  - `onAddAttribute` / `onUpdateAttribute`
- 画布拖拽发生在 `Canvas`，通过 `onMoveObject` 更新 `positions`
- 以上都会把 `dirty` 置为 `true`

### 导出 JSON

- `App.handleExport()`：
  - `validateForExport(model)`：失败则弹 `ErrorModal` 并阻断导出
  - `JSON.stringify` + `Blob` + `a.click()` 下载
  - 成功后 `dirty=false`

## 关键交互约束（不可破坏的行为）

- **关系创建**：
  - 两次点击选起点/终点（`creatingRelationship` + `pendingFromId`）
  - **禁止自环**（fromId === toId）
  - **禁止同一对对象重复关系**（无向视角：A→B 与 B→A 也视为重复）
- **删除**：
  - 删除 Object 前必须确保没有任何 Relationship 引用它（否则阻断并提示先删关系）
- **离开页面提醒**：
  - `dirty` 为 true 时，`beforeunload` 提示
- **键盘删除**：
  - Delete/Backspace 删除选中项，但在 input/textarea 等输入控件聚焦时不触发

## 测试策略与现有模式

- **Model 层**：`[src/model/__tests__/validation.test.ts](src/model/__tests__/validation.test.ts)`、`[src/model/__tests__/layout.test.ts](src/model/__tests__/layout.test.ts)`
  - 覆盖：合法输入、缺失字段、重复 id、引用不存在、非法枚举等
- **UI 集成流（轻量 E2E）**：`[src/components/__tests__/app.integration.test.tsx](src/components/__tests__/app.integration.test.tsx)`
  - 通过 `vi.mock("reactflow")` 把 ReactFlow 变成可控的 DOM 渲染，测试创建对象/关系、删除阻断等用户旅程
- **测试约定**：
  - 每个新逻辑至少：happy path / edge case / failure case
  - 优先复用现有 mock 与断言风格，避免引入新测试范式

## 约定与 Gotchas

- **ID 生成**：依赖 `crypto.randomUUID()`；测试里请沿用现有 stub 模式（见 `app.integration.test.tsx`）。
- **导入校验**：`validateModel` 接受 `unknown`，所有错误通过 `issues[]` 汇总（带 `fieldPath`/`id`/`suggestion`），不要改成 throw 异常式流程。
- **不要发明新架构**：新增功能优先沿用 `App.tsx` 的“集中编排 + 组件纯展示”模式；必要时再拆 hook/模块。

