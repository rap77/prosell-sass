#!/usr/bin/env node
/**
 * Re-export placeholder PNGs to ~540px WebP for the catalog card.
 *
 * Input : apps/web/public/placeholders/placeholder-*.png
 * Output: apps/web/public/placeholders/placeholder-*.webp
 *
 * Why: 1.3 MB PNGs are absurd for a 270px display. WebP @ 540px (2× retina)
 *      brings them to ~20-40 KB. The catalog's <Image> component further
 *      negotiates AVIF/WebP at request time and resizes to the slot.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLACEHOLDER_DIR = join(__dirname, "..", "public", "placeholders");

const MAX_DIM = 540; // 2× the typical 270px display size.

async function convertOne(pngPath) {
  const buf = await readFile(pngPath);
  const out = await sharp(buf)
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const targetPath = pngPath.replace(/\.png$/, ".webp");
  await writeFile(targetPath, out);
  console.log(
    `${basename(pngPath)}: ${(buf.length / 1024).toFixed(0)} KB → ${basename(targetPath)}: ${(out.length / 1024).toFixed(0)} KB`,
  );
}

async function main() {
  const entries = await readdir(PLACEHOLDER_DIR);
  const pngs = entries.filter((f) => extname(f) === ".png");
  for (const f of pngs) await convertOne(join(PLACEHOLDER_DIR, f));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
