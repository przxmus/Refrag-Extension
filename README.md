# Refrag Routine Shuffler

Chrome/Brave extension for `https://play.refrag.gg/routines/*/edit`.

It adds **Shuffle** between **Delete** and **Review & Publish** for routines the current user can edit. Maps and mods are shuffled independently while their counts and every segment duration stay unchanged. The toolbar popup exposes combination, repeat-gap, preference, and runtime settings. Settings sync through the browser profile.

## Development

Requires [Bun](https://bun.sh/).

```sh
bun install
bun run check
```

The production-ready unpacked extension is generated in `dist/`. Source code is TypeScript; `dist/` is intentionally not committed.

## Install locally in Brave

1. Open `brave://extensions` and enable **Developer mode**.
2. Choose **Load unpacked**.
3. Run `bun run build` and select the generated `dist` folder.
4. Reload an open Refrag routine edit page.

The extension has no network permissions and does not access Refrag APIs. It only requests browser storage access for shuffle settings.

## Releases

- Pull requests run formatting, lint, type checks, tests, and a production build.
- Every commit to `main` or `master` creates a prerelease ZIP with generated release notes.
- The **Release build** workflow is started manually with a semantic version and creates a stable GitHub Release with generated notes.
