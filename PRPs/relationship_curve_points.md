# PRP — Relationship Curve Points（关系曲线控制点：双击新增/右键删除/平滑多段曲线）
> 生成依据：`INITIAL_relationship_curve_points.md`

## Goal

为每条 `Relationship` 边提供**可编辑的“多段平滑曲线”**能力：用户可以在边上双击插入控制点（最多 **5 个用户控制点**）；在选中该 relationship 时显示这些**用户控制点**；右键用户控制点可删除。曲线由**起点（from）→ 若干用户点 → 终点（to）**组成，整体视觉上保持平滑（新增点后从 AB 变成 A-C-B，且 ACB 仍光滑）。

## Why

- **可读性**：关系边容易被节点/其他边遮挡；允许手动绕行可以显著提升图可读性。
- **效率**：无需反复移动对象/调整布局来“避让遮挡”，更接近用户意图（直接改线）。
- **一致性**：保持本仓库既有模式（`App.tsx` 顶层编排、`issues[]` 校验汇总、ReactFlow mock 的集成测试）。

## What

### 用户可见行为

- **多段曲线=一条平滑曲线**：
  - 用户看到的是一条连续的曲线，但内部由多个片段拼接形成。
  - 初始至少有 2 个“控制点”：**起点与终点**（隐式存在，不作为“用户控制点”展示/删除）。
- **双击添加用户控制点**：
  - 用户在“没有控制点的曲线区域”双击，插入一个用户控制点。
  - 例如原来是 A→B（单段），插入 C 后变成 A→C 与 C→B（两段），且整体 ACB 仍平滑（至少 \(C^1\) 连续）。
  - **用户控制点数量上限 5**；超过时阻止新增并提示原因（沿用 `ErrorModal` + `issues[]`）。
- **选中 relationship 时显示用户控制点**：
  - 仅在 relationship 被选中时显示**用户控制点**（不显示起点/终点隐式控制点）。
- **右键删除用户控制点**：
  - 右键用户控制点出现菜单项“删除控制点”；点击后删除该点并更新曲线。

### 数据与兼容性约束

- **只持久化用户控制点**：起点/终点由 `fromId/toId` 对应节点的位置决定（避免节点移动时端点控制点“过期”）。
- **导入/导出**：
  - JSON 中可选字段 `curvePoints` 表示用户控制点数组（0..5 个）。
  - 兼容旧 JSON：允许缺失该字段；缺失时仍按现有默认边渲染（不破坏旧数据）。
- **校验约束**：继续遵循 `issues[]` 汇总（`fieldPath`/`id`/`suggestion`），**不要**改为 throw 流程。

### Success Criteria

- [ ] 选中某条 relationship 时，仅显示该 relationship 的**用户控制点**（起点/终点不显示）。
- [ ] 在 relationship 曲线上双击会插入一个用户控制点，曲线变为多段且视觉连续平滑。
- [ ] 用户控制点数量最多 5 个：第 6 个被阻止并通过 `ErrorModal` 给出明确原因与建议。
- [ ] 右键用户控制点可删除；删除后曲线更新且仍平滑。
- [ ] 导入含 `curvePoints` 的 JSON 可正确渲染；导出时能稳定输出合法的 `curvePoints`（如存在）。
- [ ] 通过验证门禁：`npm run lint`、`npm test -- --run`、`npm run build` 全绿（最终建议跑 `npm run validate`）。

---

## All Needed Context

### Documentation & References（必读文件/参考模式）

```yaml
# MUST READ
- file: PLANNING.md
  why: 架构与不可破坏行为（App 顶层编排、issues[] 校验汇总、ReactFlow mock 约定、dirty 行为）

- file: TASK.md
  why: 任务记录格式（Active/Done/Discovered）；PRP 执行时应登记与更新

- file: INITIAL_relationship_curve_points.md
  why: 本 PRP 的原始需求（双击新增、最多 5 个用户点、选中显示、右键删除、曲线平滑）

- file: src/App.tsx
  why: 顶层 state（model/positions/selection/dirty/ErrorModal）与导入/导出编排；新增交互应在这里落地以保持单一数据源

- file: src/components/Canvas.tsx
  why: ReactFlow nodes/edges 组装方式与 context menu 模式；edge data 透传回调的放置位置

- file: src/components/RelationshipEdge.tsx
  why: 当前边的渲染结构（BaseEdge/交互 path/EdgeLabelRenderer）；控制点 UI 与双击插入将落在这里

- file: src/model/types.ts
  why: Relationship 数据结构扩展（curvePoints）需要在这里定义

- file: src/model/validation.ts
  why: validateModel/validateForExport/coerceModel 的 issues[] 汇总模式；需要增加 curvePoints 的校验与兼容

- file: src/components/__tests__/app.integration.test.tsx
  why: 用户旅程集成测试（vi.mock("reactflow")）；新增交互必须沿用并可能需要增强 mock 支持 edgeTypes

- file: docs/ai/validation/VALIDATE.md
  why: 验证门禁的分层执行方式；确保最终 npm run validate 全绿

- file: examples/README.md
  why: 可复用模式快照索引，避免发明新范式

# REUSE PATTERNS (snippets)
- file: examples/snippets/reactflow-mock-integration-test.md
  why: ReactFlow mock 的推荐写法（可控 DOM + stub crypto.randomUUID）

- file: examples/snippets/validation-import-export.md
  why: issues[] 汇总与 validateModel(unknown) 的惯用写法（不 throw）
```

