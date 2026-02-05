# PRP: relationship_locations（Relationship 端点锚点：上下左右 + 可拖拽吸附）

> Feature 来源：`INITIAL_relationship_locations.md`

---

## Goal

把当前 Relationship（edge）从“左右两锚点、不可拖拽端点”升级为：

- Object 节点提供 **上下左右 4 个锚点（handles）**
- Relationship 的起点/终点支持 **拖拽重连**
  - 可在同一对象的不同锚点之间切换（改变 edge 的走线/连接点）
  - 可拖拽到另一个对象（改变 `fromId/toId`）
- 拖拽时存在“吸附/捕捉半径”，松开时：
  - **靠近可吸附锚点** → 更新 relationship（对象与锚点）
  - **附近无可吸附对象/锚点** → **不改变** relationship（不改变位置也不改变属性）

## Why

- 关系线在密集图中更容易遮挡/交叉；四向锚点能显著提升可读性与布局表达力
- 端点拖拽重连是画布编辑器的关键体验：比“删了重建”更快、更少破坏编辑历史
- “无吸附则不改变”能避免误操作导致关系被意外改写

## What

### User-visible behaviors

- 每个 Object 节点四周都有可见（或 hover 可见）的四个锚点
- 选中 relationship 后（或 hover 时）可以拖拽其起点/终点
- 拖拽端点靠近锚点时会吸附；松开后更新连接
- 拖拽到空白处松开不会改变任何内容（relationship 仍连接原对象原锚点）

### Technical requirements / constraints

- **必须复用现有“顶层 App 编排”模式**：model/selection/dirty 都在 `App.tsx`
- **禁止破坏现有不变量**（见 `PLANNING.md`）：
  - 禁止自环（fromId === toId）
  - 禁止同一对对象重复关系（无向视角：A→B 与 B→A 视为重复）
- 导入/导出 JSON 必须向后兼容：旧数据没有 handle 字段也能正常工作（通过 `coerceModel` 补默认）
- 校验错误呈现必须沿用 `issues[]` 汇总（`fieldPath/id/suggestion`），不要改成 throw 流程
- 不新增依赖（除非证明 ReactFlow API 无法满足需求且有替代评估）

### Success Criteria

- [ ] ObjectNode 显示四个锚点（上/下/左/右），且 edge 可连接到任意锚点
- [ ] 可拖拽 relationship 起点/终点到同一对象的另一个锚点，edge 连接点随之改变，并持久化到 model
- [ ] 可拖拽 relationship 起点/终点到另一个对象，relationship 的 `fromId/toId` 更新，并持久化到 model
- [ ] 拖拽端点到空白处松开，不会改变 relationship（对象与锚点均不变，dirty 不应被错误置 true）
- [ ] 重新连接时仍遵守：禁止自环、禁止同一对对象重复关系；违规则阻断并提示 ErrorModal，且 relationship 回滚不变
- [ ] `npm run validate` 全绿（lint + tests + build）

---

## All Needed Context

### Documentation & References（必读文件 / 参考模式）

```yaml
# MUST READ
- file: PLANNING.md
  why: 架构与不可破坏交互约束（关系创建不变量、dirty、ReactFlow 测试策略）

- file: TASK.md
  why: 执行 PRP 时记录 Active/Done/Discovered，避免遗漏多文件修改

- file: INITIAL_relationship_locations.md
  why: 本 feature 的需求与验收点（四锚点、拖拽重连、吸附、无吸附回退）

- file: src/App.tsx
  why: 顶层状态编排（model/selection/dirty/errorModal）与关系创建/校验约束逻辑所在地

- file: src/components/Canvas.tsx
  why: ReactFlow nodes/edges 生成方式；事件入口（onNodeClick/onEdgeClick/…）应在这里接 ReactFlow 的 edge 更新回调

- file: src/components/ObjectNode.tsx
  why: 目前只有左右 handles；需要扩展为上下左右，并决定 handle id/类型策略

- file: src/components/RelationshipEdge.tsx
  why: 自定义 edge 渲染（当前仅 hover/label）；需要确保与 ReactFlow 的 reconnect/handle 机制兼容

- file: src/model/types.ts
  why: Relationship 数据结构需要新增“端点锚点位置（handle id）”以持久化

- file: src/model/validation.ts
  why: 导入/导出校验与 issues[] 汇总模式；需要为新增字段补校验 + coerce 兼容旧 JSON

- file: src/components/__tests__/app.integration.test.tsx
  why: 现有轻量 E2E（vi.mock reactflow）模式；本 feature 需要扩展 mock 来模拟“端点拖拽重连/取消”

- file: docs/ai/validation/VALIDATE.md
  why: 验证门禁标准（最终以 npm run validate 全绿为目标）

- file: examples/README.md
  why: 模式索引（validation / reactflow mock / app state / canvas edges）

# Optional external docs
- url: https://reactflow.dev/
  why: 查阅 edge reconnect（onEdgeUpdate/onEdgeUpdateStart/onEdgeUpdateEnd、handle ids、edgeUpdaterRadius 等）与连接吸附参数
```

