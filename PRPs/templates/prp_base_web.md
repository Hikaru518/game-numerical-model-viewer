# PRP Base Template（Web / TypeScript / React）

> PRP = Product Requirements Prompt（面向 AI 的“实现蓝图”）。
> 目标：让 AI 在一次执行中尽量做对，靠 **充分上下文 + 可执行验证门禁** 自我纠错。

---

## Goal

[要构建什么？写清楚最终形态（end state），越具体越好。]

## Why

- [业务价值 / 用户价值]
- [为什么现在要做]
- [与现有功能的关系]

## What

[用户可见行为 + 技术要求 + 约束]

### Success Criteria

- [ ] [可验收的结果 1]
- [ ] [可验收的结果 2]

---

## All Needed Context

### Documentation & References（必须补齐）

```yaml
# MUST READ - These must be included in context
- file: PLANNING.md
  why: Architecture, invariants, and existing patterns

- file: TASK.md
  why: Task tracking format (Active/Done/Discovered)

- file: src/App.tsx
  why: Top-level state orchestration (model/positions/selection/dirty) + import/export flows

- file: src/model/types.ts
  why: Data model types (ModelData/ObjectEntity/Relationship)

- file: src/model/validation.ts
  why: validateModel/validateForExport/coerceModel patterns (issues aggregation)

- file: src/components/__tests__/app.integration.test.tsx
  why: User-journey integration tests + reactflow mock pattern

- file: docs/ai/validation/VALIDATE.md
  why: Validation gates and “green = safe” philosophy

# Optional - add external docs only when needed
- url: https://reactflow.dev/
  why: Only if changes involve complex ReactFlow behaviors
```

### Current Codebase Tree（AI 执行时生成）

```bash
# Run in repo root
tree -a -L 4
```

### Desired Codebase Tree（本 PRP 要新增/修改哪些文件）

```bash
# Example
PRPs/<feature>.md
docs/ai/validation/VALIDATE.md
src/...
```

### Known Gotchas / Project Constraints

```text
- Avoid inventing new patterns when existing ones work.
- Keep validation issue reporting as “issues[] aggregation” (fieldPath/id/suggestion), not throw-based flows.
- Tests: prefer Vitest + Testing Library; reuse existing reactflow mock approach.
- No unnecessary dependencies. If adding one, explain why and list alternatives.
```

---

## Implementation Blueprint

### Data model changes（如有）

- 需要修改 `src/model/types.ts` 吗？
- 需要 `coerceModel` 兼容旧 JSON 吗？
- 导入/导出校验要怎么调整（`validateModel` / `validateForExport`）？

### Task List（按顺序，可逐项验收）

```yaml
Task 1: <short title>
MODIFY src/xxx.tsx:
  - Follow pattern from: src/yyy.tsx
  - Preserve existing public APIs and UX invariants

Task 2: <short title>
CREATE src/zzz.ts:
  - Mirror validation pattern from: src/model/validation.ts

Task 3: Tests
MODIFY/CREATE src/**/__tests__/**:
  - Add happy path / edge case / failure case
  - Prefer integration/user-journey tests when feature is user-facing
```

### Per-task pseudocode（只写关键点，不要把整段代码写满）

```ts
// Task 1 (example)
// - Validate input first
// - Update state immutably
// - Set dirty flag consistently
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

### Level 5：User Journeys（轻量 E2E）

优先让 Testing Library 覆盖真实旅程（导入/创建/关系/删除/导出/dirty）。
如果 PRP 引入了新的用户旅程，必须补对应的集成流测试并纳入 `npm test -- --run`。

---

## Final Checklist

- [ ] Success Criteria 全部满足
- [ ] `npm run validate` 全绿
- [ ] 测试覆盖新增逻辑的 happy/edge/failure
- [ ] 文档必要更新（README/WORKFLOW/VALIDATE 等）
- [ ] 没有引入不必要的新依赖或新模式

---

## Anti-Patterns to Avoid

- ❌ 只改实现不补测试
- ❌ 为了过验证而弱化校验/断言
- ❌ 跳过 validate gate（“应该没问题”）
- ❌ 新起一套架构/状态管理模式导致维护成本上升

