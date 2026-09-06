export const percent = (rate: number) => `${Math.round(rate * 100)}%`;

/* Agent runs span a tenth of a cent to a few dollars, so precision varies with scale rather than being fixed. */
export const dollars = (value: number) => {
  if (value === 0) {
    return "$0";
  }

  if (value < 0.01) {
    return `$${value.toFixed(4)}`;
  }

  return value < 1 ? `$${value.toFixed(3)}` : `$${value.toFixed(2)}`;
};

export const tokens = (value: number) => {
  if (value < 1000) {
    return String(value);
  }

  return value < 1_000_000
    ? `${Math.round(value / 100) / 10}k`
    : `${Math.round(value / 100_000) / 10}M`;
};
