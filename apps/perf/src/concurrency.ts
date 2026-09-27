export const mapLimit = async <Item, Out>(
  items: readonly Item[],
  limit: number,
  run: (item: Item, index: number) => Promise<Out>
): Promise<readonly Out[]> => {
  const results = new Array<Out>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await run(items[index] as Item, index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
};
