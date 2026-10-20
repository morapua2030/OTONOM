# Private GitHub + protected Vercel Preview — backup and restore plan

Status date: 2026-10-18.

## Sanitized pre-change snapshot

- Local snapshot: `D:\otonom-backups\otonom-pre-github-vercel-20261018.zip`
- Size: 476,560,394 bytes.
- SHA-256: `B360EA9D8087D8D3F414C6C233DE4F052FCB09A865887CEFB0B1B429B6297F34`
- Excluded: `.git`, dependency/build output, `.env*`, local secret/token paths, database files/dumps, uploads/media, test evidence, and bundled PostgreSQL tools.
- The snapshot remains local and has not been uploaded.

## Independent-copy plan

1. Copy the snapshot to an owner-approved encrypted removable drive or private encrypted backup destination that is independent of GitHub and Vercel.
2. Recompute SHA-256 at the destination and compare with the value above.
3. Record destination custody and retention without placing credentials or confidential paths in the repository.
4. Do not upload this archive to GitHub, Vercel, or an unapproved file service.

## Restore drill

1. Restore into a new empty directory, never over `D:\otonom`.
2. Verify the SHA-256 before extraction.
3. Inspect the restored tree for expected source and documentation; supply secrets separately from an approved secure store.
4. Install dependencies from lockfiles, configure a disposable synthetic database, and run the documented local regression suite.
5. Switch work only after verification; preserve the existing project until the restored copy is confirmed.

Database backups are separate from this source snapshot. No local development database or customer data is authorized for cloud transfer.
