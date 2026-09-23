const SECOND = 1000;
const MINUTE = 60;

export const formatDuration = (ms: number) => {
  if (ms < SECOND) {
    return `${Math.round(ms)}ms`;
  }

  const seconds = ms / SECOND;

  return seconds < MINUTE
    ? `${seconds.toFixed(1)}s`
    : `${Math.floor(seconds / MINUTE)}m${String(Math.round(seconds % MINUTE)).padStart(2, "0")}s`;
};
