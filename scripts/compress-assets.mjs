import fg from 'fast-glob';
import fs from 'node:fs/promises';
import path from 'node:path';
import imagemin from 'imagemin';
import imageminOptipng from 'imagemin-optipng';
import imageminZopfli from 'imagemin-zopfli';
import imageminWebp from 'imagemin-webp';

const ROOT = process.cwd();

function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

async function processFile(file) {
  const src = await fs.readFile(file);
  const plugins = [imageminOptipng({ optimizationLevel: 3 }), imageminZopfli({ more: false })];
  const out = await imagemin.buffer(src, { plugins });
  if (!out || out.length >= src.length)
    return { file, saved: 0, from: src.length, to: out ? out.length : src.length };
  await fs.writeFile(file, out);
  return { file, saved: src.length - out.length, from: src.length, to: out.length };
}

async function maybeWriteWebp(file) {
  const lower = file.toLowerCase();
  const isRaster = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg');
  if (!isRaster) return null;
  const src = await fs.readFile(file);
  const webp = await imagemin.buffer(src, { plugins: [imageminWebp({ quality: 82 })] });
  const outPath = file.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  await fs.writeFile(outPath, webp);
  return { file: outPath, size: webp.length };
}

async function main() {
  const patterns = ['assets/**/*.{png,PNG,jpg,JPG,jpeg,JPEG}', 'screenshot.png'];
  const files = await fg(patterns, { dot: false, onlyFiles: true, unique: true });
  if (!files.length) {
    console.log('No PNG files found for optimization.');
    return;
  }
  let totalSaved = 0;
  let totalBefore = 0;
  for (const f of files) {
    try {
      const res = await processFile(path.resolve(ROOT, f));
      totalSaved += res.saved;
      totalBefore += res.from;
      const percent = res.saved ? ((res.saved / res.from) * 100).toFixed(1) : '0.0';
      console.log(`${f}: ${fmtBytes(res.from)} -> ${fmtBytes(res.to)} (-${percent}%)`);
      try {
        const w = await maybeWriteWebp(path.resolve(ROOT, f));
        if (w) console.log(`  ↳ webp: wrote ${path.relative(ROOT, w.file)} (${fmtBytes(w.size)})`);
      } catch (e) {
        console.warn('WEBP conversion failed for', f, e.message);
      }
    } catch (e) {
      console.warn('Failed to optimize', f, e.message);
    }
  }
  console.log(`\nSaved ${fmtBytes(totalSaved)} out of ${fmtBytes(totalBefore)} total.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
