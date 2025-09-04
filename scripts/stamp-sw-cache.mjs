import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const ROOT = process.cwd();
  const DIST = path.join(ROOT, 'dist');
  const SW_PATH = path.join(DIST, 'sw.js');

  let sw;
  try {
    sw = await fs.readFile(SW_PATH, 'utf8');
  } catch (e) {
    console.warn('[stamp-sw-cache] dist/sw.js not found, skipping');
    return;
  }
  let pkg;
  try {
    pkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'));
  } catch {
    pkg = { version: '0.0.0' };
  }
  const ver = (pkg && pkg.version) || '0.0.0';
  const ts = Date.now().toString(36).slice(-6);
  const newName = `dronefall-runtime-v${ver}-${ts}`;

  const re = /const\s+CACHE_NAME\s*=\s*['"][^'"]+['"];?/;
  if (!re.test(sw)) {
    console.warn('[stamp-sw-cache] Could not find CACHE_NAME in sw.js; leaving file unchanged');
    return;
  }
  const out = sw.replace(re, `const CACHE_NAME = '${newName}';`);
  await fs.writeFile(SW_PATH, out);
  console.log(`[stamp-sw-cache] CACHE_NAME -> ${newName}`);
}

main().catch((e) => {
  console.error('[stamp-sw-cache] failed:', e);
  process.exit(1);
});

