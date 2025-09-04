import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'assets');
const DEST = path.join(ROOT, 'public', 'assets');

async function rimraf(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {}
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else if (e.isFile()) await fs.copyFile(s, d);
  }
}

async function main() {
  try {
    await fs.access(SRC);
  } catch {
    console.warn('No assets/ directory to sync. Skipping.');
    return;
  }
  await rimraf(DEST);
  await copyDir(SRC, DEST);
  console.log('Synced assets → public/assets');
}

main().catch((e) => {
  console.error('Failed to sync public assets:', e);
  process.exit(1);
});
