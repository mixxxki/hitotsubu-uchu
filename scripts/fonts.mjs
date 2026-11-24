// src/fonts.css を生成する（JetBrains Mono は使う範囲のサブセットだけ、M PLUS 1p は自前サブセット）。
// 文言を追加したら `python scripts/subset_fonts.py` → `npm run fonts` を実行し直すこと。
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|html|css)$/.test(f) && !p.endsWith('fonts.css')) out.push(p);
  }
  return out;
}

const used = new Set();
for (const f of [...walk('src'), 'index.html']) for (const ch of readFileSync(f, 'utf8')) used.add(ch.codePointAt(0));
// 数字・英字・記号は常に含める
for (let c = 0x20; c < 0x7f; c++) used.add(c);

function parseRange(r) {
  return r.split(',').map((x) => {
    const m = x.trim().replace(/^U\+/i, '');
    if (m.includes('?')) return [parseInt(m.replace(/\?/g, '0'), 16), parseInt(m.replace(/\?/g, 'f'), 16)];
    const [a, b] = m.split('-');
    return [parseInt(a, 16), parseInt(b ?? a, 16)];
  });
}

// 本文（M PLUS 1p）は scripts/subset_fonts.py で使う文字だけに絞った woff2 を使う
const sources = [['@fontsource/jetbrains-mono', ['400', '500']]];
let out = '/* scripts/fonts.mjs で自動生成。ゲーム内で使う文字を含むサブセットだけを読み込む */\n';
let kept = 0;
let total = 0;
for (const [pkg, weights] of sources) {
  for (const w of weights) {
    const css = readFileSync(`node_modules/${pkg}/${w}.css`, 'utf8');
    for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
      total++;
      const ur = /unicode-range:\s*([^;]+);/.exec(block);
      const ranges = ur ? parseRange(ur[1]) : [[0, 0x10ffff]];
      const hit = [...used].some((c) => ranges.some(([a, b]) => c >= a && c <= b));
      if (!hit) continue;
      kept++;
      out += block
        .replace(/url\(\.\/files\/([^)]+?)\.woff2\) format\('woff2'\)(, url\([^)]+\) format\('woff'\))?/, `url(../node_modules/${pkg}/files/$1.woff2) format('woff2')`) + '\n';
    }
  }
}
for (const w of ['400', '700']) {
  out += `@font-face {\n  font-family: 'M PLUS 1p';\n  font-style: normal;\n  font-display: swap;\n  font-weight: ${w};\n  src: url(./assets/fonts/mplus1p-${w}.woff2) format('woff2');\n}\n`;
}
writeFileSync('src/fonts.css', out);
console.log(`fonts.css: ${kept}/${total} @font-face を採用（使用文字 ${used.size}）`);
