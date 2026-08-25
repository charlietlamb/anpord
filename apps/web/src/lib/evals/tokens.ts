/** A rate as whole percent. Rounded, because a cache hit of 91.7% and one of
 * 92% are the same fact to a reader comparing two runs. */
export const percent = (rate: number) => `${Math.round(rate * 100)}%`;

/**
 * A cost in dollars.
 *
 * Agent runs land between a tenth of a cent and a few dollars, so a fixed
 * precision either buries the cheap ones in zeroes or gives the dear ones a
 * false exactness. Sub-cent costs keep enough digits to stay distinct from
 * zero; anything above a dollar rounds to cents, which is as fine as a
 * comparison at that scale is read.
 */
export const dollars = (value: number) => {
  if (value === 0) {
    return "$0";
  }

  if (value < 0.01) {
    return `$${value.toFixed(4)}`;
  }

  return value < 1 ? `$${value.toFixed(3)}` : `$${value.toFixed(2)}`;
};

/**
 * Tokens, shortened.
 *
 * A trajectory row has no space for `106,457`, and at a glance the leading
 * digits are what a reader compares. The full figure stays in the tooltip.
 */
export const tokens = (value: number) => {
  if (value < 1000) {
    return String(value);
  }

  return value < 1_000_000
    ? `${Math.round(value / 100) / 10}k`
    : `${Math.round(value / 100_000) / 10}M`;
};
