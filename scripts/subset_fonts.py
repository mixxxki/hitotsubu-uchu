# M PLUS 1p をゲーム内で使う文字だけに絞った woff2 を作る（要: pip install fonttools brotli）
# 文言を追加したら `python scripts/subset_fonts.py` を実行し直す。
import glob, os, re, io
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.merge import Merger

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
used = set(range(0x20, 0x7f))
for pat in ['src/**/*.ts', 'src/**/*.css', 'index.html']:
    for f in glob.glob(os.path.join(root, pat), recursive=True):
        if f.endswith('fonts.css'):
            continue
        used.update(ord(c) for c in open(f, encoding='utf-8').read())
used = {c for c in used if c >= 0x20}

def ranges_of(css_block):
    m = re.search(r'unicode-range:\s*([^;]+);', css_block)
    out = []
    for x in m.group(1).split(','):
        x = x.strip()[2:]
        a, _, b = x.partition('-')
        out.append((int(a, 16), int(b or a, 16)))
    return out

for weight in ['400', '700']:
    css = open(os.path.join(root, f'node_modules/@fontsource/m-plus-1p/{weight}.css'), encoding='utf-8').read()
    parts = []
    for block in re.findall(r'@font-face\s*{[^}]*}', css):
        rs = ranges_of(block)
        chars = [c for c in used if any(a <= c <= b for a, b in rs)]
        if not chars:
            continue
        fname = re.search(r'files/([^)]+?\.woff2)', block).group(1)
        font = TTFont(os.path.join(root, 'node_modules/@fontsource/m-plus-1p/files', fname))
        opts = subset.Options()
        opts.flavor = None
        opts.layout_features = ['*']
        opts.name_IDs = ['*']
        opts.notdef_outline = True
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=chars)
        sub.subset(font)
        font.flavor = None
        buf = io.BytesIO()
        font.save(buf)
        buf.seek(0)
        tmp = os.path.join('/tmp', f'mp_{weight}_{len(parts)}.ttf')
        open(tmp, 'wb').write(buf.getvalue())
        parts.append(tmp)
    merged = Merger().merge(parts)
    merged.flavor = 'woff2'
    out = os.path.join(root, f'src/assets/fonts/mplus1p-{weight}.woff2')
    merged.save(out)
    print(weight, len(parts), 'parts ->', os.path.getsize(out), 'bytes')
