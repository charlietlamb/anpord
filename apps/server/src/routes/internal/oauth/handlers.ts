import { OAuthClients } from "@anpord/auth/oauth/oauth-clients";
import { AnpordApi } from "@anpord/schema/internal/api";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { withOAuthErrors } from "../../../http/oauth-errors";

export const OAuthHandlers = HttpApiBuilder.group(
  AnpordApi,
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
