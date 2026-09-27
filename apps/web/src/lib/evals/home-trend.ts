import type { EvalHomeDay } from "@anpord/schema/domain/eval-home";

export type DailyRate = number | null;

const LOOKBACK = 3;
const DROP_POINTS = 5;
const AXIS_FLOOR = 60;
const AXIS_STEP = 20;

export const percentOf = (passed: number, scored: number) =>
  scored === 0 ? null : (passed / scored) * 100;

const sumOf = (days: readonly EvalHomeDay[]) =>
  days.reduce(
    (total, day) => ({
      passed: total.passed + day.passed,
      scored: total.scored + day.scored,
    }),
    { passed: 0, scored: 0 }
  );

export const dayAxis = (days: readonly EvalHomeDay[]) =>
  [...new Set(days.map((day) => day.day))].sort();

export const dailyRates = (
  axis: readonly string[],
  days: readonly EvalHomeDay[]
): DailyRate[] =>
  axis.map((day) => {
    const total = sumOf(days.filter((entry) => entry.day === day));
    return percentOf(total.passed, total.scored);
  });

export const rateDelta = (
  axis: readonly string[],
  days: readonly EvalHomeDay[]
) => {
  const opening = new Set(axis.slice(0, Math.ceil(axis.length / 3)));
  const whole = sumOf(days);
  const start = sumOf(days.filter((day) => opening.has(day.day)));
  const now = percentOf(whole.passed, whole.scored);
  const then = percentOf(start.passed, start.scored);
  return now === null || then === null ? null : Math.round(now - then);
};

const meanOf = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0) / values.length;

export const regressionIndex = (rates: readonly DailyRate[]) => {
  const found = rates.findIndex((rate, index) => {
    const before = rates
      .slice(Math.max(0, index - LOOKBACK), index)
      .filter((value): value is number => value !== null);
    const after = rates[index + 1];
    if (rate === null || before.length < LOOKBACK || after == null) {
      return false;
    }
    const mean = meanOf(before);
    return rate <= mean - DROP_POINTS && after < mean;
  });
  return found === -1 ? null : found;
};

export const axisFloor = (rates: readonly DailyRate[]) => {
  const lowest = Math.min(
    AXIS_FLOOR,
    ...rates.filter((rate): rate is number => rate !== null)
  );
  return Math.floor(lowest / AXIS_STEP) * AXIS_STEP;
};
