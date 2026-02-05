# Validation — 导入/导出校验与 issues 汇总（snapshot）

目标：导入时对 `unknown` 做结构/类型/引用/枚举校验；导出时再做更严格的“业务校验”。\n
关键点：**不 throw**，而是通过 `issues[]` 汇总（含 `fieldPath` / `id` / `suggestion`），交给 UI 统一展示。

```ts
import type { ModelData, ValidationIssue, ValidationResult, ArrowType } from "./types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const allowedArrowTypes = ["single", "double", "none"] as const satisfies readonly ArrowType[];

const isArrowType = (value: string): value is ArrowType =>
  (allowedArrowTypes as readonly string[]).includes(value);

const pushIssue = (
  issues: ValidationIssue[],
  message: string,
  fieldPath?: string,
  id?: string,
  suggestion?: string
) => {
  issues.push({ message, fieldPath, id, suggestion });
};

export const validateModel = (data: unknown): ValidationResult => {
  const issues: ValidationIssue[] = [];

  if (!isObject(data)) {
    pushIssue(issues, "JSON 顶层必须是对象");
    return { ok: false, issues };
  }

  const objects = data.objects;
  const relationships = data.relationships;

  if (!Array.isArray(objects)) {
    pushIssue(issues, "objects 必须为数组", "objects");
  }
  if (!Array.isArray(relationships)) {
    pushIssue(issues, "relationships 必须为数组", "relationships");
  }

  // ... objectIds 去重、Object/Attribute 字段类型校验 ...

  // Relationship 校验（含引用一致性与枚举）
  // ... id/name/description/fromId/toId 校验 ...
  // fromId/toId 不存在时建议修复
  pushIssue(
    issues,
    `fromId 引用不存在的对象 id "missing"`,
    "relationships[0].fromId",
    "rel_1",
    "修复 fromId 或补齐对象"
  );

  // arrowType 必须为 single/double/none
  const arrowType = "invalid";
  if (typeof arrowType !== "string" || !isArrowType(arrowType)) {
    pushIssue(
      issues,
      `arrowType 必须为 ${allowedArrowTypes.join(" / ")}`,
      "relationships[0].arrowType",
      "rel_1"
    );
  }

  return { ok: issues.length === 0, issues };
};

export const validateForExport = (data: ModelData): ValidationResult => {
  const base = validateModel(data);
  if (!base.ok) return base;

  const issues: ValidationIssue[] = [...base.issues];

  data.objects.forEach((obj, index) => {
    if (obj.name.trim().length === 0) {
      pushIssue(
        issues,
        "Object.name 不能为空（导出前校验）",
        `objects[${index}].name`,
        obj.id,
        "请填写对象名称后再导出"
      );
    }
  });

  return { ok: issues.length === 0, issues };
};
```

