// dist-artifact の出力を 1 つの HTML 断片（Artifact の本文）にまとめる
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const dir = 'dist-artifact/assets';
const files = readdirSync(dir);
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n');
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n');
const extra = `
/* Artifact 版: 外枠が上下の安全領域を確保するので、上端の余白は控えめに */
:root { color-scheme: dark; }
html, body { background: #07070c; }
.top { padding-top: 8px; }
`;
const out = `<title>ひとつぶ宇宙</title>
<meta name="theme-color" content="#07070C">
<style>
${css}
${extra}
</style>
<div id="app"></div>
<script type="module">
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`;
writeFileSync('dist-artifact/hitotsubu-uchu.html', out);
console.log('size', (out.length / 1024).toFixed(0), 'KB');
