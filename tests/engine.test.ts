import { describe, expect, test } from "bun:test";
import { cloneConfig, DEFAULT_CONFIG } from "../src/shared/config";
import type { Segment } from "../src/shared/types";
import {
  generateShuffle,
  normalize,
  validateAssignment,
} from "../src/shuffle/engine";

const segments: Segment[] = [
  { number: 1, map: "Mirage", mod: "Prefire", duration: "5m" },
  { number: 2, map: "Inferno", mod: "Crossfire", duration: "7m" },
  { number: 3, map: "Ancient", mod: "Clutch", duration: "4m" },
  { number: 4, map: "Nuke", mod: "Spray", duration: "6m" },
  { number: 5, map: "Mirage", mod: "Crossfire", duration: "8m" },
  { number: 6, map: "Inferno", mod: "Clutch", duration: "3m" },
  { number: 7, map: "Ancient", mod: "Spray", duration: "5m" },
  { number: 8, map: "Nuke", mod: "Prefire", duration: "4m" },
];

const deterministic = (): number => 0.25;

describe("generateShuffle", () => {
  test("keeps automatic publishing disabled by default", () => {
    expect(DEFAULT_CONFIG.runtime.autoPublish).toBeFalse();
  });

  test("preserves map, mod, segment and duration data", () => {
    const result = generateShuffle(
      segments,
      cloneConfig(DEFAULT_CONFIG),
      deterministic,
    );
    expect(result.map((item) => item.duration)).toEqual(
      segments.map((item) => item.duration),
    );
    expect(result.map((item) => normalize(item.map)).sort()).toEqual(
      segments.map((item) => normalize(item.map)).sort(),
    );
    expect(result.map((item) => normalize(item.mod)).sort()).toEqual(
      segments.map((item) => normalize(item.mod)).sort(),
    );
    expect(() =>
      validateAssignment(segments, result, DEFAULT_CONFIG),
    ).not.toThrow();
  });

  test("rejects impossible repeat gaps before searching", () => {
    const config = cloneConfig(DEFAULT_CONFIG);
    config.maps.minimumRepeatGap = 7;
    expect(() => generateShuffle(segments, config, deterministic)).toThrow(
      "occurs too often",
    );
  });

  test("allows original and repeated pairs when configured", () => {
    const config = cloneConfig(DEFAULT_CONFIG);
    config.combinations.preventAnyOriginalCombination = false;
    config.combinations.preventDuplicatesInResult = false;
    config.combinations.requireDifferentAtSamePosition = false;
    config.maps.minimumRepeatGap = 0;
    config.mods.minimumRepeatGap = 0;
    const result = generateShuffle(segments, config, deterministic);
    expect(result).toHaveLength(segments.length);
    expect(() => validateAssignment(segments, result, config)).not.toThrow();
  });
});
