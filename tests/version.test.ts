import { describe, expect, test } from "bun:test";
import { nextVersion } from "../scripts/next-version";

describe("nextVersion", () => {
  test.each([
    ["major", "2.0.0"],
    ["minor", "1.3.0"],
    ["patch", "1.2.4"],
  ] as const)("increments %s releases", (releaseType, expected) => {
    expect(nextVersion("v1.2.3", releaseType)).toBe(expected);
  });

  test("uses a custom semantic version", () => {
    expect(nextVersion("1.2.3", "custom", "v4.5.6")).toBe("4.5.6");
  });

  test("rejects invalid current and custom versions", () => {
    expect(() => nextVersion("latest", "patch")).toThrow("Current version");
    expect(() => nextVersion("1.2.3", "custom", "1.2")).toThrow(
      "Custom version",
    );
  });
});
