/** Deterministic PRNG so the synthetic dataset is reproducible (brief §53). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRandom(seed: number) {
  const r = mulberry32(seed);
  const int = (min: number, max: number) => Math.floor(r() * (max - min + 1)) + min;
  return {
    next: r,
    int,
    pick: <T>(arr: readonly T[]): T => arr[int(0, arr.length - 1)],
    picks: <T>(arr: readonly T[], n: number): T[] => {
      const pool = [...arr];
      const out: T[] = [];
      for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(int(0, pool.length - 1), 1)[0]);
      return out;
    },
    chance: (p: number) => r() < p,
    /** ISO date `daysAgo` before the fixed reference date, for stable output. */
    dateAgo: (daysAgo: number) =>
      new Date(Date.UTC(2026, 8, 3) - daysAgo * 86_400_000).toISOString(),
  };
}
