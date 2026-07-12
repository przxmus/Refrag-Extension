import type { ShuffleConfig } from "../shared/config";
import { validateConfig } from "../shared/config";
import type { Segment } from "../shared/types";

type Random = () => number;
interface PoolItem {
  value: string;
  key: string;
  count: number;
}

export const normalize = (value: string): string =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
const pairKey = (map: string, mod: string): string =>
  `${normalize(map)}::${normalize(mod)}`;

function assignDurations(
  original: Segment[],
  result: Segment[],
  assignment: ShuffleConfig["runtime"]["durationAssignment"],
): void {
  if (assignment === "position") return;
  const durations = new Map<string, string[]>();
  for (const segment of original) {
    const key = normalize(segment[assignment]);
    durations.set(key, [...(durations.get(key) ?? []), segment.duration]);
  }
  for (const segment of result) {
    const available = durations.get(normalize(segment[assignment]));
    if (!available?.length)
      throw new Error(`Could not assign a duration by ${assignment}.`);
    segment.duration = available.shift()!;
  }
}

function pool(values: string[]): PoolItem[] {
  const items = new Map<string, PoolItem>();
  for (const value of values) {
    const key = normalize(value);
    const item = items.get(key);
    if (item) item.count++;
    else items.set(key, { value, key, count: 1 });
  }
  return [...items.values()];
}

function withinGap(values: string[], value: string, gap: number): boolean {
  return (
    gap > 0 &&
    values
      .slice(-gap)
      .some((existing) => normalize(existing) === normalize(value))
  );
}

function sameMultiset(left: string[], right: string[]): boolean {
  const count = (values: string[]) =>
    values.reduce<Map<string, number>>(
      (all, value) =>
        all.set(normalize(value), (all.get(normalize(value)) ?? 0) + 1),
      new Map(),
    );
  const a = count(left),
    b = count(right);
  return (
    a.size === b.size && [...a].every(([key, value]) => b.get(key) === value)
  );
}

function assertGapCapacity(
  items: PoolItem[],
  gap: number,
  total: number,
  label: string,
): void {
  if (!gap) return;
  const max = Math.floor((total + gap) / (gap + 1));
  const impossible = items.find((item) => item.count > max);
  if (impossible)
    throw new Error(
      `${label} “${impossible.value}” occurs too often for a minimum gap of ${gap}.`,
    );
}

function penalty(
  original: Segment,
  map: string,
  mod: string,
  originalPairs: Set<string>,
  config: ShuffleConfig,
): number {
  let value = 0;
  if (
    config.maps.preferDifferentAtSamePosition &&
    normalize(original.map) === normalize(map)
  )
    value += 10;
  if (
    config.mods.preferDifferentAtSamePosition &&
    normalize(original.mod) === normalize(mod)
  )
    value += 10;
  if (
    config.combinations.preferNewCombinations &&
    originalPairs.has(pairKey(map, mod))
  )
    value += 100;
  return value;
}

export function validateAssignment(
  original: Segment[],
  result: Segment[],
  config: ShuffleConfig,
): void {
  if (result.length !== original.length)
    throw new Error("Generated assignment has an invalid length.");
  if (
    !sameMultiset(
      original.map((x) => x.map),
      result.map((x) => x.map),
    )
  )
    throw new Error("Generated assignment changed the map pool.");
  if (
    !sameMultiset(
      original.map((x) => x.mod),
      result.map((x) => x.mod),
    )
  )
    throw new Error("Generated assignment changed the mod pool.");
  const originalPairs = new Set(original.map((x) => pairKey(x.map, x.mod)));
  const used = new Set<string>();
  const maps: string[] = [],
    mods: string[] = [],
    pairs: string[] = [];
  result.forEach((assigned, index) => {
    const before = original[index]!;
    const key = pairKey(assigned.map, assigned.mod);
    if (
      config.combinations.preventAnyOriginalCombination &&
      originalPairs.has(key)
    )
      throw new Error(
        `Original combination returned at segment ${before.number}.`,
      );
    if (config.combinations.preventDuplicatesInResult && used.has(key))
      throw new Error(`Duplicate combination at segment ${before.number}.`);
    if (
      config.combinations.requireDifferentAtSamePosition &&
      key === pairKey(before.map, before.mod)
    )
      throw new Error(
        `Combination did not change at segment ${before.number}.`,
      );
    if (
      config.maps.requireDifferentAtSamePosition &&
      normalize(assigned.map) === normalize(before.map)
    )
      throw new Error(`Map did not change at segment ${before.number}.`);
    if (
      config.mods.requireDifferentAtSamePosition &&
      normalize(assigned.mod) === normalize(before.mod)
    )
      throw new Error(`Mod did not change at segment ${before.number}.`);
    if (withinGap(maps, assigned.map, config.maps.minimumRepeatGap))
      throw new Error(`Map gap failed at segment ${before.number}.`);
    if (withinGap(mods, assigned.mod, config.mods.minimumRepeatGap))
      throw new Error(`Mod gap failed at segment ${before.number}.`);
    if (withinGap(pairs, key, config.combinations.minimumRepeatGap))
      throw new Error(`Combination gap failed at segment ${before.number}.`);
    used.add(key);
    maps.push(assigned.map);
    mods.push(assigned.mod);
    pairs.push(key);
  });
}

