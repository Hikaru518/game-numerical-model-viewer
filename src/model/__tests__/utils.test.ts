import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyAttribute, createId } from "../utils";

describe("createId", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "uuid-123",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses randomUUID when available", () => {
    expect(createId("obj")).toBe("obj_uuid-123");
  });
});

describe("createEmptyAttribute", () => {
  it("creates an empty attribute shape", () => {
    expect(createEmptyAttribute()).toEqual({
      name: "",
      description: "",
      formula: "",
    });
  });
});
