import fs from 'node:fs/promises';
import path from 'node:path';

async function findHashedWallpaper(distDir) {
  const assetsDir = path.join(distDir, 'assets');
  const files = await fs.readdir(assetsDir);
  const cand = files.find((f) => /^wallpaper-.*\.png$/i.test(f));
  return cand ? `/assets/${cand}` : null;
}

async function main() {
  const ROOT = process.cwd();
  const DIST = path.join(ROOT, 'dist');
  const INDEX = path.join(DIST, 'index.html');
  let html;
  try {
    html = await fs.readFile(INDEX, 'utf8');
  } catch (e) {
    console.warn('[patch-preload] dist/index.html not found, skipping');
    return;
  }
  const hashed = await findHashedWallpaper(DIST);
  if (!hashed) {
    console.warn('[patch-preload] hashed wallpaper not found in dist/assets, skipping');
    return;
  }
  // Replace only in preload link with as="image"
  const re = /(\<link[^>]*rel=["']preload["'][^>]*as=["']image["'][^>]*href=["'])(\.?\/assets\/wallpaper\.png)(["'][^>]*\>)/i;
  if (!re.test(html)) {
    console.warn('[patch-preload] preload link for wallpaper.png not found; no change');
    return;
  }
  const out = html.replace(re, `$1${hashed}$3`);
  await fs.writeFile(INDEX, out);
  console.log(`[patch-preload] Updated preload href -> ${hashed}`);
}

main().catch((e) => {
  console.error('[patch-preload] failed:', e);
  process.exit(1);
});
