import type { Payload, PayloadRequest } from 'payload';

/**
 * Work that must run only after the request's database transaction has COMMITTED, when its pool connection is back
 * in the pool (audit 2026-11-18, X-05: a Blob upload inside the create transaction held a connection for the whole
 * upload, the same class of problem as the 2026-11-15 pool deadlock). Without a transaction the task runs at once.
 * A rollback drops the queued tasks, so nothing runs for a write that did not happen.
 */
type Task = () => Promise<void>;
const pending = new Map<string | number, Task[]>();
/** Until the adapter hook is installed (payload onInit), work runs at once: it must never wait for a commit nobody reports. */
let installed = false;

type TransactionId = string | number | Promise<string | number | null | undefined> | null | undefined;
const resolveId = async (id: TransactionId) => (id instanceof Promise ? await id : id) ?? undefined;

export async function afterCommit(req: PayloadRequest, task: Task): Promise<void> {
  const id = await resolveId(req.transactionID as TransactionId);
  if (!installed || id === undefined) return task();
  pending.set(id, [...(pending.get(id) ?? []), task]);
}

type TransactionAdapter = {
  commitTransaction: (id: TransactionId) => Promise<void>;
  rollbackTransaction: (id: TransactionId) => Promise<void>;
  __otonomAfterCommit?: boolean;
};

/** Hooks the database adapter once (payload onInit): queued tasks run right after the real COMMIT. */
export function installAfterCommit(payload: Payload): void {
  const db = payload.db as unknown as TransactionAdapter;
  installed = true;
  if (db.__otonomAfterCommit) return;
  db.__otonomAfterCommit = true;
  const commit = db.commitTransaction.bind(db);
  const rollback = db.rollbackTransaction.bind(db);
  db.commitTransaction = async (id) => {
    const key = await resolveId(id);
    await commit(id);
    const tasks = key === undefined ? [] : pending.get(key) ?? [];
    if (key !== undefined) pending.delete(key);
    for (const task of tasks) await task();
  };
  db.rollbackTransaction = async (id) => {
    const key = await resolveId(id);
    if (key !== undefined) pending.delete(key);
    return rollback(id);
  };
}

/** For tests: how many transactions still have queued work. */
export const pendingAfterCommit = () => pending.size;
