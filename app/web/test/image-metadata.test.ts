// Uploaded images must not keep location or other personal metadata (audit 2026-11-18, finding A3-01).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { cleanUploadedFile, stripImageMetadata } from '../src/lib/image-metadata.ts';

const bytes = (...parts: Array<number[] | Uint8Array | string>) =>
  Buffer.concat(parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'latin1') : Buffer.from(p))));
const has = (hay: Uint8Array, needle: number[] | string) => Buffer.from(hay).includes(typeof needle === 'string' ? Buffer.from(needle, 'latin1') : Buffer.from(needle));
const seg = (marker: number, payload: Uint8Array) => bytes([0xff, marker, (payload.length + 2) >> 8, (payload.length + 2) & 0xff], payload);

/** Little-endian EXIF: IFD0 = Orientation (6) + GPS pointer; GPS IFD = N 31°2'30", E 30°28'12"; a camera serial in IFD0. */
function exifWithGps(orientation = 6): Uint8Array {
  const t = Buffer.alloc(160);
  t.write('II', 0, 'latin1'); t.writeUInt16LE(42, 2); t.writeUInt32LE(8, 4);
  t.writeUInt16LE(3, 8);
  const entry = (o: number, tag: number, type: number, count: number, value: number) => { t.writeUInt16LE(tag, o); t.writeUInt16LE(type, o + 2); t.writeUInt32LE(count, o + 4); t.writeUInt32LE(value, o + 8); };
  entry(10, 0x0112, 3, 1, orientation);
  entry(22, 0xa431, 2, 10, 140); // BodySerialNumber -> "SN12345678"
  entry(34, 0x8825, 4, 1, 50); // GPS IFD at 50
  t.writeUInt32LE(0, 46);
  t.writeUInt16LE(2, 50);
  entry(52, 0x0001, 2, 2, 0x4e); // 'N'
  entry(64, 0x0002, 5, 3, 100);
  t.writeUInt32LE(0, 76);
  [[31, 1], [2, 1], [3000, 100]].forEach(([n, d], i) => { t.writeUInt32LE(n, 100 + i * 8); t.writeUInt32LE(d, 104 + i * 8); });
  t.write('SN12345678', 140, 'latin1');
  return bytes('Exif\0\0', t);
}
const SCAN = bytes([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00], [0x12, 0x34, 0x56, 0x78, 0x9a], [0xff, 0xd9]);
function jpeg(withMeta: boolean, orientation = 6) {
  return bytes(
    [0xff, 0xd8],
    seg(0xe0, bytes('JFIF\0', [1, 1, 0, 0, 1, 0, 1, 0, 0])),
    ...(withMeta
      ? [seg(0xe1, exifWithGps(orientation)), seg(0xe1, bytes('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta><exif:GPSLatitude>31,2.5N</exif:GPSLatitude></x:xmpmeta>')), seg(0xed, bytes('Photoshop 3.0\0IPTC owner')), seg(0xfe, bytes('taken at the client home'))]
      : []),
    seg(0xdb, Uint8Array.from({ length: 65 }, (_, i) => i)),
    SCAN,
  );
}

