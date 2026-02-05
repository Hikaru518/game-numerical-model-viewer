# Model Types（snapshot）

用于描述导入/导出 JSON 与画布编辑的核心数据结构。

```ts
export type ArrowType = "single" | "double" | "none";

export type Attribute = {
  name: string;
  description: string;
  formula: string;
};

export type ObjectEntity = {
  id: string;
  name: string;
  description: string;
  attributes: Attribute[];
};

export type Relationship = {
  id: string;
  name: string;
  description: string;
  fromId: string;
  toId: string;
  arrowType: ArrowType;
  label: string;
};

export type ModelData = {
  schemaVersion?: number;
  objects: ObjectEntity[];
  relationships: Relationship[];
};

export type ValidationIssue = {
  message: string;
  fieldPath?: string;
  id?: string;
  suggestion?: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};
```

