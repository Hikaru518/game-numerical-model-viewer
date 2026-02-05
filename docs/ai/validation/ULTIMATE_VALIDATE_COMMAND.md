# ULTIMATE_VALIDATE_COMMAND — 生成本仓库的一键验证流程（Cursor 版）

目标：让这个仓库拥有一个统一入口（推荐 `npm run validate`），使得 **validate 全绿 = 可以相信应用可用**。

本文件是“提示词模板”：当需要升级验证覆盖面时，把下面内容复制到 Cursor Chat，让 AI 生成/更新 `docs/ai/validation/VALIDATE.md`、必要的 npm scripts，以及（若需要）补充测试用例。

> 思想来源：`context-engineering-intro/validation/ultimate_validate_command.md`
>
> 参考：
> - https://github.com/coleam00/context-engineering-intro/blob/main/validation/README.md
> - https://github.com/coleam00/context-engineering-intro/blob/main/validation/example-validate.md
> - https://github.com/coleam00/context-engineering-intro/blob/main/validation/ultimate_validate_command.md

---

## 复制到 Cursor 的提示词

```text
你是这个仓库的 coding agent。请深度分析代码库，产出一个“validate 全绿 = 可以相信应用可用”的验证流程。

### Step 0：先找真实用户旅程（不要先看工具）
1) 阅读 README.md、PLANNING.md、docs/ai/WORKFLOW.md
2) 提炼用户会做的完整旅程（从 UI/交互角度），例如：
   - 空画布 → 点击导入 JSON → 触发文件选择
   - 新建 Object → 修改名称/简介/属性公式
   - 创建 Relationship（两次点击）→ 禁止自环/禁止重复关系
   - 删除 Object（若仍有关联关系应阻断）
   - 导出 JSON（导出前更严格校验：例如 Object.name 不能为空）
   - dirty 状态 → 离开页面提示

### Step 1：分析仓库已有验证工具与脚本
- `package.json` scripts（lint/test/build）
- ESLint 配置（eslint.config.js）
- TypeScript 配置（tsconfig*.json；注意本仓库 `noEmit: true`）
- 测试框架与现有测试模式（Vitest + Testing Library）

### Step 2：生成/更新 validate 文档与脚本
请输出两个产物：
1) 更新 `docs/ai/validation/VALIDATE.md`：
   - 分 Phase（Lint/Typecheck/Tests/Build/用户旅程）
   - 每个 Phase 给出可执行命令 + 预期结果 + 失败后的修复策略
   - 明确 Phase 5 “用户旅程覆盖”要怎么落到测试上
2) 更新 `package.json` scripts：
   - 提供统一入口 `npm run validate`（串联 lint/test/build 等）
   - 如有必要补充 `typecheck` 或更细的脚本（但不要引入无必要依赖）

### Step 3：补齐用户旅程测试（Phase 5）
- 优先使用 Vitest + Testing Library 扩展 `src/components/__tests__/app.integration.test.tsx`（轻量 E2E）
- 保持现有 `vi.mock("reactflow")` 的测试模式，避免引入新的 UI 测试框架
- 对每个新增用户旅程，至少补：happy path / edge case / failure case

### 输出要求
- 不要改动业务行为（除非修 bug）
- 不要引入大依赖（例如 Playwright）除非明确需要；若建议引入，必须给出“为什么现在需要”与替代方案
- 最终保证：`npm run validate` 可在本地一键跑完，并且失败时可以定位问题
```

