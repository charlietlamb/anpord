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

/**
 * Which of ten thousand buckets a unit falls into for a given salt.
 *
 * Hashed twice. A single pass correlates across concurrent rollouts — two
 * rollouts at 50% put measurably more than a quarter of units in both, because
 * FNV is not independent across seeds (Kohavi et al. 2009, DMKD 18(1) §5.1.2).
 * Each pass looks uniform on its own, which is what makes the single-pass
 * version dangerous: it reads as correct until a second rollout starts.
 *
 * Ten thousand rather than a hundred so a rollout can move by fractions of a
 * percent without re-basing, which would move every unit above the change.
 */
export const bucketOf = (salt: string, unit: string): number =>
  fnv1a(String(fnv1a(salt + unit))) % BUCKETS;

/** Whether a unit is inside a gate of the given percent. Widening the gate can
 * only admit units, never move one already inside it, because the bucket does
 * not depend on the percent. */
export const withinGate = (
  salt: string,
  unit: string,
  percent: number
): boolean => bucketOf(salt, unit) < percent * (BUCKETS / 100);
