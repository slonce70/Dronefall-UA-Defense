import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, '_externos');
const DEST_DIR = path.join(ROOT, 'public', '_externos');

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
    await copyDir(SRC_DIR, DEST_DIR);
    console.log('Copied _externos → public/_externos');
  } catch (e) {
    console.warn('Skipping externals copy:', e.message);
  }
}

main();
