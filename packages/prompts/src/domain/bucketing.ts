/** biome-ignore-all lint/suspicious/noBitwiseOperators: a hash is bitwise arithmetic */
const OFFSET_BASIS = 0x81_1c_9d_c5;
const PRIME = 0x01_00_01_93;

const BUCKETS = 10_000;

const fnv1a = (value: string): number => {
  let hash = OFFSET_BASIS;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, PRIME) >>> 0;
  }
  return hash >>> 0;
};

/* Hashed twice: FNV is not independent across seeds, so a single pass
   correlates concurrent rollouts (Kohavi et al. 2009, DMKD 18(1) §5.1.2). */
export const bucketOf = (salt: string, unit: string): number =>
  fnv1a(String(fnv1a(salt + unit))) % BUCKETS;

/* The bucket does not depend on the percent, so widening a gate only admits
   units and never moves one already inside. */
export const withinGate = (
  salt: string,
  unit: string,
  percent: number
): boolean => bucketOf(salt, unit) < percent * (BUCKETS / 100);
