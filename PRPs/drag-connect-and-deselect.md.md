# PRP: 拖拽创建关系 + 点击空白取消选中

> PRP = Product Requirements Prompt（面向 AI 的"实现蓝图"）。
> 目标：让 AI 在一次执行中尽量做对，靠 **充分上下文 + 可执行验证门禁** 自我纠错。

---

## Goal

实现两个交互优化：
1. **拖拽创建关系**：用户可以直接从 Object 节点的 Handle 拖拽生成关系线条，松开在目标 Object 的 Handle 上时创建 Relationship
2. **点击空白取消选中**：点击画布空白区域（pane）时，取消当前 Object/Relationship 的选中状态（移除蓝边高亮）

## Why

- **拖拽创建关系**比右键菜单更符合直觉，提升用户体验
- **点击空白取消选中**是标准交互模式，当前缺失导致用户困惑
- 保持与现有右键创建关系的功能并存（向后兼容）

## What

### Success Criteria

- [ ] 用户可以从任意 Object 的 source Handle 拖拽出一条连接线
- [ ] 拖拽过程中线条跟随鼠标移动（贝塞尔曲线）
- [ ] 松开鼠标在目标 Object 的 target Handle 上时，创建 Relationship
- [ ] 禁止自环（起点=终点），与现有逻辑一致
- [ ] 禁止重复关系（无向视角 A→B 与 B→A 视为重复），与现有逻辑一致
- [ ] 非法连接时显示 ErrorModal 提示，不创建关系
- [ ] 点击画布空白区域（pane）时，取消当前选中状态（selection = null）
- [ ] 点击空白取消选中时，如果处于 creatingRelationship 状态，同时取消该状态
- [ ] 所有行为有测试覆盖（happy path / edge case / failure case）
- [ ] `npm run validate` 全绿

---

## All Needed Context

### Documentation & References（必须补齐）

```yaml
# MUST READ - These must be included in context
- file: PLANNING.md
  why: Architecture, invariants, and existing patterns

- file: src/App.tsx
  why: Top-level state orchestration (model/positions/selection/dirty/creatingRelationship/pendingFromId)

- file: src/components/Canvas.tsx
  why: ReactFlow 画布配置，nodes/edges 生成，事件处理（onNodeClick/onPaneClick/onEdgeUpdate）

- file: src/components/ObjectNode.tsx
  why: Object 节点渲染，Handle 配置（source/target，四方向）

- file: src/model/types.ts
  why: 数据模型类型（ObjectEntity/Relationship/HandleLocation）

- file: src/components/__tests__/app.integration.test.tsx
  why: 用户旅程集成测试 + ReactFlow mock 模式（vi.mock("reactflow")）

- file: examples/snippets/reactflow-mock-integration-test.md
  why: ReactFlow mock 测试模式参考

- file: docs/ai/validation/VALIDATE.md
  why: 验证门禁（npm run lint / npm test -- --run / npm run build）
```

### Current Codebase Tree（AI 执行时生成）

```bash
# Run in repo root
tree -a -L 4
```

### Desired Codebase Tree（本 PRP 要新增/修改哪些文件）

```
src/components/Canvas.tsx           # 添加 onConnect 处理拖拽创建关系
src/components/ObjectNode.tsx       # 确保 Handle 配置支持连接（可能需要调整）
src/App.tsx                         # 添加 handleConnect 回调，复用 createRelationship 逻辑
src/components/__tests__/app.integration.test.tsx  # 添加拖拽创建关系测试 + 点击空白取消选中测试
```

### Known Gotchas / Project Constraints

```text
- ReactFlow 的拖拽连接通过 onConnect 事件处理，需要配置 nodes 的 connectable=true
- Handle 的 type="source" 可以拖出连接，type="target" 可以接收连接
- 当前 ObjectNode 已配置 4 方向 source/target Handle，理论上支持连接
- 禁止自环和重复关系的校验逻辑已在 App.createRelationship 中实现，直接复用
- 点击空白取消选中：在 Canvas.tsx 的 onPaneClick 中添加 setSelection(null)
- 测试中使用 mock 的 ReactFlow，需要模拟 onConnect 事件
- 不要破坏现有的右键创建关系功能
```

---

## Implementation Blueprint

### Data model changes

- 无需修改 types.ts，现有 HandleLocation 和 Relationship 结构足够
- 无需修改 validation.ts，现有校验逻辑复用

### Task List（按顺序，可逐项验收）

