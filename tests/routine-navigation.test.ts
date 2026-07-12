import { describe, expect, test } from "bun:test";
import {
  isRoutineListPath,
  routineViewUrl,
} from "../src/content/routine-navigation";

describe("routineViewUrl", () => {
  test("removes the edit suffix without changing the routine id", () => {
    expect(
      routineViewUrl("https://play.refrag.gg/routines/routine-123/edit"),
    ).toBe("https://play.refrag.gg/routines/routine-123");
  });

  test("preserves query parameters", () => {
    expect(
      routineViewUrl("https://play.refrag.gg/routines/abc/edit?source=mine"),
    ).toBe("https://play.refrag.gg/routines/abc?source=mine");
  });

  test("ignores non-editor URLs", () => {
    expect(
      routineViewUrl("https://play.refrag.gg/routines/abc"),
    ).toBeUndefined();
  });
});

describe("isRoutineListPath", () => {
  test.each(["/routines", "/routines/"])("accepts %s", (path) => {
    expect(isRoutineListPath(path)).toBeTrue();
  });

  test("rejects routine detail paths", () => {
    expect(isRoutineListPath("/routines/abc")).toBeFalse();
  });
});
