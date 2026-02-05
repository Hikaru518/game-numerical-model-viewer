# WORKFLOW — Context Engineering（Cursor 版）

本仓库采用 `context-engineering-intro` 的思想，我们把流程落到“仓库文档 + Cursor 项目规则 + 可执行验证门禁”上。

## 你会用到的文件/目录

- **长期上下文（架构/约束）**：[`PLANNING.md`](../../PLANNING.md)
- **任务追踪**：[`TASK.md`](../../TASK.md)
- **需求入口**：[`INITIAL.md`](../../INITIAL.md)（建议复制为 `INITIAL_<feature>.md`）
- **PRP（蓝图）**：`PRPs/<feature>.md`
- **PRP 模板**：`PRPs/templates/prp_base_web.md`
- **Examples（给 AI 的模式样例）**：`examples/`
- **Validation（“一键验证”规范）**：`docs/ai/validation/`
- **Cursor 规则**：`.cursor/rules/*.mdc`

## 核心原则

- **Context is King**：不要只写一句“加个功能”。把代码位置、类似实现、数据格式、边界条件、验证命令都写进上下文。
- **Validation Loop**：每个 PRP 都必须包含可执行门禁。失败就修复，直到全绿。
- **Follow existing patterns**：优先复用现有模式（例如 `src/model/validation.ts` 的 issue 汇总方式、`app.integration.test.tsx` 的 ReactFlow mock 模式）。

## Step 0：开始前（每次新需求都做）

1. 读 [`PLANNING.md`](../../PLANNING.md)：理解架构与不可破坏的行为。
2. 看 [`TASK.md`](../../TASK.md)：确认是否已有任务。

## Step 1：写需求（INITIAL）

做法：

- 直接编辑 [`INITIAL.md`](../../INITIAL.md)，或复制为 `INITIAL_<feature>.md`（更推荐，避免覆盖模板）。
- 按四段式写清楚：FEATURE / EXAMPLES / DOCUMENTATION / OTHER CONSIDERATIONS。

建议最少包含：

- **用户可见行为**（UI 上怎么操作、看到什么）
- **数据影响**（是否改 `ModelData`、是否需要兼容旧 JSON）
- **边界与失败路径**（导入失败、删除阻断、重复关系等）
- **验证门禁**（至少 lint/test/build；最好附 1-2 条新的集成流测试）

## Step 2：生成 PRP（蓝图）

在 Cursor Chat 里让 AI 生成 PRP 文档（保存到 `PRPs/<feature>.md`）。

可直接复制下面的提示词（把文件名改掉）：
```text
你是这个仓库的 coding agent。
请阅读 PLANNING.md、TASK.md、INITIAL_<feature>.md、PRPs/templates/prp_base_web.md 和 examples/README.md。

目标：基于 INITIAL_<feature>.md 生成一份可执行的 PRP，保存为 PRPs/<feature>.md。
要求：
- PRP 必须列出“必读文件/参考模式”（给出具体路径与 why）
- PRP 必须包含任务拆分（按顺序，逐项可验收）
- PRP 必须包含 Validation Loop（至少 npm run lint / npm test -- --run / npm run build，并建议最终跑 npm run validate）
- 明确 success criteria（checkbox）
- 明确 gotchas（例如导入校验、ReactFlow mock、dirty 行为）
```

## Step 3：执行 PRP（实现 + 自验证）

在 Cursor Chat 里让 AI 执行某个 PRP（实现代码、补测试、跑门禁、修到全绿）。
提示词示例：

```text
请执行 PRPs/<feature>.md。
要求：
- 严格按 PRP 的任务列表顺序实现
- 每完成一个阶段就跑对应 validation gate；失败则修复并重跑直到通过
- 过程中把任务状态同步到 TASK.md（Active → Done；新发现的补充项放 Discovered During Work）
```

## Step 4：Validate（让“全绿=可用”成立）

最终目标是形成一个统一入口：`npm run validate`。

并把 validate 过程写进 `docs/ai/validation/VALIDATE.md`（分 Phase：lint/typecheck/tests/build/用户旅程）。

更多细节见：

- `docs/ai/validation/ULTIMATE_VALIDATE_COMMAND.md`
- `docs/ai/validation/VALIDATE.md`

## Step 5: Check PLANNING (项目的功能或者约束可能改变)

当验证通过之后，请 agent 检查 PLANNING.md，查看是否有任何的矛盾，如果有矛盾请给出一个总结。并告知用户 PLANNING 有可能的改动点。
