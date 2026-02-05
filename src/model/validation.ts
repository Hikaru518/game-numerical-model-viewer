import type {
  ModelData,
  ValidationIssue,
  ValidationResult,
  ArrowType,
  HandleLocation,
} from "./types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const allowedArrowTypes = ["single", "double", "none"] as const satisfies readonly ArrowType[];

const isArrowType = (value: string): value is ArrowType =>
  (allowedArrowTypes as readonly string[]).includes(value);

const allowedHandleLocations = ["left", "right", "top", "bottom"] as const satisfies readonly HandleLocation[];

const isHandleLocation = (value: string): value is HandleLocation =>
  (allowedHandleLocations as readonly string[]).includes(value);

const pushIssue = (
  issues: ValidationIssue[],
  message: string,
  fieldPath?: string,
  id?: string,
  suggestion?: string
) => {
  issues.push({ message, fieldPath, id, suggestion });
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const validateModel = (data: unknown): ValidationResult => {
  const issues: ValidationIssue[] = [];

  if (!isObject(data)) {
    pushIssue(issues, "JSON 顶层必须是对象");
    return { ok: false, issues };
  }

  const objects = data.objects;
  const relationships = data.relationships;
  const positions = data.positions;

  if (!Array.isArray(objects)) {
    pushIssue(issues, "objects 必须为数组", "objects");
  }
  if (!Array.isArray(relationships)) {
    pushIssue(issues, "relationships 必须为数组", "relationships");
  }

  const objectIds = new Set<string>();
  const objectIdDuplicates = new Set<string>();

  if (Array.isArray(objects)) {
    objects.forEach((obj, index) => {
      const basePath = `objects[${index}]`;
      if (!isObject(obj)) {
        pushIssue(issues, "Object 必须为对象", basePath);
        return;
      }

      const id = obj.id;
      const name = obj.name;
      const description = obj.description;
      const attributes = obj.attributes;

      if (typeof id !== "string" || id.trim().length === 0) {
        pushIssue(issues, "Object.id 必须为非空字符串", `${basePath}.id`);
      } else if (objectIds.has(id)) {
        objectIdDuplicates.add(id);
      } else {
        objectIds.add(id);
      }

      if (typeof name !== "string") {
        pushIssue(issues, "Object.name 必须为字符串", `${basePath}.name`, id as string);
      }

      if (typeof description !== "string") {
        pushIssue(
          issues,
          "Object.description 必须为字符串",
          `${basePath}.description`,
          id as string
        );
      }

      if (!Array.isArray(attributes)) {
        pushIssue(
          issues,
          "Object.attributes 必须为数组",
          `${basePath}.attributes`,
          id as string
        );
      } else {
        attributes.forEach((attr, attrIndex) => {
          const attrPath = `${basePath}.attributes[${attrIndex}]`;
          if (!isObject(attr)) {
            pushIssue(issues, "Attribute 必须为对象", attrPath, id as string);
            return;
          }
          if (typeof attr.name !== "string") {
            pushIssue(
              issues,
              "Attribute.name 必须为字符串",
              `${attrPath}.name`,
              id as string
            );
          }
          if (typeof attr.description !== "string") {
            pushIssue(
              issues,
              "Attribute.description 必须为字符串",
              `${attrPath}.description`,
              id as string
            );
          }
          if (typeof attr.formula !== "string") {
            pushIssue(
              issues,
              "Attribute.formula 必须为字符串",
              `${attrPath}.formula`,
              id as string
            );
          }
        });
      }
    });
  }

  if (objectIdDuplicates.size > 0) {
    const duplicateList = Array.from(objectIdDuplicates).join(", ");
    pushIssue(
      issues,
      `Object.id 存在重复：${duplicateList}`,
      "objects",
      undefined,
      "请确保每个对象 id 唯一"
    );
  }

  if (typeof positions !== "undefined") {
    if (!isObject(positions) || Array.isArray(positions)) {
      pushIssue(
        issues,
        "positions 必须为对象映射（{ [objectId]: {x,y} }）",
        "positions",
        undefined,
        "请删除该字段或提供位置映射"
      );
    } else {
      Object.entries(positions).forEach(([objectId, rawPos]) => {
        // Ignore unknown ids (forward-compat / partial layout exports).
        if (!objectIds.has(objectId)) return;

        const basePath = `positions.${objectId}`;
        if (!isObject(rawPos)) {
          pushIssue(
            issues,
            "positions[objectId] 必须为对象（{x,y}）",
            basePath,
            objectId,
            "请为该对象提供 { x: number, y: number }"
          );
          return;
        }

        if (!isFiniteNumber(rawPos.x)) {
          pushIssue(
            issues,
            "positions.x 必须为有限数字",
            `${basePath}.x`,
            objectId
          );
        }
        if (!isFiniteNumber(rawPos.y)) {
          pushIssue(
            issues,
            "positions.y 必须为有限数字",
            `${basePath}.y`,
            objectId
          );
        }
      });
    }
  }

  const relationshipIds = new Set<string>();
  const relationshipIdDuplicates = new Set<string>();

  if (Array.isArray(relationships)) {
    relationships.forEach((rel, index) => {
      const basePath = `relationships[${index}]`;
      if (!isObject(rel)) {
        pushIssue(issues, "Relationship 必须为对象", basePath);
        return;
      }

      const id = rel.id;
      const name = rel.name;
      const description = rel.description;
      const fromId = rel.fromId;
      const toId = rel.toId;
      const fromHandle = rel.fromHandle;
      const toHandle = rel.toHandle;
      const arrowType = rel.arrowType;
      const label = rel.label;
      const curvePoints = rel.curvePoints;

      if (typeof id !== "string" || id.trim().length === 0) {
        pushIssue(issues, "Relationship.id 必须为非空字符串", `${basePath}.id`);
      } else if (relationshipIds.has(id)) {
        relationshipIdDuplicates.add(id);
      } else {
        relationshipIds.add(id);
      }

      if (typeof name !== "string") {
        pushIssue(
          issues,
          "Relationship.name 必须为字符串",
          `${basePath}.name`,
          id as string
        );
      }

      if (typeof description !== "string") {
        pushIssue(
          issues,
          "Relationship.description 必须为字符串",
          `${basePath}.description`,
          id as string
        );
      }

      if (typeof fromId !== "string" || fromId.trim().length === 0) {
        pushIssue(
          issues,
          "Relationship.fromId 必须为非空字符串",
          `${basePath}.fromId`,
          id as string
        );
      } else if (!objectIds.has(fromId)) {
        pushIssue(
          issues,
          `fromId 引用不存在的对象 id "${fromId}"`,
          `${basePath}.fromId`,
          id as string,
          "修复 fromId 或补齐对象"
        );
      }

      if (typeof toId !== "string" || toId.trim().length === 0) {
        pushIssue(
          issues,
          "Relationship.toId 必须为非空字符串",
          `${basePath}.toId`,
          id as string
        );
      } else if (!objectIds.has(toId)) {
        pushIssue(
          issues,
          `toId 引用不存在的对象 id "${toId}"`,
          `${basePath}.toId`,
          id as string,
          "修复 toId 或补齐对象"
        );
      }

      if (typeof arrowType !== "string" || !isArrowType(arrowType)) {
        pushIssue(
          issues,
          `arrowType 必须为 ${allowedArrowTypes.join(" / ")}`,
          `${basePath}.arrowType`,
          id as string
        );
      }

      if (typeof fromHandle !== "undefined") {
        if (typeof fromHandle !== "string" || !isHandleLocation(fromHandle)) {
          pushIssue(
            issues,
            `fromHandle 必须为 ${allowedHandleLocations.join(" / ")}`,
            `${basePath}.fromHandle`,
            id as string
          );
        }
      }

      if (typeof toHandle !== "undefined") {
        if (typeof toHandle !== "string" || !isHandleLocation(toHandle)) {
          pushIssue(
            issues,
            `toHandle 必须为 ${allowedHandleLocations.join(" / ")}`,
            `${basePath}.toHandle`,
            id as string
          );
        }
      }

      if (typeof label !== "string") {
        pushIssue(
          issues,
          "Relationship.label 必须为字符串",
          `${basePath}.label`,
          id as string
        );
      }

      if (typeof curvePoints !== "undefined") {
        if (!Array.isArray(curvePoints)) {
          pushIssue(
            issues,
            "Relationship.curvePoints 必须为数组",
            `${basePath}.curvePoints`,
            id as string,
            "请删除该字段或提供控制点数组（最多 5 个）"
          );
        } else {
          if (curvePoints.length > 5) {
            pushIssue(
              issues,
              "Relationship.curvePoints 不能超过 5 个",
              `${basePath}.curvePoints`,
              id as string,
              "请删除多余控制点（最多 5 个）"
            );
          }

          curvePoints.forEach((point, pointIndex) => {
            const pointPath = `${basePath}.curvePoints[${pointIndex}]`;
            if (!isObject(point)) {
              pushIssue(issues, "curvePoint 必须为对象", pointPath, id as string);
              return;
            }

            if (!isFiniteNumber(point.x)) {
              pushIssue(
                issues,
                "curvePoint.x 必须为有限数字",
                `${pointPath}.x`,
                id as string
              );
            }
            if (!isFiniteNumber(point.y)) {
              pushIssue(
                issues,
                "curvePoint.y 必须为有限数字",
                `${pointPath}.y`,
                id as string
              );
            }
          });
        }
      }
    });
  }

  if (relationshipIdDuplicates.size > 0) {
    const duplicateList = Array.from(relationshipIdDuplicates).join(", ");
    pushIssue(
      issues,
      `Relationship.id 存在重复：${duplicateList}`,
      "relationships",
      undefined,
      "请确保每条关系 id 唯一"
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

export const coerceModel = (data: ModelData): ModelData => ({
  schemaVersion: data.schemaVersion ?? 1,
  objects: data.objects.map((obj) => ({
    id: obj.id,
    name: obj.name ?? "",
    description: obj.description ?? "",
    attributes: Array.isArray(obj.attributes)
      ? obj.attributes.map((attr) => ({
          name: attr?.name ?? "",
          description: attr?.description ?? "",
          formula: attr?.formula ?? "",
        }))
      : [],
  })),
  relationships: data.relationships.map((rel) => ({
    id: rel.id,
    name: rel.name ?? "",
    description: rel.description ?? "",
    fromId: rel.fromId ?? "",
    toId: rel.toId ?? "",
    fromHandle:
      typeof rel.fromHandle === "string" && isHandleLocation(rel.fromHandle)
        ? rel.fromHandle
        : "right",
    toHandle:
      typeof rel.toHandle === "string" && isHandleLocation(rel.toHandle)
        ? rel.toHandle
        : "left",
    arrowType: rel.arrowType ?? "single",
    label: rel.label ?? "",
    curvePoints: rel.curvePoints,
  })),
});
