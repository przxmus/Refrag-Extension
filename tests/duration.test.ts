import { describe, expect, test } from "bun:test";
import { durationInMinutes } from "../src/content/duration";

describe("durationInMinutes", () => {
  test("reads current Refrag card durations", () => {
    expect(durationInMinutes("1 minutes")).toBe(1);
    expect(durationInMinutes("2 minutes")).toBe(2);
  });

  test("accepts singular and abbreviated durations", () => {
    expect(durationInMinutes("1 minute")).toBe(1);
    expect(durationInMinutes("2.5 min")).toBe(2.5);
  });

  test("rejects unknown duration formats", () => {
    expect(() => durationInMinutes("120 seconds")).toThrow();
  });
});
