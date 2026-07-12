# Refrag+

A Chrome extension that adds useful routine tools to [Refrag](https://play.refrag.gg/), including safe, configurable map and mod shuffling.

The extension adds a **Shuffle** action between **Delete** and **Review & Publish / Update**. It uses Refrag's existing editor, preserves the number of occurrences of every map and mod, and never changes segment durations.

## Features

- Shuffles maps and mods while preserving their original counts.
- Opens a routine when its card or title is selected.
- Keeps segment order, titles, completion settings, and durations unchanged.
- Prevents duplicate or previously used map/mod combinations when requested.
- Supports configurable repeat gaps for maps, mods, and combinations.
- Distinguishes hard constraints from soft preferences.
- Stores settings in browser sync storage.
- Blocks page interaction while changes are being applied.
- Returns to the top of the page when shuffling finishes.
- Can optionally publish or update the routine automatically.
- Does not call private Refrag APIs or request network permissions.

## Installation from GitHub Releases

1. Download the latest `refrag-plus-vX.Y.Z.zip` archive from **Releases**.
2. Extract it into a permanent directory. Do not select the ZIP file directly.
3. Open `brave://extensions` or `chrome://extensions`.
4. Enable **Developer mode**.
5. Select **Load unpacked**.
6. Choose the extracted directory containing `manifest.json`.
7. Reload any open Refrag routine editor page.

Beta archives are installed in the same way, but may contain unfinished changes.

### Updating

Download and extract the new release over the existing extension directory. Then open the browser's extensions page, press **Reload** on Refrag+, and refresh Refrag.

Browser store installation and automatic updates are not currently available.

## Usage

1. Open a routine you can edit at `https://play.refrag.gg/routines/*/edit`.
2. Open the extension popup to adjust shuffle rules, or keep the defaults.
3. Select **Shuffle** next to Refrag's review action.
4. Wait until the page becomes interactive again.
5. Review the result and publish it through Refrag.

The extension blocks interaction while it edits and saves segments so accidental clicks or scrolling cannot interrupt the process.

### Automatic publishing

**Publish after shuffling** is disabled by default. When enabled, a successful shuffle also selects:

- **Review & Publish** followed by **Publish**, or
- **Review & Update** followed by **Update Routine**.

Enable this only when you do not need to inspect the shuffled routine before publishing it.

## Settings

The popup provides controls for:

- unique and previously unseen map/mod combinations;
- minimum repeat gaps;
- mandatory changes at the same segment position;
- soft preferences for new or unique assignments;
- generation and search limits;
- console logging, selective saving, and automatic publishing.

Strict rules can be impossible for some routines. In that case, the extension stops without publishing and reports the problem in the browser console. Relax one or more constraints and try again.

## Privacy and permissions

Refrag+ requests only the browser `storage` permission. It uses it to synchronize settings between browser sessions.

The extension runs only on Refrag routine editor URLs, does not read unrelated pages, does not include analytics, and does not send data to external services.

## Development

The project uses TypeScript, Bun, esbuild, ESLint, Prettier, and Bun Test.

```sh
bun install
bun run check
```

`bun run check` runs type checking, linting, tests, and a production build. The unpacked extension is generated in `dist/`; generated files are intentionally not committed.

## Release automation

- Pull requests run formatting checks, type checking, linting, tests, and a production build. The same validation can be started manually.
- Commits to `main` or `master` create beta prereleases with release notes generated from commit messages since the previous beta.
- The manually triggered **Release** workflow increments the latest stable version as a major, minor, or patch release, or accepts a custom semantic version. It creates a stable ZIP release with notes generated from commits since the previous stable tag.

## License

Licensed under the [MIT License](LICENSE). You may use, modify, distribute, and sell the software, including as part of proprietary projects, subject to the license notice and warranty disclaimer.