```yaml
Task 1: 添加点击空白取消选中功能
MODIFY src/components/Canvas.tsx:
  - 在 onPaneClick 回调中添加取消选中逻辑
  - 当点击 pane 时：
    - 关闭右键菜单（已存在 closeContextMenu()）
    - 如果 creatingRelationship 为 true，调用 onCancelCreateRelationship()
    - 新增：调用 onDeselect() 取消当前选中（需要新增 props）

MODIFY src/App.tsx:
  - 添加 handleDeselect 回调：setSelection(null)
  - 传递给 Canvas 组件

VALIDATION:
  - 渲染 App，选中一个 Object（显示蓝边）
  - 点击空白区域，蓝边消失，SidePanel 显示默认提示

Task 2: 配置 ReactFlow 支持拖拽连接
MODIFY src/components/Canvas.tsx:
  - 添加 onConnect 属性处理连接事件
  - 确保 ReactFlow 配置：
    - nodesConnectable=true（默认 true，可显式指定）
  - 将 onConnect 映射到 App.handleConnect
  - onConnect 参数类型：Connection { source, target, sourceHandle, targetHandle }

MODIFY src/components/ObjectNode.tsx:
  - 检查 Handle 配置，确保 isConnectable=true（默认 true）
  - 确认 source Handle 可以拖出，target Handle 可以接收

VALIDATION:
  - 手动测试：尝试从 Object 的 Handle 拖拽（需在浏览器中验证）

Task 3: App 层实现 handleConnect
MODIFY src/App.tsx:
  - 添加 handleConnect 回调：
    - 参数：Connection（source, target, sourceHandle, targetHandle）
    - 提取 fromId=source, toId=target
    - 解析 sourceHandle/targetHandle 获取 HandleLocation（参考现有 parseHandleLocation）
    - 调用 createRelationship 创建关系（复用现有逻辑）
    - 如果创建成功，更新关系的 fromHandle/toHandle 为拖拽的 Handle
  - 将 handleConnect 传递给 Canvas 的 onConnect

VALIDATION:
  - 创建两个 Object
  - 从一个 Object 的 Handle 拖拽到另一个 Object 的 Handle
  - 验证 Relationship 创建成功，且 fromHandle/toHandle 正确

Task 4: 测试覆盖
MODIFY src/components/__tests__/app.integration.test.tsx:
  - 扩展 ReactFlow mock 添加 onConnect 支持
  - 添加测试：拖拽创建关系成功
  - 添加测试：拖拽自环被阻断
  - 添加测试：拖拽重复关系被阻断
  - 添加测试：点击空白取消选中

VALIDATION:
  - npm test -- --run 全绿
```

### Per-task pseudocode

```ts
// Task 1: 点击空白取消选中
// Canvas.tsx
onPaneClick={() => {
  closeContextMenu();
  if (creatingRelationship) {
    onCancelCreateRelationship();
  }
  onDeselect(); // 新增 props
}}

// App.tsx
const handleDeselect = useCallback(() => setSelection(null), []);
<Canvas ... onDeselect={handleDeselect} />

// Task 2 & 3: 拖拽创建关系
// Canvas.tsx - 添加 onConnect
<ReactFlow
  ...
  onConnect={onConnect} // 新增 props
/>

// App.tsx - handleConnect
const handleConnect = useCallback((connection: Connection) => {
  const fromId = connection.source;
  const toId = connection.target;
  if (!fromId || !toId) return;

  const fromHandle = parseHandleLocation(connection.sourceHandle, "source-");
  const toHandle = parseHandleLocation(connection.targetHandle, "target-");

  // 复用 createRelationship，但需要支持传入 handle 位置
  // 可以扩展 createRelationship 参数，或创建后更新
  createRelationshipWithHandles(fromId, toId, fromHandle, toHandle);
}, []);

// 扩展 createRelationship 或创建新函数
const createRelationshipWithHandles = (
  fromId: string,
  toId: string,
  fromHandle: HandleLocation | null,
  toHandle: HandleLocation | null
) => {
  // 复用现有自环/重复校验逻辑
  // 创建关系时使用传入的 handle 位置，或默认值
};
```

---

## Validation Loop（必须可执行）

### Level 0：One-shot

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
- [ ] 测试覆盖新增逻辑的 happy/edge/failure
- [ ] 右键创建关系功能未被破坏
- [ ] 没有引入不必要的新依赖或新模式

---

## Anti-Patterns to Avoid

- ❌ 只改实现不补测试
- ❌ 为了过验证而弱化校验/断言
- ❌ 跳过 validate gate（"应该没问题"）
- ❌ 破坏现有的右键创建关系功能
- ❌ 修改 createRelationship 的校验逻辑（直接复用）
- ❌ 引入新的状态管理或拖拽库（ReactFlow 已内置支持）
