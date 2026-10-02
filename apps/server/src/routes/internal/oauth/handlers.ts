import { HttpApiBuilder } from "@effect/platform";
import { OAuthClients } from "@sphynx/auth/oauth/oauth-clients";
import { SphynxApi } from "@sphynx/schema/internal/api";
import { Effect } from "effect";
import { withOAuthErrors } from "../../../http/oauth-errors";

export const OAuthHandlers = HttpApiBuilder.group(
  SphynxApi,
  "oauth",
  (handlers) =>
    handlers.handle("client", ({ path }) =>
      OAuthClients.pipe(
        Effect.flatMap((clients) => clients.name(path.clientId)),
        Effect.map((name) => ({ name })),
        withOAuthErrors
      )
    )
);
