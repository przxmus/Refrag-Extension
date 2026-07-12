export type ReleaseType = "major" | "minor" | "patch" | "custom";

const SEMVER_PATTERN = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function nextVersion(
  currentVersion: string,
  releaseType: ReleaseType,
  customVersion = "",
): string {
  const current = currentVersion.match(SEMVER_PATTERN);
  if (!current) {
    throw new Error(`Current version must use x.y.z format: ${currentVersion}`);
  }

  if (releaseType === "custom") {
    const custom = customVersion.trim().match(SEMVER_PATTERN);
    if (!custom) {
      throw new Error("Custom version must use x.y.z format.");
    }
    return `${custom[1]}.${custom[2]}.${custom[3]}`;
  }

  const major = Number(current[1]);
  const minor = Number(current[2]);
  const patch = Number(current[3]);

  switch (releaseType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown release type: ${String(releaseType)}`);
  }
}

if (import.meta.main) {
  const [currentVersion, releaseType, customVersion = ""] = Bun.argv.slice(2);
  if (!currentVersion || !releaseType) {
    throw new Error(
      "Usage: bun scripts/next-version.ts <current> <major|minor|patch|custom> [custom]",
    );
  }
  console.log(
    nextVersion(currentVersion, releaseType as ReleaseType, customVersion),
  );
}
