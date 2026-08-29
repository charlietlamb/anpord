import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { Repository, SourceControlAccount } from "../domain/codebase";
import { BadRequest, InternalError } from "../domain/errors";
import { Authentication } from "./authentication";

export class CodebaseGroup extends HttpApiGroup.make("codebase")
  .add(
    /* Null rather than 404 for a member who has not connected: having no
       account is the ordinary first state, not a missing resource. */
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
    /* The address of GitHub's own install screen, minted here because it
       carries state the server has to recognise on the way back. */
    HttpApiEndpoint.get("installUrl", "/evals/codebase/install").addSuccess(
      Schema.Struct({ url: Schema.String })
    )
  )
  .add(
    HttpApiEndpoint.post("connect", "/evals/codebase/connect")
      /* Optional: GitHub redirects an install to the app's callback, which
         is the sign-in route and keeps no query string of ours, so the page
         usually arrives back with nothing to report and the server finds the
         installation itself. */
      .setPayload(
        Schema.Struct({ installationId: Schema.optional(Schema.Number) })
      )
      .addSuccess(SourceControlAccount)
  )
  .add(
    HttpApiEndpoint.del("disconnect", "/evals/codebase/connect").addSuccess(
      Schema.Void
    )
  )
  .addError(BadRequest)
  .addError(InternalError)
  .middleware(Authentication) {}
