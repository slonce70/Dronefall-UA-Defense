import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(DIST, 'precache-manifest.json');

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

function toWebPath(p) {
  const rel = path.relative(DIST, p).split(path.sep).join('/');
  return '/' + rel;
}

async function main() {
  const files = [];
  for await (const f of walk(DIST)) {
    const name = path.basename(f);
    if (name === 'sw.js') continue;
    if (name === 'precache-manifest.json') continue;
    if (name.endsWith('.map')) continue; // не критично для офлайна
    files.push(toWebPath(f));
  }
  await fs.writeFile(OUT, JSON.stringify(files, null, 2) + '\n');
  console.log(`precache-manifest.json: ${files.length} entries`);
}

main().catch((e) => {
  console.error('Failed to generate precache manifest:', e);
  process.exit(1);
});
