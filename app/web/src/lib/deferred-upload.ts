import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { del } from '@vercel/blob';
import type { CollectionAfterChangeHook, CollectionSlug, Plugin } from 'payload';
import { afterCommit, installAfterCommit } from './after-commit.ts';
import { blobImageOrigin } from './blob-origin.ts';

/**
 * A new Blob object name: the uploaded name plus a random suffix. It is chosen inside the save, so the record holds the
 * final name before anything is uploaded, and a failed upload can be cleaned up by name. Unique names also keep the
 * 30-day Blob CDN cache from ever serving an old file under a reused name.
 */
export function blobFileName(filename: string): string {
  const ext = path.extname(filename);
  return `${filename.slice(0, filename.length - ext.length)}-${randomBytes(6).toString('hex')}${ext}`;
}

/** File fields put back when a replacement upload fails, so the record points at its previous, existing object. */
const FILE_FIELDS = ['filename', 'mimeType', 'filesize', 'width', 'height', 'focalX', 'focalY'] as const;

/**
 * Runs a storage plugin's upload hooks for one collection AFTER the save's transaction has committed (audit
 * 2026-11-18, X-05). The plugin uploads in afterChange, which Payload runs inside the transaction, so a slow upload
 * held a pool connection for its whole duration. The plugin's own logic is unchanged; only its timing moves:
 * - a rolled-back save uploads nothing (the queued upload is dropped);
 * - if the upload or the plugin's follow-up write fails, the object is deleted and the record is undone (a new record
 *   is removed, a replaced file is put back), and the error still reaches the caller.
 */
export function uploadAfterCommit(plugin: Plugin, slug: CollectionSlug): Plugin {
  return async (incoming) => {
    const before = incoming.collections?.find((c) => c.slug === slug)?.hooks?.afterChange?.length ?? 0;
    const config = await plugin(incoming);
    const collection = config.collections?.find((c) => c.slug === slug);
    const hooks = collection?.hooks?.afterChange ?? [];
    if (collection && hooks.length > before) {
      collection.hooks = { ...collection.hooks, afterChange: [...hooks.slice(0, before), ...hooks.slice(before).map((hook) => deferred(hook, slug))] };
    }
    const onInit = config.onInit;
    return {
      ...config,
      onInit: async (payload) => {
        installAfterCommit(payload);
        await onInit?.(payload);
      },
    };
  };
}

function deferred(hook: CollectionAfterChangeHook, slug: CollectionSlug): CollectionAfterChangeHook {
  return async (args) => {
    const { req, doc } = args;
    if (!req.file) return hook(args); // no new file: nothing is uploaded, the plugin runs as before
    await afterCommit(req, async () => {
      // The save is committed; what the plugin writes next starts its own short transaction.
      delete (req as { transactionID?: unknown }).transactionID;
      try {
        await hook(args);
      } catch (error) {
        await undoFailedUpload(args, slug);
        throw error;
      }
    });
    return doc;
  };
}

async function undoFailedUpload({ req, doc, previousDoc, operation }: Parameters<CollectionAfterChangeHook>[0], slug: CollectionSlug) {
  const log = (step: string) => (e: unknown) => req.payload.logger.error({ err: e, msg: `[upload] cleanup after a failed upload: ${step} failed for ${slug} ${doc.id}` });
  const origin = blobImageOrigin();
  if (origin && typeof doc.filename === 'string') await del(`${origin}/${doc.filename}`, { token: process.env.BLOB_READ_WRITE_TOKEN!.trim() }).catch(log('object delete'));
  delete (req as { transactionID?: unknown }).transactionID;
  if (operation === 'create') {
    await req.payload.delete({ collection: slug, id: doc.id, overrideAccess: true, req, context: { skipCloudStorage: true } }).catch(log('record delete'));
  } else if (previousDoc) {
    const data = Object.fromEntries(FILE_FIELDS.map((f) => [f, previousDoc[f] ?? null]));
    await req.payload.update({ collection: slug, id: doc.id, data, overrideAccess: true, req, context: { skipCloudStorage: true, fileRevert: true } }).catch(log('record revert'));
  }
}
