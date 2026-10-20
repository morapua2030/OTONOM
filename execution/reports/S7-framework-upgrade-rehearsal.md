# B-43 — controlled framework upgrade rehearsal plan

Status: **OPEN; plan only**. No package download or version change occurred in S7.

1. Obtain owner approval for network advisory/package access and exact Next/Payload target versions.
2. Create a verified database backup and restore it to a disposable upgrade DB; never point at `otonom_dev` for rehearsal writes.
3. Record current lockfile/package metadata, Payload migration table, checksums, counts and invariants.
4. Upgrade in an isolated local copy, run Payload migrations forward-only, then 1430+ regression including surface, CSP and real Edge.
5. Compare schema/row counts, access matrix, generated APIs, admin import map, CSP/hydration and performance.
6. Rehearse rollback by restoring the pre-upgrade dump into another disposable DB, not by reverse migration.
7. Approve or reject with exact incompatibilities. B-43 closes only after a successful controlled rehearsal.

