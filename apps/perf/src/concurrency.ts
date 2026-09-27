export const mapLimit = async <Item, Out>(
  items: readonly Item[],
  limit: number,
  run: (item: Item, index: number) => Promise<Out>
): Promise<readonly Out[]> => {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(
      `mapLimit needs a positive whole number limit, not ${limit}.`
    );
  }
  const results = new Array<Out>(items.length);
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && next < items.length) {
      const index = next;
      next += 1;
      try {
        results[index] = await run(items[index] as Item, index);
      } catch (cause) {
        failed = true;
        throw cause;
      }
    }
  };
  const settled = await Promise.allSettled(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  const rejected = settled.find(
    (each): each is PromiseRejectedResult => each.status === "rejected"
  );
  if (rejected !== undefined) {
    throw rejected.reason;
  }
  return results;
};