test('JPEG: GPS, serial, XMP, IPTC and comments are removed; orientation and image data are kept', () => {
  const input = jpeg(true);
  const out = stripImageMetadata(input, 'image/jpeg');
  assert.ok(has(input, [0x25, 0x88]) && has(input, 'SN12345678') && has(input, 'GPSLatitude'));
  assert.equal(has(out, [0x25, 0x88]), false, 'GPS IFD pointer (0x8825) must be gone');
  assert.equal(has(out, [0x88, 0x25]), false);
  assert.equal(has(out, 'SN12345678'), false, 'camera serial must be gone');
  assert.equal(has(out, 'GPSLatitude'), false, 'XMP must be gone');
  assert.equal(has(out, 'IPTC owner'), false);
  assert.equal(has(out, 'client home'), false);
  assert.deepEqual([...out.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  assert.ok(Buffer.from(out).subarray(-SCAN.length).equals(SCAN), 'scan data is copied unchanged');
  assert.ok(has(out, 'JFIF'));
  // the minimal EXIF keeps the orientation (big-endian TIFF, tag 0x0112 = 6)
  assert.ok(has(out, [0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x06]));
});

test('JPEG without metadata, or with orientation 1, gets no EXIF block', () => {
  assert.equal(Buffer.from(stripImageMetadata(jpeg(false), 'image/jpeg')).equals(jpeg(false)), true);
  const out = stripImageMetadata(jpeg(true, 1), 'image/jpeg');
  assert.equal(has(out, 'Exif'), false);
});

const crcless = (type: string, data: Uint8Array) => bytes([0, 0, (data.length >> 8) & 0xff, data.length & 0xff], type, data, [0, 0, 0, 0]);
test('PNG: eXIf and text chunks are removed, image chunks kept in order', () => {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const png = bytes(sig, crcless('IHDR', new Uint8Array(13)), crcless('tEXt', bytes('Location\0Damanhour')), crcless('eXIf', exifWithGps()), crcless('iTXt', bytes('Author\0\0\0\0\0owner')), crcless('IDAT', bytes([1, 2, 3])), crcless('IEND', new Uint8Array(0)));
  const out = stripImageMetadata(png, 'image/png');
  assert.equal(has(out, 'Damanhour'), false);
  assert.equal(has(out, 'eXIf'), false);
  assert.equal(has(out, 'iTXt'), false);
  assert.ok(has(out, 'IHDR') && has(out, 'IDAT') && has(out, 'IEND'));
  assert.equal(out.length, 8 + 25 + 15 + 12);
});

const riffChunk = (type: string, data: Uint8Array) => {
  const len = Buffer.alloc(4); len.writeUInt32LE(data.length, 0);
  return bytes(type, len, data, data.length % 2 ? [0] : []);
};
test('WebP: EXIF and XMP chunks are removed, VP8X flags cleared, RIFF size updated', () => {
  const vp8x = new Uint8Array(10); vp8x[0] = 0x08 | 0x04;
  const body = bytes('WEBP', riffChunk('VP8X', vp8x), riffChunk('VP8 ', bytes([9, 9, 9, 9])), riffChunk('EXIF', exifWithGps()), riffChunk('XMP ', bytes('<x:xmpmeta>GPS</x:xmpmeta>')));
  const size = Buffer.alloc(4); size.writeUInt32LE(body.length, 0);
  const webp = bytes('RIFF', size, body);
  const out = Buffer.from(stripImageMetadata(webp, 'image/webp'));
  assert.equal(out.includes(Buffer.from('EXIF')), false);
  assert.equal(out.includes(Buffer.from('XMP ')), false);
  assert.equal(out.readUInt32LE(4), out.length - 8, 'RIFF size matches the file');
  assert.equal(out[20] & 0x0c, 0, 'VP8X EXIF/XMP flags cleared');
  assert.ok(out.includes(Buffer.from('VP8 ')));
});

test('data that is not the declared format is returned unchanged', () => {
  const junk = bytes('<html><script>alert(1)</script></html>');
  for (const mime of ['image/jpeg', 'image/png', 'image/webp', 'text/html']) assert.equal(stripImageMetadata(junk, mime), junk);
});

test('cleanUploadedFile replaces the upload bytes and size in place', () => {
  const input = Buffer.from(jpeg(true));
  const file = { data: input, size: input.length, mimetype: 'image/jpeg' };
  cleanUploadedFile(file);
  assert.equal(has(file.data, [0x25, 0x88]), false, 'the file handed to storage has no GPS');
  assert.equal(file.size, file.data.length);
  assert.ok(file.size < input.length);
  const untouched = { data: Buffer.from(jpeg(false)), size: 0, mimetype: 'image/jpeg' };
  const before = untouched.data;
  cleanUploadedFile(untouched);
  assert.equal(untouched.data, before, 'clean files are not copied');
});

test('the Media collection cleans every upload before it is stored', () => {
  // Importing the collection loads Payload (minutes under tsx), so this guard reads the hook source instead.
  const src = readFileSync(new URL('../src/collections/Media.ts', import.meta.url), 'utf8');
  const hook = src.slice(src.indexOf('beforeOperation'), src.indexOf('beforeChange'));
  assert.match(hook, /mediaUploadProblem\(req\.file[\s\S]*cleanUploadedFile\(req\.file/, 'type/size check first, then metadata stripping, in beforeOperation');
});
