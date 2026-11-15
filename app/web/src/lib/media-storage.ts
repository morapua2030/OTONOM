import { uploadsDisabled } from './server.ts';
import { blobStorageEnabled } from './blob-origin.ts';

export { blobImageOrigin, blobStorageEnabled, blobStoreId } from './blob-origin.ts';

/**
 * Where uploads live (owner 2026-11-15). Public-site images ("media") go to Vercel Blob on Vercel, so they survive
 * deployments; local disk is used only in development and tests. Private project files never go to Blob (its stores
 * are public by URL): they stay disabled on Vercel.
 */
/** Media uploads: off when switched off; on Vercel only with Blob storage (local disk does not survive there). */
export function mediaUploadsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (uploadsDisabled(env)) return false;
  return env.VERCEL !== '1' || blobStorageEnabled(env);
}

/** Private files: never on Vercel (no private storage there yet). */
export function privateUploadsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return !uploadsDisabled(env) && env.VERCEL !== '1';
}

/** Vercel functions accept request bodies up to 4.5 MB; 4 MB leaves room for the multipart envelope. */
export const MEDIA_MAX_BYTES = 4 * 1024 * 1024;
export const MEDIA_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** The real image type from the first bytes (PNG, JPEG, WebP); anything else, SVG included, is null. */
export function sniffImageType(data: Uint8Array | undefined | null): (typeof MEDIA_MIME_TYPES)[number] | null {
  if (!data || data.length < 12) return null;
  const b = data;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

/** Why an uploaded file is refused, or null when it is a real PNG/JPEG/WebP within the size limit. */
export function mediaUploadProblem(file: { data?: Uint8Array; size?: number; mimetype?: string } | undefined | null): 'TOO_LARGE' | 'TYPE' | null {
  if (!file) return null;
  const size = typeof file.size === 'number' ? file.size : file.data?.length ?? 0;
  if (size > MEDIA_MAX_BYTES) return 'TOO_LARGE';
  const sniffed = sniffImageType(file.data);
  if (!sniffed) return 'TYPE';
  if (file.mimetype && file.mimetype !== sniffed) return 'TYPE';
  return null;
}
