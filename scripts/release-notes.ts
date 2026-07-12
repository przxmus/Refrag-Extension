export interface Commit {
  hash: string;
  subject: string;
}

export function parseGitLog(log: string): Commit[] {
  return log
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf("\t");
      if (separator === -1) {
        throw new Error(`Unexpected git log entry: ${line}`);
      }

      return {
        hash: line.slice(0, separator),
        subject: line.slice(separator + 1),
      };
    });
}

export function renderReleaseNotes(commits: Commit[]): string {
  if (commits.length === 0) return "No user-facing changes in this release.\n";

  return [
    "## Changes",
    "",
    ...commits.map(({ hash, subject }) => `- ${subject} (\`${hash}\`)`),
    "",
  ].join("\n");
}

export function gitLog(previousRef: string, targetRef: string): string {
  const revision = previousRef ? `${previousRef}..${targetRef}` : targetRef;
  const result = Bun.spawnSync([
    "git",
    "log",
    "--no-merges",
    "--format=%h%x09%s",
    revision,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString().trim() || "git log failed");
  }

  return result.stdout.toString();
}

if (import.meta.main) {
  const [previousRef = "", targetRef = "HEAD"] = Bun.argv.slice(2);
  process.stdout.write(
    renderReleaseNotes(parseGitLog(gitLog(previousRef, targetRef))),
  );
}
