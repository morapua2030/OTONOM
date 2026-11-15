# Media storage (owner decision 2026-11-15)

## Where files live

| Collection | On Vercel | Locally (development, tests) |
| --- | --- | --- |
| `media` (public-site images) | Vercel Blob, via `@payloadcms/storage-vercel-blob` 3.90.2 | Local disk (`app/web/.media-uploads`) |
| `private-files` | Refused: Blob stores are public by URL, so there is no private storage yet | Local disk (`app/web/.private-uploads`) |

### When Blob is used

Blob is used only when two things are true:
1. `BLOB_READ_WRITE_TOKEN` is a valid token. Vercel adds it when a Blob store is connected to the project.
2. The code runs on Vercel (`VERCEL=1`). Locally, Blob is used only with `OTONOM_BLOB_STORAGE_LOCAL=1`, so a copied
   token is never used by accident.

On Vercel without a Blob store, media uploads are refused (`503 UPLOADS_DISABLED_IN_PREVIEW`). They never go to the
temporary disk. `OTONOM_DISABLE_UPLOADS=1` still switches every upload off.

### Schema

The plugin's columns (`prefix`, `_objectkey` on `media` and its versions) exist in every environment
(`alwaysInsertFields`). They come from the Payload migration `20261115_114957_media_blob_storage`. That migration is
additive and nullable, so an older deployment keeps working against the migrated database.

## Rules for every image

1. **Type and size:**
   - Only real PNG, JPEG and WebP files are accepted, checked by their first bytes.
   - SVG (also when renamed to `.png`) and any file whose declared type does not match its content get `415`.
   - Over 4 MB gets `413`. Vercel accepts request bodies up to 4.5 MB.
2. **Names:** each stored file gets a random suffix, so its address cannot be guessed.
3. **Approval:**
   - The public site shows an image only after a publisher approves it (`status = APPROVED`, Arabic and English alt text).
   - Photos of a client's property also need a valid PHOTOS consent and privacy screening.
   - Approving or withdrawing an image refreshes the public pages from the next request.
4. **EXIF:** not removed. The codebase has no image processing, and nothing strips metadata such as the GPS location.
   Strip it before upload (most phones: "remove location" when sharing) until this is decided.

## Public pages

- **Where:** an approved image set as **Site content → Controllers → Photo** replaces the built-in product photo on
  `/ar/products/<model>` and `/en/products/<model>`.
- **No photo:** with none set, or a draft, withdrawn or invalid one, the built-in photo stays.
- **Not yet shown:** package item photos (**Packages → items → photo**) are stored but not shown anywhere yet.

## Content Security Policy

`img-src` allows exactly one extra origin: this project's own Blob store,
`https://<store-id>.public.blob.vercel-storage.com`. The store id comes from the token at request time. No wildcard is
used, and no other directive changes.

## Switching it on (release)

1. Create one Blob store for the project (Hobby plan) and connect it to **Production**. This adds `BLOB_READ_WRITE_TOKEN`.
   Never print it.
2. Set `OTONOM_DISABLE_UPLOADS=0` in Production. A running deployment keeps the environment it was built with. The live
   site therefore changes only when a new deployment is promoted, and a rollback restores the old value.
3. Run the Payload migration (above) through the isolated-production procedure, after the backup.
4. On the staged deployment: upload an image, approve it, set it on a controller and check the product page. Promote
   only after that works.
