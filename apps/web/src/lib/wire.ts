/* The server already validated these bytes against the same schema, so the
   browser decoded only to rebuild what DateTimeUtc transformed. */

interface WireTime {
  readonly epochMillis: number;
}

const timeOf = (value: string): WireTime => ({
  epochMillis: Date.parse(value),
});

const ISO =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/* Walks the payload once, replacing ISO strings with the shape the UI reads.
   Nothing else is touched, so an unknown field passes through as it arrived. */
const revive = (value: unknown): unknown => {
  if (typeof value === "string") {
    return ISO.test(value) ? timeOf(value) : value;
  }

  if (Array.isArray(value)) {
    return value.map(revive);
  }

  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};

    for (const [key, own] of Object.entries(value)) {
      out[key] = revive(own);
    }

    return out;
  }

  return value;
};

export const fromWire = <A>(payload: unknown): A => revive(payload) as A;

export const failureOf = async (response: Response, fallback: string) => {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;

  return new Error(body?.message ?? fallback);
};