export function generateShuffle(
  segments: Segment[],
  config: ShuffleConfig,
  random: Random = Math.random,
): Segment[] {
  validateConfig(config);
  if (segments.length < 2)
    throw new Error("At least two segments are required to shuffle a routine.");
  const maps = pool(segments.map((x) => x.map));
  const mods = pool(segments.map((x) => x.mod));
  assertGapCapacity(maps, config.maps.minimumRepeatGap, segments.length, "Map");
  assertGapCapacity(mods, config.mods.minimumRepeatGap, segments.length, "Mod");
  const originalPairs = new Set(segments.map((x) => pairKey(x.map, x.mod)));
  let best: Segment[] | undefined;
  let bestScore = Infinity;
  let valid = 0;

  for (
    let attempt = 0;
    attempt < config.runtime.generationAttempts;
    attempt++
  ) {
    const result: Segment[] = [];
    const used = new Map<string, number>();
    let nodes = 0;
    const search = (position: number): boolean => {
      if (++nodes > config.runtime.maxSearchNodesPerAttempt) return false;
      if (position === segments.length) return true;
      const before = segments[position]!;
      const choices = maps
        .flatMap((map) => mods.map((mod) => ({ map, mod })))
        .filter(({ map, mod }) => {
          if (!map.count || !mod.count) return false;
          const key = pairKey(map.value, mod.value);
          if (
            config.combinations.preventAnyOriginalCombination &&
            originalPairs.has(key)
          )
            return false;
          if (config.combinations.preventDuplicatesInResult && used.has(key))
            return false;
          if (
            config.combinations.requireDifferentAtSamePosition &&
            key === pairKey(before.map, before.mod)
          )
            return false;
          if (
            config.maps.requireDifferentAtSamePosition &&
            map.key === normalize(before.map)
          )
            return false;
          if (
            config.mods.requireDifferentAtSamePosition &&
            mod.key === normalize(before.mod)
          )
            return false;
          if (
            withinGap(
              result.map((x) => x.map),
              map.value,
              config.maps.minimumRepeatGap,
            )
          )
            return false;
          if (
            withinGap(
              result.map((x) => x.mod),
              mod.value,
              config.mods.minimumRepeatGap,
            )
          )
            return false;
          if (
            withinGap(
              result.map((x) => pairKey(x.map, x.mod)),
              key,
              config.combinations.minimumRepeatGap,
            )
          )
            return false;
          return true;
        })
        .map((choice) => ({
          ...choice,
          score:
            penalty(
              before,
              choice.map.value,
              choice.mod.value,
              originalPairs,
              config,
            ) + random(),
        }))
        .sort((a, b) => a.score - b.score);
      for (const choice of choices) {
        const key = pairKey(choice.map.value, choice.mod.value);
        choice.map.count--;
        choice.mod.count--;
        used.set(key, (used.get(key) ?? 0) + 1);
        result.push({
          ...before,
          map: choice.map.value,
          mod: choice.mod.value,
        });
        if (search(position + 1)) return true;
        result.pop();
        choice.map.count++;
        choice.mod.count++;
        const count = used.get(key)! - 1;
        if (count) used.set(key, count);
        else used.delete(key);
      }
      return false;
    };
    if (!search(0)) continue;
    assignDurations(segments, result, config.runtime.durationAssignment);
    validateAssignment(segments, result, config);
    valid++;
    const pairCounts = result.reduce<Map<string, number>>(
      (all, x) =>
        all.set(
          pairKey(x.map, x.mod),
          (all.get(pairKey(x.map, x.mod)) ?? 0) + 1,
        ),
      new Map(),
    );
    const duplicatePenalty = config.combinations.preferUniqueCombinations
      ? [...pairCounts.values()].reduce(
          (sum, count) => sum + Math.max(0, count - 1) * 50,
          0,
        )
      : 0;
    const score = result.reduce(
      (sum, x, i) =>
        sum + penalty(segments[i]!, x.map, x.mod, originalPairs, config),
      duplicatePenalty,
    );
    if (score < bestScore) {
      best = [...result];
      bestScore = score;
    }
    if (!score || valid >= config.runtime.validPlansToCompare) break;
  }
  if (!best)
    throw new Error(
      "No valid shuffle exists for these settings. Relax one or more constraints and try again.",
    );
  return best;
}
