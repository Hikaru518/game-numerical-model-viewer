请执行 PRPs/<feature>.md。
要求：
- 严格按 PRP 的任务列表顺序实现
- 每完成一个阶段就跑对应 validation gate；失败则修复并重跑直到通过
- 过程中把任务状态同步到 TASK.md（Active → Done；新发现的补充项放 Discovered During Work）。这里的任务状态是指 prp 中分出的好多不同的小任务，要把这些任务的状态同步到 TASK.md 中。

在 validation 的时候，你可能需要用到 /validate 这个 command。command 的具体内容在 [`validate.md`](./validate.md)