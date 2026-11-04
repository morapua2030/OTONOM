# Pixel diff of two screenshot folders: per file, size match, number of differing pixels and their bounding box.
# Usage: python pixdiff.py <reference-folder> <screenshot-folder> > diff.json
# Exit 2 when a folder is missing and 1 when no screenshot could be compared, so an empty comparison never passes.
# Screenshots without a reference counterpart are listed on stderr (new screenshots are allowed).
import sys, os, json
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]
for label, folder in (('reference', a), ('screenshot', b)):
    if not os.path.isdir(folder):
        print(f'pixdiff: {label} folder not found: {folder}', file=sys.stderr)
        sys.exit(2)
res = []
skipped = []
for f in sorted(os.listdir(b)):
    if not f.endswith('.png'): continue
    if not os.path.exists(os.path.join(a, f)):
        skipped.append(f); continue
    A = Image.open(os.path.join(a, f)).convert('RGB'); B = Image.open(os.path.join(b, f)).convert('RGB')
    if A.size != B.size:
        res.append({'file': f, 'size': [A.size, B.size]}); continue
    d = ImageChops.difference(A, B)
    bbox = d.getbbox()
    n = sum(1 for p in d.getdata() if p != (0, 0, 0)) if bbox else 0
    res.append({'file': f, 'size': A.size, 'diffPixels': n, 'bbox': bbox})
print(json.dumps(res))
print(f'pixdiff: compared {len(res)}, without a reference {len(skipped)}' + (': ' + ', '.join(skipped) if skipped else ''), file=sys.stderr)
if not res:
    print('pixdiff: nothing was compared', file=sys.stderr)
    sys.exit(1)
