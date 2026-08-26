import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { Repository, SourceControlAccount } from "../domain/codebase";
import { InternalError } from "../domain/errors";
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
  .addError(InternalError)
  .middleware(Authentication) {}
