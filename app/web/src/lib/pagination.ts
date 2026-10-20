export type PageResult<T> = {
  docs: T[];
  hasNextPage?: boolean;
  nextPage?: number | null;
};

/** Collect a Payload result without relying on a large, truncating one-shot limit. */
export async function collectPages<T>(
  load: (page: number, limit: number) => Promise<PageResult<T>>,
  pageSize = 250,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error('INVALID_PAGE_SIZE');
  const docs: T[] = [];
  let page = 1;
  for (;;) {
    const result = await load(page, pageSize);
    docs.push(...result.docs);
    if (!result.hasNextPage) return docs;
    const next = result.nextPage ?? page + 1;
    if (!Number.isInteger(next) || next <= page) throw new Error('INVALID_NEXT_PAGE');
    page = next;
  }
}

export function chunksOf<T>(items: readonly T[], size = 500): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new Error('INVALID_CHUNK_SIZE');
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
