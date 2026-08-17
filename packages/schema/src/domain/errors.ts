import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export class NotFound extends Schema.TaggedError<NotFound>()(
  "NotFound",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 404 })
) {}

export class Conflict extends Schema.TaggedError<Conflict>()(
  "Conflict",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 409 })
) {}

export class BadRequest extends Schema.TaggedError<BadRequest>()(
  "BadRequest",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 400 })
) {}

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 401 })
) {}

/** Distinct from Unauthorized: the caller is who they say they are, and the
 * answer is still no. Signing in again cannot help, so the client must not
 * treat this as an expired session. */
export class Forbidden extends Schema.TaggedError<Forbidden>()(
  "Forbidden",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 403 })
) {}

export class InternalError extends Schema.TaggedError<InternalError>()(
  "InternalError",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 500 })
) {}
