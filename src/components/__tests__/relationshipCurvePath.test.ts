import { describe, expect, it } from "vitest";
import { buildCatmullRomPath } from "../relationshipCurvePath";

describe("buildCatmullRomPath", () => {
  it("returns empty string when points are insufficient", () => {
    expect(buildCatmullRomPath([])).toBe("");
    expect(buildCatmullRomPath([{ x: 0, y: 0 }])).toBe("");
  });

  it("builds a deterministic single-segment path for two points", () => {
    const path = buildCatmullRomPath([
      { x: 0, y: 0 },
      { x: 60, y: 0 },
    ]);
    expect(path).toBe("M 0 0 C 10 0, 50 0, 60 0");
  });

  it("builds a multi-segment path for multiple points", () => {
    const path = buildCatmullRomPath([
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 120, y: 60 },
    ]);
    expect(path.startsWith("M 0 0 C")).toBe(true);
    expect(path).toContain(", 60 0");
    expect(path.endsWith(" 120 60")).toBe(true);
  });
});