### Current Codebase Tree（PRP 执行时生成）

```bash
tree -a -L 4
```

### Desired Codebase Tree（本 PRP 预计修改/新增）

```bash
PRPs/relationship_curve_points.md
src/model/types.ts
src/model/validation.ts
src/App.tsx
src/components/Canvas.tsx
src/components/RelationshipEdge.tsx
src/components/__tests__/app.integration.test.tsx

# 可能新增（避免单文件 > 800 行，复用并便于测试）
src/components/relationshipCurvePath.ts
src/components/__tests__/relationshipCurvePath.test.ts
```

### Known Gotchas / Project Constraints

```text
- 交互坐标：双击事件拿到的是 client 坐标；需要转换为 ReactFlow/画布坐标（建议由 Canvas 注入转换函数，便于测试 mock）。
- 测试不要依赖真实 ReactFlow：必须沿用 vi.mock("reactflow")，并在需要时增强 mock 以渲染自定义 edgeTypes。
- 校验必须使用 issues[] 汇总（fieldPath/id/suggestion），不要 throw。
- dirty 行为：任何新增/删除控制点都必须 dirty=true；导出成功后 dirty=false（按现有模式）。
- 单文件不超过 800 行：RelationshipEdge 变复杂时拆出 path builder 到独立模块。
```

---

## Implementation Blueprint

### Data model changes

- **目标**：只保存“用户控制点”（0..5 个），端点由 from/to 节点位置隐式决定。

修改 `src/model/types.ts`（示意）：

- `Relationship.curvePoints?: Array<{ x: number; y: number }>`  
  - 表示用户控制点（可缺失；缺失与空数组语义等价）

兼容策略 `src/model/validation.ts`：

- `validateModel(unknown)`：
  - `curvePoints` 若存在，必须是数组
  - 数组长度必须 \(\le 5\)
  - 每个点必须是对象且 `x/y` 为有限 number（排除 `NaN`/`Infinity`）
- `coerceModel(ModelData)`：
  - 缺失 `curvePoints` 时保持 `undefined`（不强制注入空数组，避免改变导出形态）
- `validateForExport(ModelData)`：
  - 与 `validateModel` 对 `curvePoints` 的约束保持一致（导出前不允许非法数据）

### 曲线路径生成（平滑多段）

**建议新增** `src/components/relationshipCurvePath.ts`，集中实现 path builder：

- `buildRelationshipCurvePath(params)`：
  - 输入：`source`、`target`、`curvePoints?`（用户点）、（可选）曲线平滑系数
  - 输出：SVG path string
  - 算法建议：**Catmull–Rom spline → cubic Bezier**（天然平滑，多点稳定）
    - 用点序列 \([P0=source, P1, ..., Pn=target]\) 生成每段的 Bezier 控制点，保证拼接处切线一致（\(C^1\)）。
- 当无用户点时：
  - 为不破坏现有视觉，可继续用当前 `RelationshipEdge` 的 bezier 逻辑（`getBezierPath`）作为 fallback；或统一走新 path builder（但需确认与现有样式一致）。

### UI/交互落点（保持 App 单一数据源）

- `RelationshipEdge.tsx` 负责：
  - 渲染最终 path（BaseEdge）
  - 在 “宽的透明交互 path” 上监听 `onDoubleClick`，请求插入控制点
  - 在选中时通过 `EdgeLabelRenderer` 渲染用户控制点（小圆点/小按钮），并在其上监听 `onContextMenu`
- `Canvas.tsx` 负责：
  - 组装 edge `data`，把需要的回调与坐标转换函数传给 `RelationshipEdge`
  - 复用现有 context menu 机制，新增一种菜单类型：`curvePoint`（relationshipId + pointIndex）
- `App.tsx` 负责：
  - 真正更新 `model.relationships`（immutable update）
  - 更新 `dirty`
  - 违规时通过 `ErrorModal` 展示 `issues[]`

---

## Task List（按顺序，可逐项验收）

