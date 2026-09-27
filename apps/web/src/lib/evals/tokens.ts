export const percent = (rate: number) => `${Math.round(rate * 100)}%`;

export const dollars = (value: number) => {
  if (value === 0) {
    return "$0";
  }

  if (value < 0.01) {
    return `$${value.toFixed(4)}`;
  }

  return value < 1 ? `$${value.toFixed(3)}` : `$${value.toFixed(2)}`;
};