### Current Codebase Tree（AI 执行时生成）

```bash
# Run in repo root
tree -a -L 4
```

### Desired Codebase Tree（本 PRP 要新增/修改哪些文件）

```bash
PRPs/relationship_locations.md

# likely modified
src/model/types.ts
src/model/validation.ts
src/components/ObjectNode.tsx
src/components/Canvas.tsx
src/components/RelationshipEdge.tsx
src/components/__tests__/app.integration.test.tsx
src/styles.css # (如果需要新增 handle 的样式/hover 展示)
```

### Known Gotchas / Project Constraints

```text
- ReactFlow 测试：不要依赖真实 ReactFlow 拖拽/吸附；应扩展现有 vi.mock("reactflow")，用可控 DOM 触发 onEdgeUpdate* 回调模拟“重连成功/失败/取消”。
- issue 汇总：所有阻断必须通过 ErrorModal + issues[] 展示，不要 throw。
- dirty 行为：仅当 relationship 实际发生变更（from/to 或 handle id 改变）才 setDirty(true)。
- 重连约束：重连也必须复用“禁止自环、禁止重复关系（无向）”逻辑；不满足时必须回滚到原值。
- 兼容旧 JSON：新增字段必须在 coerceModel 补默认，validateModel/validateForExport 允许缺省但不允许非法枚举值。
```

---

## Implementation Blueprint

### Data model changes

在 `Relationship` 上持久化端点锚点位置（用于 ReactFlow `sourceHandle/targetHandle`）：

- 新增可选字段（建议）：
  - `fromHandle?: "left" | "right" | "top" | "bottom"`
  - `toHandle?: "left" | "right" | "top" | "bottom"`

默认值策略：

- 如果缺省：`fromHandle="right"`（更符合“起点在右”直觉），`toHandle="left"`（终点在左）
- 该默认仅用于渲染与后续编辑；导出时可选择保留缺省或强制写出（建议写出以减少歧义，但需评估已有导出格式期望）

`src/model/validation.ts`：

- `validateModel`：允许缺省；若存在则必须在 allowed set 内；错误以 `issues[]` 汇总
- `coerceModel`：补齐默认（兼容旧 JSON）

### UI / ReactFlow wiring

#### ObjectNode handles

- 在 `src/components/ObjectNode.tsx` 新增 4 个 `Handle`
  - 每个 handle 需要稳定 `id`：`"left" | "right" | "top" | "bottom"`
  - 需要明确 `type`：为了允许从/到任意方向拖拽重连，建议 **每个方向同时提供 source + target 两个 handle**（或者用 ReactFlow 推荐的方式：同一个 handle 用 type=source/target？如果不支持，需双 handle 叠放并用 CSS 区分/隐藏）

#### Edges: sourceHandle / targetHandle

- 在 `src/components/Canvas.tsx` 生成 edge 时：
  - 除 `source/target` 外，传入 `sourceHandle: relationship.fromHandle ?? "right"`
  - 传入 `targetHandle: relationship.toHandle ?? "left"`

#### Reconnect (drag endpoints) + snapping

- 通过 ReactFlow 提供的 edge update hooks（名称以当前版本文档为准）：
  - `onEdgeUpdateStart`：记录“正在重连”的 edge id 与其原始连接（fromId/toId/handles）
  - `onEdgeUpdate`：当连接到新的 node/handle 时触发，尝试更新 model
  - `onEdgeUpdateEnd`：当松开鼠标结束时触发；如果本次没有成功 update（没吸附到任何 handle），则 **不做任何修改**（或显式回滚到原始）

吸附半径：

- 配置 ReactFlow 的 `edgeUpdaterRadius`（或相应参数）来扩大端点可吸附范围
- 如需要更强“磁吸”效果，考虑在 `ObjectNode` handle 上通过样式提示 hover/active（但不应引入复杂计算）

#### Business constraints on reconnect

在尝试更新 relationship 时复用现有 createRelationship 的约束：

- 自环：newFromId === newToId → 阻断 + ErrorModal
- 重复关系（无向）：存在 (A,B) 任意方向的 relationship（排除当前被更新的 relationship 自身）→ 阻断 + ErrorModal

阻断策略：

- model 不变
- 恢复 ReactFlow 视图连接到原对象原 handle（由 model 驱动重新渲染即可）
- dirty 不变

### Task List（按顺序，可逐项验收）

