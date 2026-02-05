import { describe, expect, it } from "vitest";
import { coerceModel, validateForExport, validateModel } from "../validation";
import type { ModelData } from "../types";

const baseModel: ModelData = {
  schemaVersion: 1,
  objects: [
    { id: "obj_a", name: "对象A", description: "", attributes: [] },
    { id: "obj_b", name: "对象B", description: "", attributes: [] },
  ],
  relationships: [
    {
      id: "rel_1",
      name: "关系1",
      description: "",
      fromId: "obj_a",
      toId: "obj_b",
      arrowType: "single",
      label: "",
    },
  ],
};

describe("validateModel", () => {
  it("accepts valid model", () => {
    const result = validateModel(baseModel);
    expect(result.ok).toBe(true);
  });

  it("rejects non-object root", () => {
    const result = validateModel("invalid" as unknown);
    expect(result.ok).toBe(false);
    expect(result.issues[0].message).toContain("JSON 顶层必须是对象");
  });

  it("flags duplicate object ids", () => {
    const result = validateModel({
      ...baseModel,
      objects: [
        { id: "dup", name: "对象A", description: "", attributes: [] },
        { id: "dup", name: "对象B", description: "", attributes: [] },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes("Object.id 存在重复"))).toBe(
      true
    );
  });

  it("flags missing object references and invalid arrowType", () => {
    const result = validateModel({
      ...baseModel,
      relationships: [
        {
          ...baseModel.relationships[0],
          fromId: "missing",
          arrowType: "invalid" as "single",
        },
      ],
    });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) => issue.message.includes('fromId 引用不存在的对象 id "missing"'))
    ).toBe(true);
    expect(result.issues.some((issue) => issue.message.includes("arrowType 必须为"))).toBe(
      true
    );
  });

  it("flags invalid attribute fields", () => {
    const result = validateModel({
      ...baseModel,
      objects: [
        {
          id: "obj_bad",
          name: "对象",
          description: "",
          attributes: [{ name: 123, description: "", formula: "" } as unknown],
        },
      ],
      relationships: [],
    });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) => issue.message.includes("Attribute.name 必须为字符串"))
    ).toBe(true);
  });
});

describe("validateForExport", () => {
  it("requires non-empty object names", () => {
    const result = validateForExport({
      ...baseModel,
      objects: [{ ...baseModel.objects[0], name: " " }],
      relationships: [],
    });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) => issue.message.includes("Object.name 不能为空"))
    ).toBe(true);
  });
});

describe("coerceModel", () => {
  it("fills missing fields with defaults", () => {
    const coerced = coerceModel(
      {
        schemaVersion: 1,
        objects: [
          {
            id: "obj_1",
            name: undefined,
            description: undefined,
            attributes: undefined,
          },
        ],
        relationships: [
          {
            id: "rel_1",
            name: undefined,
            description: undefined,
            fromId: undefined,
            toId: undefined,
            arrowType: undefined,
            label: undefined,
          },
        ],
      } as unknown as ModelData
    );

    expect(coerced.objects[0]).toEqual({
      id: "obj_1",
      name: "",
      description: "",
      attributes: [],
    });
    expect(coerced.relationships[0]).toEqual({
      id: "rel_1",
      name: "",
      description: "",
      fromId: "",
      toId: "",
      arrowType: "single",
      label: "",
    });
  });
});
