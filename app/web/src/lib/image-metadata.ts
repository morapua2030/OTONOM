/**
 * Removes location and other personal metadata from uploaded images before they are stored (audit 2026-11-18, A3).
 *
 * Phone cameras write GPS coordinates, serial numbers and thumbnails into every photo. An approved photo of a client's
 * installation would otherwise publish the location of the client's home. No new dependency: the three accepted
 * formats are rewritten at the container level, and the image data itself is copied unchanged.
 *
 * - JPEG: APP1 (Exif, XMP), APP13 (IPTC) and COM segments are dropped. If the photo had an EXIF orientation, a minimal
 *   EXIF block carrying only that orientation is written back, so phone photos keep displaying the right way up.
 * - PNG: eXIf, tEXt, iTXt, zTXt and tIME chunks are dropped.
 * - WebP: EXIF and XMP chunks are dropped and the matching VP8X flags are cleared.
 *
 * Anything that does not parse as the declared format is returned unchanged; the type check runs separately.
 */
type Mime = 'image/png' | 'image/jpeg' | 'image/webp';

export function stripImageMetadata(data: Uint8Array, mime: Mime | string): Uint8Array {
  try {
    if (mime === 'image/jpeg') return stripJpeg(data);
    if (mime === 'image/png') return stripPng(data);
    if (mime === 'image/webp') return stripWebp(data);
  } catch {
    // A malformed container is left as it is; it is still subject to the type and size checks.
  }
  return data;
}

// ---------------------------------------------------------------------------------------------------- JPEG
function exifOrientation(seg: Uint8Array): number | null {
  // seg = the APP1 payload after the 2-byte length: "Exif\0\0" + TIFF
  if (seg.length < 14 || String.fromCharCode(...seg.subarray(0, 6)) !== 'Exif\0\0') return null;
  const t = seg.subarray(6);
  const le = t[0] === 0x49 && t[1] === 0x49;
  if (!le && !(t[0] === 0x4d && t[1] === 0x4d)) return null;
  const u16 = (o: number) => (le ? t[o] | (t[o + 1] << 8) : (t[o] << 8) | t[o + 1]);
  const u32 = (o: number) => (le ? (t[o] | (t[o + 1] << 8) | (t[o + 2] << 16) | (t[o + 3] << 24)) >>> 0 : ((t[o] << 24) | (t[o + 1] << 16) | (t[o + 2] << 8) | t[o + 3]) >>> 0);
  const ifd0 = u32(4);
  if (ifd0 + 2 > t.length) return null;
  const n = u16(ifd0);
  for (let i = 0; i < n; i++) {
    const e = ifd0 + 2 + i * 12;
    if (e + 12 > t.length) break;
    if (u16(e) === 0x0112 && u16(e + 2) === 3) {
      const v = u16(e + 8);
      return v >= 1 && v <= 8 ? v : null;
    }
  }
  return null;
}

/** A minimal APP1 segment: big-endian TIFF with one IFD0 entry, Orientation (0x0112, SHORT, 1 value). */
function orientationApp1(orientation: number): Uint8Array {
  const tiff = [0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  const payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
  const len = payload.length + 2;
  return Uint8Array.from([0xff, 0xe1, len >> 8, len & 0xff, ...payload]);
}

function stripJpeg(d: Uint8Array): Uint8Array {
  if (d[0] !== 0xff || d[1] !== 0xd8) return d;
  const keep: Uint8Array[] = [d.subarray(0, 2)];
  let orientation: number | null = null;
  let dropped = false;
  let p = 2;
  while (p + 4 <= d.length) {
    if (d[p] !== 0xff) return d; // not a marker where one is expected: leave the file alone
    const marker = d[p + 1];
    if (marker === 0xff) { p += 1; continue; } // fill byte
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { keep.push(d.subarray(p, p + 2)); p += 2; continue; }
    if (marker === 0xda || marker === 0xd9) { keep.push(d.subarray(p)); break; } // start of scan / end: copy the rest verbatim
    const len = (d[p + 2] << 8) | d[p + 3];
    if (len < 2 || p + 2 + len > d.length) return d;
    const seg = d.subarray(p, p + 2 + len);
    const payload = d.subarray(p + 4, p + 2 + len);
    if (marker === 0xe1) {
      orientation ??= exifOrientation(payload);
      dropped = true;
    } else if (marker === 0xed || marker === 0xfe) {
      dropped = true;
    } else {
      keep.push(seg); // APP0 JFIF, APP2 ICC, APP14 Adobe, DQT, SOF, DHT, DRI ... stay
    }
    p += 2 + len;
  }
  if (!dropped) return d;
  if (orientation && orientation !== 1) keep.splice(1, 0, orientationApp1(orientation));
  return concat(keep);
}

// ---------------------------------------------------------------------------------------------------- PNG
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_DROP = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);

