# TASK — Work Log

这个文件用于在 PRP 执行过程中追踪任务状态，避免遗漏（尤其是多文件改动、反复验证修复的场景）。

## Active

- (yyyy-mm-dd) [ ] <task title>
  - **Goal**: <what “done” looks like>
  - **Files**: <key files>
  - **Validation**: `npm run validate`（或 PRP 指定命令）

## Done

- (yyyy-mm-dd) [x] <task title>

## Discovered During Work

记录在实现过程中发现、但不在原始需求里的补充任务（例如：缺测试、缺文档、边界 case）。

- (yyyy-mm-dd) [ ] <follow-up task>

