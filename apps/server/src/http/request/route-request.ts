import type { AuthInstance } from "@anpord/auth";
import { isAuthRoute } from "./auth-route";
import { withAuthenticateChallenge } from "./authenticate-challenge";
import { isAuthorizeRoute, withConsentPrompt } from "./consent-route";
import { isDiscoveryRoute, toAuthRequest } from "./discovery-route";
import { publicOrigin } from "./public-origin";
import { isPublicRoute } from "./public-route";

interface WebHandler {
  readonly handler: (request: Request) => Promise<Response>;
}

interface RouteTargets {
  readonly auth: AuthInstance;
  readonly internalApi: WebHandler;
  readonly publicApi: WebHandler;
}

export const routeRequest =
  ({ auth, internalApi, publicApi }: RouteTargets) =>
  (request: Request) => {
    const { pathname } = new URL(request.url);

    if (isDiscoveryRoute(pathname)) {
      return auth.handler(toAuthRequest(request));
    }

    if (isAuthorizeRoute(pathname)) {
      return auth.handler(withConsentPrompt(request));
    }

    if (isAuthRoute(pathname)) {
      return auth.handler(request);
    }

    if (isPublicRoute(pathname)) {
      return publicApi
        .handler(request)
        .then((response) =>
          withAuthenticateChallenge(response, publicOrigin(request))
        );
    }

    return internalApi.handler(request);
  };
