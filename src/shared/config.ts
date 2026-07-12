export interface ShuffleConfig {
  combinations: {
    preventDuplicatesInResult: boolean;
    preventAnyOriginalCombination: boolean;
    minimumRepeatGap: number;
    requireDifferentAtSamePosition: boolean;
    preferNewCombinations: boolean;
    preferUniqueCombinations: boolean;
  };
  maps: MapConfig;
  mods: RepeatConfig;
  runtime: {
    durationAssignment: DurationAssignment;
    saveOnlyChangedSegments: boolean;
    autoPublish: boolean;
    generationAttempts: number;
    validPlansToCompare: number;
    maxSearchNodesPerAttempt: number;
    logPlan: boolean;
  };
}

export type DurationAssignment = "position" | "map" | "mod";

interface RepeatConfig {
  minimumRepeatGap: number;
  requireDifferentAtSamePosition: boolean;
  preferDifferentAtSamePosition: boolean;
}

interface MapConfig extends RepeatConfig {
  groupTogether: boolean;
}

export type ConfigPath =
  | `combinations.${keyof ShuffleConfig["combinations"]}`
  | `maps.${keyof MapConfig}`
  | `mods.${keyof RepeatConfig}`
  | `runtime.${keyof ShuffleConfig["runtime"]}`;

export interface ConfigField {
  path: ConfigPath;
  group: "Combinations" | "Maps" | "Mods" | "Advanced";
  type: "boolean" | "integer" | "select";
  label: string;
  description: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
}

export const STORAGE_KEY = "shuffleConfig";

export const DEFAULT_CONFIG: ShuffleConfig = {
  combinations: {
    preventDuplicatesInResult: true,
    preventAnyOriginalCombination: true,
    minimumRepeatGap: 0,
    requireDifferentAtSamePosition: true,
    preferNewCombinations: true,
    preferUniqueCombinations: true,
  },
  maps: {
    groupTogether: false,
    minimumRepeatGap: 1,
    requireDifferentAtSamePosition: false,
    preferDifferentAtSamePosition: true,
  },
  mods: {
    minimumRepeatGap: 1,
    requireDifferentAtSamePosition: false,
    preferDifferentAtSamePosition: true,
  },
  runtime: {
    durationAssignment: "position",
    saveOnlyChangedSegments: true,
    autoPublish: false,
    generationAttempts: 200,
    validPlansToCompare: 20,
    maxSearchNodesPerAttempt: 50000,
    logPlan: true,
  },
};

