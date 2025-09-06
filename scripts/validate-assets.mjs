import fg from 'fast-glob';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIRS = ['src', 'index.html', 'style.css'];
const ASSETS_DIRS = [path.join(ROOT, 'assets'), path.join(ROOT, 'public', 'assets')];

function uniq(arr) {
  return Array.from(new Set(arr));
}

async function collectFiles() {
  const patterns = SRC_DIRS.map((p) => (p.endsWith('.html') || p.endsWith('.css') ? p : `${p}/**/*.{js,ts,jsm,html,css}`));
  const files = await fg(patterns, { dot: false, onlyFiles: true, unique: true });
  return files;
}

function extractAssetRefs(content) {
  const refs = [];
  const regexes = [
    /['"`](?:\/)?assets\/[A-Za-z0-9_\-./]+['"`]/g, // '/assets/...'
    /url\((?:\s*)['"]?(?:\/)?assets\/[A-Za-z0-9_\-./]+['"]?(?:\s*)\)/g, // url(/assets/...)
  ];
  for (const re of regexes) {
    let m;
    while ((m = re.exec(content))) {
      const raw = m[0];
      const clean = raw.replace(/^url\(|\)$/g, '').replace(/['"`]/g, '').trim();
      refs.push(clean);
    }
  }
  return uniq(refs);
}

async function existsInAssets(p) {
  const rel = p.replace(/^\//, '');
  for (const dir of ASSETS_DIRS) {
    try {
      await fs.access(path.join(dir, rel.replace(/^assets\//, '')));
      return true;
    } catch {}
  }
  return false;
}

async function main() {
  const files = await collectFiles();
  const problems = [];
  for (const f of files) {
    const content = await fs.readFile(f, 'utf8');
    const refs = extractAssetRefs(content);
    for (const r of refs) {
      const ok = await existsInAssets(r);
      if (!ok) problems.push({ file: f, ref: r });
    }
  }
  if (problems.length) {
    console.log(`Missing asset references: ${problems.length}`);
    for (const p of problems) console.log(`  ${p.file}: ${p.ref}`);
    process.exit(2);
  } else {
    console.log('Asset references OK');
  }
}

main().catch((e) => {
  console.error('validate-assets failed:', e);
  process.exit(1);
});

