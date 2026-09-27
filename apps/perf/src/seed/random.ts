export interface Random {
  readonly between: (low: number, high: number) => number;
  readonly chance: (probability: number) => boolean;
  readonly pick: <T>(items: readonly T[]) => T;
}

const MODULUS = 2_147_483_647;
const MULTIPLIER = 48_271;

export const seeded = (seed: number): Random => {
  let state = (Math.abs(Math.trunc(seed)) % (MODULUS - 1)) + 1;
  const next = () => {
    state = (state * MULTIPLIER) % MODULUS;
    return (state - 1) / (MODULUS - 1);
  };
  return {
    between: (low, high) => low + Math.floor(next() * (high - low + 1)),
    chance: (probability) => next() < probability,
    pick: <T>(items: readonly T[]) =>
      items[Math.floor(next() * items.length)] as T,
  };
};
