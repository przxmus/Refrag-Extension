import { rm, mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await build({
  entryPoints: {
    content: join(root, "src/content/index.ts"),
    "routine-links": join(root, "src/content/routine-links.ts"),
    popup: join(root, "src/popup/index.ts"),
  },
  outdir: dist,
  bundle: true,
  format: "iife",
  target: "chrome120",
  minify: true,
  sourcemap: false,
});

for (const file of [
  "manifest.json",
  "src/popup/popup.html",
  "src/popup/popup.css",
]) {
  await copyFile(join(root, file), join(dist, file.split("/").at(-1)!));
}

const manifestPath = join(dist, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
  version: string;
};
const version = process.env.EXTENSION_VERSION;
if (version) manifest.version = version.replace(/^v/, "").split("-")[0]!;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