```yaml
Task 1: 定义数据结构（只存用户控制点）
MODIFY src/model/types.ts:
  - Add optional Relationship.curvePoints?: {x:number;y:number}[] (0..5 user points)

Task 2: 导入/导出校验与兼容
MODIFY src/model/validation.ts:
  - validateModel: validate curvePoints when present (array, length<=5, finite x/y)
  - validateForExport: same constraints
  - coerceModel: keep curvePoints undefined when absent
  - Follow pattern from: examples/snippets/validation-import-export.md

Task 3: 平滑多段曲线路径生成（可单测）
CREATE src/components/relationshipCurvePath.ts:
  - Implement Catmull-Rom -> Bezier path builder for [source, ...userPoints, target]
CREATE src/components/__tests__/relationshipCurvePath.test.ts:
  - happy: 0 user points produces valid "M..."
  - happy: 1..5 user points produces continuous path string
  - edge: repeated/collinear points still produce path (no crash)

Task 4: RelationshipEdge 支持双击插点 + 选中显示点 + 右键触发菜单
MODIFY src/components/RelationshipEdge.tsx:
  - Use relationshipCurvePath when curvePoints present (or always, per design)
  - Add onDoubleClick on interaction path -> data.onInsertCurvePoint({x,y})
  - Render user control points when selected (EdgeLabelRenderer)
  - On context menu of a point -> data.onRequestCurvePointMenu(pointIndex, clientX, clientY)

Task 5: Canvas 支持 curvePoint 菜单，并把回调/坐标转换注入 edge.data
MODIFY src/components/Canvas.tsx:
  - Extend ContextMenuState with kind: "curvePoint"
  - Wire callbacks: insertCurvePoint / deleteCurvePoint
  - Provide coordinate conversion function (client -> flow) to edge data

Task 6: App 实现插入/删除逻辑 + 约束 + dirty + ErrorModal
MODIFY src/App.tsx:
  - insertCurvePoint(relId, point):
      - if existing userPoints length >= 5 => ErrorModal(issues[])
      - else insert at computed index (simplify OK; best: nearest segment)
      - set dirty=true
  - deleteCurvePoint(relId, index):
      - remove that user point; set dirty=true
  - Ensure import/export path keeps curvePoints (when present) and passes validation

Task 7: 集成测试（用户旅程）
MODIFY src/components/__tests__/app.integration.test.tsx:
  - Enhance reactflow mock to render custom edgeTypes (so RelationshipEdge DOM exists)
  - Add test: select relationship -> shows user control points (initially none)
  - Add test: double click edge -> inserts a point; repeats until 5; 6th blocked with ErrorModal
  - Add test: right click point -> menu -> delete removes it
```

### Per-task pseudocode（关键点，不要铺满整段代码）

```ts
// App.tsx
function insertCurvePoint(relId: string, p: {x:number;y:number}) {
  setModel((prev) => {
    const rel = prev.relationships.find((r) => r.id === relId);
    if (!rel) return prev;
    const existing = rel.curvePoints ?? [];
    if (existing.length >= 5) {
      showIssues([{ message: "控制点不能超过 5 个", id: relId, suggestion: "请先删除一个控制点再添加" }]);
      return prev;
    }
    const nextPoints = insertAtNearestSegmentOrAppend(existing, p);
    return updateRelationship(prev, relId, { curvePoints: nextPoints });
  });
  setDirty(true);
}

function deleteCurvePoint(relId: string, index: number) {
  setModel((prev) => {
    const rel = prev.relationships.find((r) => r.id === relId);
    if (!rel?.curvePoints) return prev;
    const next = rel.curvePoints.filter((_, i) => i !== index);
    return updateRelationship(prev, relId, { curvePoints: next.length ? next : [] });
  });
  setDirty(true);
}
```

---

## Validation Loop（必须可执行）

### 推荐最终一键

```bash
npm run validate
```

### 分解排查（至少要跑）

```bash
npm run lint
npm test -- --run
npm run build
```

（如仓库有 typecheck 脚本，也建议补跑）

```bash
npm run typecheck
```

---

## Final Checklist

- [ ] Success Criteria 全部满足
- [ ] `npm run lint` 通过
- [ ] `npm test -- --run` 通过（新增旅程覆盖 happy/edge/failure）
- [ ] `npm run build` 通过
- [ ] `npm run validate` 全绿
- [ ] 未引入不必要依赖、未破坏现有模式（issues[]、ReactFlow mock、App 顶层编排、dirty 行为）

---

## Anti-Patterns to Avoid

- ❌ 把控制点存在 `RelationshipEdge` 的局部 state（会导致导入/导出不一致）
- ❌ 在校验里 throw（应汇总为 `issues[]` 交给 `ErrorModal`）
- ❌ 测试依赖真实 ReactFlow 行为（应该增强 mock 来渲染 edgeTypes 并触发事件）
- ❌ 让单文件膨胀（>800 行）而不拆分 path builder/辅助逻辑