export const CONFIG_SCHEMA: ConfigField[] = [
  {
    path: "runtime.durationAssignment",
    group: "Advanced",
    type: "select",
    label: "Keep duration with",
    description:
      "Keep each duration at its position, or move it with the assigned map or mod.",
    options: [
      { value: "position", label: "Segment position" },
      { value: "map", label: "Map" },
      { value: "mod", label: "Mod" },
    ],
  },
  {
    path: "combinations.preventDuplicatesInResult",
    group: "Combinations",
    type: "boolean",
    label: "No duplicate combinations",
    description: "Each map and mod pair can occur at most once.",
  },
  {
    path: "combinations.preventAnyOriginalCombination",
    group: "Combinations",
    type: "boolean",
    label: "Exclude original combinations",
    description: "Do not reuse any pair from the current routine.",
  },
  {
    path: "combinations.minimumRepeatGap",
    group: "Combinations",
    type: "integer",
    min: 0,
    max: 12,
    label: "Minimum combination gap",
    description: "0 disables the rule; 1 prevents adjacent repeats.",
  },
  {
    path: "combinations.requireDifferentAtSamePosition",
    group: "Combinations",
    type: "boolean",
    label: "Change every combination",
    description: "Every segment must receive a different pair.",
  },
  {
    path: "combinations.preferNewCombinations",
    group: "Combinations",
    type: "boolean",
    label: "Prefer new combinations",
    description: "Penalize original pairs when they are allowed.",
  },
  {
    path: "combinations.preferUniqueCombinations",
    group: "Combinations",
    type: "boolean",
    label: "Prefer unique combinations",
    description: "Minimize duplicate pairs when they are allowed.",
  },
  {
    path: "maps.groupTogether",
    group: "Maps",
    type: "boolean",
    label: "Group segments by map",
    description:
      "Place each map in one continuous block to reduce loading screens. Overrides the minimum map gap.",
  },
  {
    path: "maps.minimumRepeatGap",
    group: "Maps",
    type: "integer",
    min: 0,
    max: 12,
    label: "Minimum map gap",
    description: "1 prevents the same map in adjacent segments.",
  },
  {
    path: "maps.requireDifferentAtSamePosition",
    group: "Maps",
    type: "boolean",
    label: "Change every map",
    description: "Require a different map in every segment.",
  },
  {
    path: "maps.preferDifferentAtSamePosition",
    group: "Maps",
    type: "boolean",
    label: "Prefer map changes",
    description: "Try to change maps without making it mandatory.",
  },
  {
    path: "mods.minimumRepeatGap",
    group: "Mods",
    type: "integer",
    min: 0,
    max: 12,
    label: "Minimum mod gap",
    description: "1 prevents the same mod in adjacent segments.",
  },
  {
    path: "mods.requireDifferentAtSamePosition",
    group: "Mods",
    type: "boolean",
    label: "Change every mod",
    description: "Require a different mod in every segment.",
  },
  {
    path: "mods.preferDifferentAtSamePosition",
    group: "Mods",
    type: "boolean",
    label: "Prefer mod changes",
    description: "Try to change mods without making it mandatory.",
  },
  {
    path: "runtime.saveOnlyChangedSegments",
    group: "Advanced",
    type: "boolean",
    label: "Save changed segments only",
    description: "Skip segments whose pair stays unchanged.",
  },
  {
    path: "runtime.autoPublish",
    group: "Advanced",
    type: "boolean",
    label: "Publish after shuffling",
    description:
      "Automatically confirm Publish or Update Routine when finished.",
  },
  {
    path: "runtime.generationAttempts",
    group: "Advanced",
    type: "integer",
    min: 1,
    max: 2000,
    label: "Generation attempts",
    description: "More attempts help with strict constraints.",
  },
  {
    path: "runtime.validPlansToCompare",
    group: "Advanced",
    type: "integer",
    min: 1,
    max: 100,
    label: "Plans to compare",
    description: "Compare more valid plans for soft preferences.",
  },
  {
    path: "runtime.maxSearchNodesPerAttempt",
    group: "Advanced",
    type: "integer",
    min: 100,
    max: 1000000,
    label: "Search limit",
    description: "Maximum work performed in one attempt.",
  },
  {
    path: "runtime.logPlan",
    group: "Advanced",
    type: "boolean",
    label: "Log plan to console",
    description: "Print configuration and assignments in DevTools.",
  },
];

export const cloneConfig = (config: ShuffleConfig): ShuffleConfig =>
  structuredClone(config);

export function validateConfig(config: ShuffleConfig): void {
  for (const field of CONFIG_SCHEMA) {
    const value = getConfigValue(config, field.path);
    if (field.type === "boolean" && typeof value !== "boolean")
      throw new Error(`${field.path} must be true or false.`);
    if (
      field.type === "select" &&
      !field.options?.some((option) => option.value === value)
    )
      throw new Error(`${field.path} has an invalid value.`);
    if (
      field.type === "integer" &&
      (!Number.isInteger(value) ||
        Number(value) < field.min! ||
        Number(value) > field.max!)
    ) {
      throw new Error(
        `${field.path} must be an integer from ${field.min} to ${field.max}.`,
      );
    }
  }
}

export function getConfigValue(
  config: ShuffleConfig,
  path: ConfigPath,
): boolean | number | string {
  const [group, key] = path.split(".") as [keyof ShuffleConfig, string];
  return (
    config[group] as unknown as Record<string, boolean | number | string>
  )[key]!;
}

export function setConfigValue(
  config: ShuffleConfig,
  path: ConfigPath,
  value: boolean | number | string,
): void {
  const [group, key] = path.split(".") as [keyof ShuffleConfig, string];
  (config[group] as unknown as Record<string, boolean | number | string>)[key] =
    value;
}

export async function loadConfig(): Promise<ShuffleConfig> {
  const syncStorage = globalThis.chrome?.storage?.sync;
  const stored = syncStorage
    ? (((await syncStorage.get(STORAGE_KEY))[STORAGE_KEY] as
        Partial<ShuffleConfig> | undefined) ?? undefined)
    : undefined;
  const config = cloneConfig(DEFAULT_CONFIG);
  if (stored) {
    for (const group of Object.keys(config) as (keyof ShuffleConfig)[])
      Object.assign(config[group], stored[group]);
  }
  validateConfig(config);
  return config;
}

export async function saveConfig(config: ShuffleConfig): Promise<void> {
  validateConfig(config);
  const syncStorage = globalThis.chrome?.storage?.sync;
  if (!syncStorage)
    throw new Error("Extension storage is unavailable. Reload the extension.");
  await syncStorage.set({ [STORAGE_KEY]: config });
}
