import json, sys, statistics as st
def load(p):
    d = json.load(open(p, encoding='utf8')); out = {}
    for r in d['pages']:
        o = out.setdefault(r['page'], {'cold': [], 'warm': []}); o[r['run']].append(r)
    return out
b, a = load(sys.argv[1]), load(sys.argv[2])
print('| Page | Transfer cold (KB) | Fonts cold (KB) | JS (KB) | LCP cold median (ms) | LCP warm (ms) |')
print('|---|---|---|---|---|---|')
for page in b:
    def m(x, k): return st.median([r[k] for r in x['cold']])
    B, A = b[page], a.get(page)
    if not A: continue
    print(f"| `{page}` | {m(B,'transferKB'):.1f} → {m(A,'transferKB'):.1f} | {m(B,'fontKB'):.1f} → {m(A,'fontKB'):.1f} | {m(B,'scriptKB'):.1f} → {m(A,'scriptKB'):.1f} | {m(B,'lcpMs'):.0f} → {m(A,'lcpMs'):.0f} (runs {[r['lcpMs'] for r in B['cold']]} → {[r['lcpMs'] for r in A['cold']]}) | {B['warm'][0]['lcpMs']} → {A['warm'][0]['lcpMs']} |")
