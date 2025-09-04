import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, '_externos');
const DEST_DIR = path.join(ROOT, 'public', '_externos');
const ASSETS_SRC = path.join(ROOT, 'assets');
const ASSETS_DEST = path.join(ROOT, 'public', 'assets');

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
  // Копіюємо runtime‑асети до public/assets, щоб у проді були доступні за шляхами /assets/*
  try {
    await copyDir(ASSETS_SRC, ASSETS_DEST);
    console.log('Copied assets → public/assets');
  } catch (e) {
    console.warn('Skipping assets copy:', e.message);
  }
}

main();
