/**
 * Vercel Blob store identity, from the environment only (no server imports: the request proxy builds the CSP from it).
 */
const TOKEN = /^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i;

/** The Blob store id from the read/write token (same rule as the Payload adapter); null when absent or malformed. */
export function blobStoreId(env: NodeJS.ProcessEnv = process.env): string | null {
  return TOKEN.exec(env.BLOB_READ_WRITE_TOKEN?.trim() ?? '')?.[1]?.toLowerCase() ?? null;
}

/** Blob storage is used on Vercel when a token exists; locally only when explicitly asked for (never by accident). */
export function blobStorageEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return blobStoreId(env) !== null && (env.VERCEL === '1' || env.OTONOM_BLOB_STORAGE_LOCAL === '1');
}

/** The only extra image origin the CSP allows: this project's own public Blob store. */
export function blobImageOrigin(env: NodeJS.ProcessEnv = process.env): string | null {
  const id = blobStorageEnabled(env) ? blobStoreId(env) : null;
  return id ? `https://${id}.public.blob.vercel-storage.com` : null;
}
