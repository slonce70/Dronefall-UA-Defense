import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

function fmt(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(2) + ' MB';
}

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) yield full;
  }
}

const files = [];
for await (const f of walk(DIST)) {
  const st = await fs.stat(f);
  files.push({ file: path.relative(DIST, f), bytes: st.size });
}
files.sort((a, b) => b.bytes - a.bytes);
console.log('Bundle size report (dist):');
for (const f of files) console.log(`${fmt(f.bytes).padStart(10)}  ${f.file}`);

