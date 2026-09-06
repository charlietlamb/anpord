import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { Repository, SourceControlAccount } from "../domain/codebase";
import { BadRequest, InternalError } from "../domain/errors";
import { Authentication } from "./authentication";

export class CodebaseGroup extends HttpApiGroup.make("codebase")
  .add(
    /* Null rather than 404: having no account is the ordinary first state. */
    HttpApiEndpoint.get("account", "/evals/codebase/account").addSuccess(
      Schema.NullOr(SourceControlAccount)
    )
  )
  .add(
    HttpApiEndpoint.get(
      "repositories",
      "/evals/codebase/repositories"
    ).addSuccess(Schema.Array(Repository))
  )
  .add(
    /* Minted here because it carries state the server must recognise on the way back. */
    HttpApiEndpoint.get("installUrl", "/evals/codebase/install").addSuccess(
      Schema.Struct({ url: Schema.String })
    )
  )
  .add(
    HttpApiEndpoint.post("connect", "/evals/codebase/connect")
      /* Optional: GitHub redirects to the sign-in callback keeping no query string of ours, so the server usually finds the installation itself. */
      .setPayload(
        Schema.Struct({ installationId: Schema.optional(Schema.Number) })
      )
      /* Null where the app is installed nowhere, which is a step rather than a failure. */
      .addSuccess(Schema.NullOr(SourceControlAccount))
  )
  .add(
    HttpApiEndpoint.del("disconnect", "/evals/codebase/connect").addSuccess(
      Schema.Void
    )
  )
  .addError(BadRequest)
  .addError(InternalError)
  .middleware(Authentication) {}
