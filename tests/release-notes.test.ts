import { describe, expect, test } from "bun:test";
import { parseGitLog, renderReleaseNotes } from "../scripts/release-notes";

describe("release notes", () => {
  test("renders every commit as a Markdown list", () => {
    const commits = parseGitLog(
      "a1b2c3d\tfeat: add shuffle mode\n4e5f6a7\tfix: preserve settings\n",
    );

    expect(renderReleaseNotes(commits)).toBe(
      "## Changes\n\n- feat: add shuffle mode (`a1b2c3d`)\n- fix: preserve settings (`4e5f6a7`)\n",
    );
  });

  test("provides useful notes when the range has no commits", () => {
    expect(renderReleaseNotes([])).toBe(
      "No user-facing changes in this release.\n",
    );
  });

  test("rejects malformed git log entries", () => {
    expect(() => parseGitLog("missing separator")).toThrow(
      "Unexpected git log entry",
    );
  });
});
