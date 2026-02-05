## FEATURE:

[用 3-8 条 bullet 写清楚要做什么。尽量描述“用户可见行为 + 成功标准”。]

示例（仅供参考）：

- 在 SidePanel 增加“导入 JSON（粘贴）”入口：允许用户粘贴 JSON 字符串直接导入
- 导入前仍需走 `validateModel`；失败要在 ErrorModal 展示 `fieldPath/id/suggestion`
- 导入成功后自动 `fitView` 并清空 dirty
- 需要补齐集成流测试，覆盖：成功导入、JSON 解析失败、结构校验失败

## EXAMPLES:

[列出仓库内可以复用的模式文件，并说明你希望 AI 模仿哪些点。]

推荐优先参考：

- `src/model/validation.ts`：导入/导出校验与 issue 汇总格式（`fieldPath`/`id`/`suggestion`）
- `src/components/__tests__/app.integration.test.tsx`：用户旅程集成测试（含 `vi.mock("reactflow")`）
- `src/components/Canvas.tsx`：ReactFlow 节点/边的组织方式、hover tooltip 模式
- `src/App.tsx`：顶层状态编排（model/positions/selection/dirty 等）与导入/导出流程

## DOCUMENTATION:

[列出需要阅读的文档链接/文件路径。]

- `PLANNING.md`：架构与不可破坏行为
- `docs/ai/WORKFLOW.md`：生成 PRP 与执行 PRP 的工作流
- `docs/ai/validation/VALIDATE.md`：验证门禁（推荐最终跑 `npm run validate`）
- （可选）ReactFlow 官方文档：如果需求涉及复杂交互（拖拽、edge label、marker 等）

## OTHER CONSIDERATIONS:

[写出 AI 容易踩坑的点、边界条件、兼容性要求、是否允许引入依赖等。]

- 是否涉及 `ModelData` schema 变更？是否需要 `coerceModel` 兼容旧数据？
- 是否需要保持“删除 Object 前必须先删 Relationship”的阻断行为？
- 是否有性能/可用性要求（大量 objects/relationships）？
- 是否允许新增依赖（默认：**尽量不加**；如果必须加，说明原因与替代方案）
- 验证要求：至少 `npm run lint`、`npm test -- --run`、`npm run build`；建议最终 `npm run validate`

