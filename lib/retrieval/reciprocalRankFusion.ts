export function reciprocalRankFusion<T extends { id: string }>(
  rankedLists: T[][],
  k = 60,
): (T & { rrfScore: number })[] {
  const scores = new Map<string, number>();
  const items = new Map<string, T>();
  for (const list of rankedLists) {
    list.forEach((item, i) => {
      scores.set(item.id, (scores.get(item.id) ?? 0) + 1 / (k + i + 1));
      if (!items.has(item.id)) items.set(item.id, item);
    });
  }
  return [...items.values()]
    .map((item) => ({ ...item, rrfScore: scores.get(item.id)! }))
    .sort((a, b) => b.rrfScore - a.rrfScore);
}