```yaml
Task 1: 扩展 Relationship 数据结构以持久化锚点
MODIFY src/model/types.ts:
  - Add Relationship.fromHandle/toHandle (optional) with union type
MODIFY src/model/validation.ts:
  - validateModel: allow missing, validate allowed values if present (issues[] aggregation)
  - coerceModel: fill defaults for missing handles

Task 2: ObjectNode 增加四向锚点（handles）
MODIFY src/components/ObjectNode.tsx:
  - Add handles for top/bottom/left/right with stable handle ids
  - Decide handle type strategy to support reconnecting both source and target endpoints
  - Add/adjust CSS classes as needed

Task 3: Canvas 将 relationship handles 映射到 ReactFlow edge
MODIFY src/components/Canvas.tsx:
  - When building edges, set sourceHandle/targetHandle from relationship data

Task 4: 实现 relationship 端点拖拽重连（含吸附与回退）
MODIFY src/components/Canvas.tsx (preferred) and/or src/App.tsx:
  - Wire ReactFlow onEdgeUpdateStart/onEdgeUpdate/onEdgeUpdateEnd
  - On successful reconnect: update relationship.fromId/toId and handle ids; setSelection + dirty
  - On cancel/no snap: ensure model unchanged and dirty not toggled
  - On invalid reconnect: show ErrorModal issues, revert to original relationship

Task 5: 集成测试覆盖（扩展 reactflow mock）
MODIFY src/components/__tests__/app.integration.test.tsx:
  - Extend reactflow mock to accept and expose onEdgeUpdate* props and allow a test to simulate:
    - reconnect source handle within same node (anchor change)
    - reconnect target to another node (from/to change)
    - reconnect end to blank (no update) => no changes
    - reconnect that would create self-loop => blocked + relationship unchanged
    - reconnect that would create duplicate pair (undirected) => blocked + unchanged
  - Add happy path / edge case / failure case assertions

Task 6: 样式与交互细节收尾
MODIFY src/styles.css:
  - Ensure handles are placed correctly on four sides
  - Optional: hover/active styling to indicate snapping targets
```

### Per-task pseudocode（关键点）

```ts
// Relationship handle defaults
const defaultFromHandle = "right";
const defaultToHandle = "left";

// Canvas edge mapping
edge.source = relationship.fromId;
edge.target = relationship.toId;
edge.sourceHandle = relationship.fromHandle ?? defaultFromHandle;
edge.targetHandle = relationship.toHandle ?? defaultToHandle;

// Edge reconnect flow (conceptual)
let pendingReconnect: null | {
  edgeId: string;
  original: { fromId: string; toId: string; fromHandle: HandleId; toHandle: HandleId };
  updated: boolean;
} = null;

onEdgeUpdateStart(edge) => pendingReconnect = { edgeId: edge.id, original: snapshotFromModel(edge.id), updated: false }

onEdgeUpdate(oldEdge, newConnection) => {
  // newConnection: { source, sourceHandle, target, targetHandle }
  const proposal = normalizeToRelationshipUpdate(newConnection);
  if (violatesSelfLoopOrDuplicate(proposal)) {
    showErrorModal(issues[]);
    return; // model unchanged; rerender restores original
  }
  updateRelationship(edge.id, proposal);
  pendingReconnect.updated = true;
  setDirty(true);
}

onEdgeUpdateEnd() => {
  if (!pendingReconnect) return;
  if (!pendingReconnect.updated) {
    // no snap target => no model change (or explicit no-op)
  }
  pendingReconnect = null;
}
```

---

## Validation Loop（必须可执行）

### Level 0：One-shot（推荐最终）

```bash
npm run validate
```

### Level 1：Lint

```bash
npm run lint
```

### Level 2：Typecheck

```bash
npm run typecheck
```

### Level 3：Unit/Integration Tests

```bash
npm test -- --run
```

### Level 4：Build

```bash
npm run build
```

---

## Final Checklist

- [ ] Success Criteria 全部满足
- [ ] `npm run validate` 全绿
- [ ] 新增/修改逻辑均有测试覆盖（happy/edge/failure）
- [ ] 导入/导出兼容旧 JSON（coerceModel + validateModel）
- [ ] 没有引入新依赖/新架构；继续沿用 App.tsx 集中编排与 issues[] 错误呈现

---

## Anti-Patterns to Avoid

- ❌ 只改 UI 不持久化 handle 到 model（会导致导出/刷新后丢失锚点信息）
- ❌ 重连失败/空白松开时仍写入 model（会破坏“无吸附不改变”的需求）
- ❌ 用 throw/try-catch 替代 issues[]（破坏 ErrorModal 统一错误展示）
- ❌ 在测试中依赖真实 ReactFlow 拖拽（不稳定、难维护；应扩展现有 mock）

