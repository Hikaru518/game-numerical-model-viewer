# VALIDATE — 一键验证本仓库

目标：把验证做成一个闭环，使得 **`npm run validate` 全绿 = 可以相信应用可用**。
如果有错误需要修复。

## Quick Start

```bash
npm run validate
```

> `validate` 会串联 lint + tests + build（见 [package.json](../../../package.json)）。
> 如需更细粒度排查，可按下面 phases 单独执行。

## Phase 1：Linting（静态检查）

```bash
npm run lint
```

**预期**：无 ESLint 错误。
**失败处理**：按错误提示修复；若需要忽略，优先用局部禁用并写明原因。

## Phase 2：Type Checking（类型检查）

推荐：

```bash
npm run typecheck
```

或（等价/更重）：

```bash
npm run build
```

**预期**：无 TypeScript 报错。
**失败处理**：优先修复类型与未使用变量/参数（本仓库 `strict` 且开启 `noUnused*`）。

## Phase 3：Unit / Integration Tests

```bash
npm test -- --run
```

**预期**：所有 Vitest 用例通过。
**失败处理**：不要为了过测试而弱化断言；找根因修复实现或补齐正确 mock。

## Phase 4：Build（构建验证）

```bash
npm run build
```

**预期**：Vite 构建成功。
**失败处理**：通常是 TS 错误、未声明的环境变量、或打包配置问题。

## Phase 5：用户旅程（轻量 E2E）

本仓库是纯前端工具，Phase 5 优先用 **Testing Library 的集成流** 覆盖真实用户旅程（比只测函数更接近真实使用）。

当前主要落点：

- `src/components/__tests__/app.integration.test.tsx`
  - 通过 `vi.mock("reactflow")` 将 ReactFlow 变成可控的 DOM 渲染，从而测试用户点击/输入/删除等完整旅程。

**建议长期覆盖的用户旅程清单（可逐步补齐）**：

- 空画布状态：点击“导入 JSON”触发 file dialog
- 新建对象：创建 → 修改名称 → 画布节点文案同步更新
- 创建关系：开启创建关系 → 依次点击两个 node → 产生 edge 与右侧关系编辑
- 失败路径：自环关系创建应阻断并提示
- 删除约束：有关联关系的对象删除应阻断；删关系后才能删对象
- 导入失败：JSON 解析失败、结构不合法（`validateModel`）
- 导出失败：导出前校验失败（`validateForExport`）
- dirty 提示：编辑/拖拽后 dirty；导出成功后清除 dirty

> 如果未来需要真实浏览器交互（例如验证滚轮缩放、拖拽平移等），再考虑引入 Playwright。
> 当前阶段优先保持轻量与可维护。

## 常见 Gotchas

- **`crypto.randomUUID`**：在测试环境可能不存在；本仓库现有集成测试会通过 stub 解决（参考 `app.integration.test.tsx`）。
- **ReactFlow**：测试里不要直接依赖真实 ReactFlow 行为，优先沿用现有 mock 模式来跑“用户旅程”。

