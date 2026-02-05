export type ArrowType = "single" | "double" | "none";

export type HandleLocation = "left" | "right" | "top" | "bottom";

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
  fromHandle?: HandleLocation;
  toHandle?: HandleLocation;
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
