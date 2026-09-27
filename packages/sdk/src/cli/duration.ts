const SECOND = 1000;
const TENTH = 100;
const MINUTE = 60;

export const formatDuration = (ms: number) => {
  const whole = Math.round(ms);

  if (whole < SECOND) {
    return `${whole}ms`;
  }

  const tenths = Math.round(ms / TENTH) / 10;

  if (tenths < MINUTE) {
    return `${tenths.toFixed(1)}s`;
  }

  const seconds = Math.round(ms / SECOND);

  return `${Math.floor(seconds / MINUTE)}m${String(seconds % MINUTE).padStart(2, "0")}s`;
};
