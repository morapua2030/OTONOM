// Reads the cmap of WOFF2 files (Node built-in brotli) and prints each file's code-point coverage as a compact
// unicode-range. Usage: node woff2-cmap.mjs <file.woff2>...  Output JSON {file: {count, range}}.
import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import path from 'node:path';

const KNOWN = ['cmap','head','hhea','hmtx','maxp','name','OS/2','post','cvt ','fpgm','glyf','loca','prep','CFF ','VORG','EBDT','EBLC','gasp','hdmx','kern','LTSH','PCLT','VDMX','vhea','vmtx','BASE','GDEF','GPOS','GSUB','EBSC','JSTF','MATH','CBDT','CBLC','COLR','CPAL','SVG ','sbix','acnt','avar','bdat','bloc','bsln','cvar','fdsc','feat','fmtx','fvar','gvar','hsty','just','lcar','mort','morx','opbd','prop','trak','Zapf','Silf','Glat','Gloc','Feat','Sill'];

function parse(buf) {
  let o = 0;
  const u32 = () => { const v = buf.readUInt32BE(o); o += 4; return v; };
  const u16 = () => { const v = buf.readUInt16BE(o); o += 2; return v; };
  const b128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const b = buf[o++]; v = (v << 7) | (b & 0x7f); if (!(b & 0x80)) return v >>> 0; } throw new Error('bad b128'); };
  if (u32() !== 0x774f4632) throw new Error('not woff2');
  u32(); // flavor
  u32(); // length
  const numTables = u16(); o = 48;
  const totalCompressedSize = buf.readUInt32BE(20);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[o++];
    const tagIdx = flags & 0x3f;
    let tag;
    if (tagIdx === 63) { tag = buf.toString('latin1', o, o + 4); o += 4; } else tag = KNOWN[tagIdx];
    const xform = (flags >> 6) & 3;
    const origLength = b128();
    const transformed = (tag === 'glyf' || tag === 'loca') ? xform === 0 : xform !== 0;
    const transformLength = transformed ? b128() : origLength;
    tables.push({ tag, length: transformLength });
  }
  const data = brotliDecompressSync(buf.subarray(o, o + totalCompressedSize));
  let off = 0;
  for (const t of tables) { t.offset = off; off += t.length; }
  const cmap = tables.find((t) => t.tag === 'cmap');
  return data.subarray(cmap.offset, cmap.offset + cmap.length);
}

function codepoints(cmap) {
  const n = cmap.readUInt16BE(2);
  const cps = new Set();
  for (let i = 0; i < n; i++) {
    const sub = cmap.readUInt32BE(4 + i * 8 + 4);
    const fmt = cmap.readUInt16BE(sub);
    if (fmt === 4) {
      const segX2 = cmap.readUInt16BE(sub + 6);
      const ends = sub + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ro = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = cmap.readUInt16BE(ends + s * 2), start = cmap.readUInt16BE(starts + s * 2);
        const delta = cmap.readInt16BE(deltas + s * 2), rangeOff = cmap.readUInt16BE(ro + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let g;
          if (rangeOff === 0) g = (c + delta) & 0xffff;
          else { const gi = ro + s * 2 + rangeOff + (c - start) * 2; g = cmap.readUInt16BE(gi); if (g) g = (g + delta) & 0xffff; }
          if (g) cps.add(c);
        }
      }
    } else if (fmt === 12) {
      const groups = cmap.readUInt32BE(sub + 12);
      for (let gI = 0; gI < groups; gI++) {
        const b = sub + 16 + gI * 12; const s = cmap.readUInt32BE(b), e = cmap.readUInt32BE(b + 4);
        for (let c = s; c <= e; c++) cps.add(c);
      }
    }
  }
  return [...cps].sort((a, b) => a - b);
}

const hex = (c) => c.toString(16).toUpperCase().padStart(4, '0');
function toRange(cps) {
  const out = []; let s = cps[0], p = cps[0];
  for (const c of [...cps.slice(1), -1]) {
    if (c === p + 1) { p = c; continue; }
    out.push(s === p ? `U+${hex(s)}` : `U+${hex(s)}-${hex(p)}`); s = p = c;
  }
  return out.join(', ');
}

const res = {};
for (const f of process.argv.slice(2)) { const cps = codepoints(parse(readFileSync(f))); res[path.basename(f)] = { count: cps.length, range: toRange(cps) }; }
console.log(JSON.stringify(res, null, 1));
