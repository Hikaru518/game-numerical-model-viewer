import { describe, expect, it } from "vitest";
import { autoLayout, nextGridPosition } from "../layout";
import type { ObjectEntity } from "../types";

const makeObject = (id: string): ObjectEntity => ({
  id,
  name: id,
  description: "",
  attributes: [],
});

describe("autoLayout", () => {
  it("produces deterministic grid positions", () => {
    const objects = ["a", "b", "c", "d"].map(makeObject);
    const positions = autoLayout(objects);

    expect(positions.a).toEqual({ x: 80, y: 80 });
    expect(positions.b).toEqual({ x: 360, y: 80 });
    expect(positions.c).toEqual({ x: 80, y: 260 });
  });
});

describe("nextGridPosition", () => {
  it("returns expected position for index", () => {
    expect(nextGridPosition(3)).toEqual({ x: 80, y: 260 });
  });
});
