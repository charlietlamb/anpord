export class MissingApiKey extends Error {
  readonly name = "MissingApiKey";

  constructor() {
    super(
      "No API key. Pass { apiKey } to the Anpord constructor or set ANPORD_API_KEY."
    );
  }
}

export class AnpordError extends Error {
  readonly name = "AnpordError";
  readonly status: number | undefined;
  readonly cause: unknown;

  constructor(message: string, options: { cause: unknown; status?: number }) {
    super(message);
    this.cause = options.cause;
    this.status = options.status;
  }
}

const statusOf = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return;
  }
  const tag = (error as { _tag?: unknown })._tag;
  switch (tag) {
    case "BadRequest":
      return 400;
    case "Unauthorized":
      return 401;
    case "NotFound":
      return 404;
    case "Conflict":
      return 409;
    default:
      return;
  }
};

const messageOf = (error: unknown) => {
  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
    const tag = (error as { _tag?: unknown })._tag;
    if (typeof tag === "string") {
      return tag;
    }
  }
  return "The request failed.";
};

export const asAnpordError = (error: unknown) =>
  error instanceof AnpordError
    ? error
    : new AnpordError(messageOf(error), {
        cause: error,
        status: statusOf(error),
      });
