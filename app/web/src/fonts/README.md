# Self-hosted fonts (DR-104)

This folder keeps the **masters** (unchanged since DR-104) and the licences. Since D8-C v5 (DR-113) the site serves
derived copies from `public/fonts/` through hand-written `@font-face` rules in `src/app/(site)/v2.css` (the main stylesheet) (same family
names, stacks and metric-matched fallbacks that `next/font/local` generated before). No font is preloaded: preloading
the LCP heading face was measured against the v4 baseline and reverted (owner rule, 2026-11-04). Everything stays on
the site origin: no request to a font provider; the CSP stays `font-src 'self'`.
All three families are licensed under the SIL Open Font License 1.1 (full text in the `OFL-*.txt` files).

| File | Source package | SHA-256 |
|---|---|---|
| `dm-serif-display-latin-400-normal.woff2` | `@fontsource/dm-serif-display@5.3.0` | `fdf61e20fd2c0108e0ea28da4daca0035205b4b7fc031a3974b865b704de160a` |
| `ibm-plex-sans-arabic-arabic-400-normal.woff2` | `@fontsource/ibm-plex-sans-arabic@5.3.0` | `6010e7fd0dce5d527583951750728cbe3c895efbd16aa0f809ab8c824878c9d8` |
| `ibm-plex-sans-arabic-arabic-500-normal.woff2` | `@fontsource/ibm-plex-sans-arabic@5.3.0` | `90aef64fea9794f232332e907d45810ab268d1a11721340025eba2a2cdb36d5c` |
| `ibm-plex-sans-arabic-arabic-600-normal.woff2` | `@fontsource/ibm-plex-sans-arabic@5.3.0` | `16734a5adb27b0f363e566cbbeacec480da0dc0baa19c8f0053251c2e2bc0eac` |
| `ibm-plex-sans-arabic-arabic-700-normal.woff2` | `@fontsource/ibm-plex-sans-arabic@5.3.0` | `04c730b4292731ccedadd5bd80756124364ae4923895145d9cd7b1f28e443de1` |
| `ibm-plex-sans-arabic-latin-400-normal.woff2` | `@fontsource/ibm-plex-sans-arabic@5.3.0` | `9ed8dcb02e6c7246de4c120295fafa39a7bb73085f4951a4524a07dc911069f2` |
| `ibm-plex-sans-arabic-latin-500-normal.woff2` | `@fontsource/ibm-plex-sans-arabic@5.3.0` | `be6a3b2e37f3ad67aa822a55ce356d28c416331c97530a1ec076c2118240ca2d` |
| `ibm-plex-sans-arabic-latin-600-normal.woff2` | `@fontsource/ibm-plex-sans-arabic@5.3.0` | `63f4757271e403f7baec0862f284ffaa4560ea6096ba9fe8bc6e585ca656e724` |
| `ibm-plex-sans-arabic-latin-700-normal.woff2` | `@fontsource/ibm-plex-sans-arabic@5.3.0` | `ae2d59f91ecf9f7ed279e4a1fc1a9da8170fb0ce5b9152917a8f759033f5777c` |
| `inter-latin-wght-normal.woff2` | `@fontsource-variable/inter@5.3.0` | `3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62` |

## Served files (`public/fonts/`)

File names end with the first 10 hex digits of the file's SHA-256, so they are cached as immutable (`next.config.mjs`).

| Served file | Derived from | How |
|---|---|---|
| `ibm-plex-sans-arabic-arabic-{400,500,600,700}.<hash>.woff2` | `ibm-plex-sans-arabic-arabic-*-normal.woff2` | subset to the Arabic block (below) |
| `ibm-plex-sans-arabic-latin-{400,500,600,700}.<hash>.woff2` | `ibm-plex-sans-arabic-latin-*-normal.woff2` | byte-identical copy |
| `inter-latin-wght.<hash>.woff2` | `inter-latin-wght-normal.woff2` | byte-identical copy |
| `dm-serif-display-latin-400.<hash>.woff2` | `dm-serif-display-latin-400-normal.woff2` | byte-identical copy |

Arabic subset (fontTools 4.68, brotli 1.2; every OpenType layout feature and all glyphs reachable from the kept
characters are kept, so shaping is unchanged). It drops the Arabic Supplement/Extended-A letters (U+0750-077F,
U+08A0-08FF) and the legacy presentation-form code points (U+FB50-FDFF, U+FE70-FEFC), which no site page uses
(D8-C v5 scan of every public route); such a character would fall back to the next font in the stack:

```
pyftsubset ibm-plex-sans-arabic-arabic-<w>-normal.woff2 --unicodes="U+0000,U+000D,U+0020,U+00A0,U+0600-06FF,U+2010"   --layout-features='*' --name-IDs='*' --name-languages='*' --notdef-outline --flavor=woff2 --output-file=<out>.woff2
```

| Served Arabic file | SHA-256 | Bytes (master → served) |
|---|---|---|
| `ibm-plex-sans-arabic-arabic-400.2f4f939130.woff2` | `2f4f939130ab7aa335feab43d376381b8bf98aaf05f835187ad575ecb7f16912` | 42,848 → 28,996 |
| `ibm-plex-sans-arabic-arabic-500.97ad2e28ec.woff2` | `97ad2e28ec241f2b086e0f88794b5bba01540188ee2005af096be9022052079a` | 45,296 → 30,640 |
| `ibm-plex-sans-arabic-arabic-600.c85c0519ce.woff2` | `c85c0519ce3d6d046e12de358e3bb61fa683601a1884604f16cbdc2dfab998df` | 45,688 → 31,112 |
| `ibm-plex-sans-arabic-arabic-700.f86cb892ee.woff2` | `f86cb892ee89da5aec1575880d55c91d1dd6ecd98bb5e9cd46e02ec524bd7fa1` | 44,280 → 30,140 |