function stripPng(d: Uint8Array): Uint8Array {
  if (!PNG_SIG.every((b, i) => d[i] === b)) return d;
  const keep: Uint8Array[] = [d.subarray(0, 8)];
  let dropped = false;
  let p = 8;
  while (p + 12 <= d.length) {
    const len = ((d[p] << 24) | (d[p + 1] << 16) | (d[p + 2] << 8) | d[p + 3]) >>> 0;
    const type = String.fromCharCode(d[p + 4], d[p + 5], d[p + 6], d[p + 7]);
    const end = p + 12 + len;
    if (end > d.length) return d;
    if (PNG_DROP.has(type)) dropped = true;
    else keep.push(d.subarray(p, end));
    p = end;
    if (type === 'IEND') break;
  }
  return dropped ? concat(keep) : d;
}

// ---------------------------------------------------------------------------------------------------- WebP
function stripWebp(d: Uint8Array): Uint8Array {
  const tag = (o: number) => String.fromCharCode(d[o], d[o + 1], d[o + 2], d[o + 3]);
  if (d.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WEBP') return d;
  const keep: Uint8Array[] = [];
  let dropped = false;
  let p = 12;
  while (p + 8 <= d.length) {
    const type = tag(p);
    const len = (d[p + 4] | (d[p + 5] << 8) | (d[p + 6] << 16) | (d[p + 7] << 24)) >>> 0;
    const end = p + 8 + len + (len % 2);
    if (p + 8 + len > d.length) return d;
    if (type === 'VP8X') {
      const c = Uint8Array.from(d.subarray(p, Math.min(end, d.length)));
      if (c[8] & 0x0c) dropped = true;
      c[8] &= ~(0x08 | 0x04); // clear the EXIF (bit 3) and XMP (bit 2) flags
      keep.push(c);
    } else if (type === 'EXIF' || type === 'XMP ') {
      dropped = true;
    } else {
      keep.push(d.subarray(p, Math.min(end, d.length)));
    }
    p = end;
  }
  if (!dropped) return d;
  const body = concat(keep);
  const out = new Uint8Array(12 + body.length);
  out.set(d.subarray(0, 12));
  const size = 4 + body.length;
  out[4] = size & 0xff; out[5] = (size >> 8) & 0xff; out[6] = (size >> 16) & 0xff; out[7] = (size >>> 24) & 0xff;
  out.set(body, 12);
  return out;
}

/** Strips metadata from an uploaded file in place (Payload's `req.file`) and keeps `size` in step with the bytes. */
export function cleanUploadedFile(file: { data?: Buffer; size?: number; mimetype?: string } | undefined | null): void {
  if (!file?.data) return;
  const clean = stripImageMetadata(file.data, file.mimetype ?? '');
  if (clean === file.data) return;
  file.data = Buffer.from(clean.buffer, clean.byteOffset, clean.byteLength);
  file.size = clean.byteLength;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of parts) { out.set(x, o); o += x.length; }
  return out;
}
