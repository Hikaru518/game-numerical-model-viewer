你是这个仓库的 coding agent。
请阅读 PLANNING.md、TASK.md、INITIAL_<feature>.md、PRPs/templates/prp_base_web.md 和 examples/README.md。

目标：基于 INITIAL_<feature>.md 生成一份可执行的 PRP，保存为 PRPs/<feature>.md。
要求：
- PRP 必须列出“必读文件/参考模式”（给出具体路径与 why）
- PRP 必须包含任务拆分（按顺序，逐项可验收）
- PRP 必须包含 Validation Loop（至少 npm run lint / npm test -- --run / npm run build，并建议最终跑 npm run validate）
- 明确 success criteria（checkbox）
- 明确 gotchas（例如导入校验、ReactFlow mock、dirty 行为）