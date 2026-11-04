# Pixel diff of two screenshot folders: per file, size match, number of differing pixels and their bounding box.
import sys, os, json
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]
res = []
for f in sorted(os.listdir(b)):
    if not f.endswith('.png') or not os.path.exists(os.path.join(a, f)): continue
    A = Image.open(os.path.join(a, f)).convert('RGB'); B = Image.open(os.path.join(b, f)).convert('RGB')
    if A.size != B.size:
        res.append({'file': f, 'size': [A.size, B.size]}); continue
    d = ImageChops.difference(A, B)
    bbox = d.getbbox()
    n = sum(1 for p in d.getdata() if p != (0, 0, 0)) if bbox else 0
    res.append({'file': f, 'size': A.size, 'diffPixels': n, 'bbox': bbox})
print(json.dumps(res))
