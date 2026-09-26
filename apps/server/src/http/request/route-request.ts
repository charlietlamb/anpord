import type { AuthInstance } from "@anpord/auth";
import { isAuthRoute } from "./auth-route";
import { withAuthenticateChallenge } from "./authenticate-challenge";
import { isAuthorizeRoute, withConsentPrompt } from "./consent-route";
import { isDiscoveryRoute, toAuthRequest } from "./discovery-route";
import { isInternalRoute } from "./internal-route";
import { withServerErrorLog } from "./log-server-error";
import { publicOrigin } from "./public-origin";
import { isPublicRoute } from "./public-route";
import { publicRouteMiss, unknownRoute } from "./route-miss";
import { isSameOrigin } from "./same-origin";
import { withServerTiming } from "./server-timing";

interface WebHandler {
  readonly handler: (request: Request) => Promise<Response>;
}

interface RouteTargets {
  readonly auth: AuthInstance;
  readonly internalApi: WebHandler;
  readonly publicApi: WebHandler;
  readonly trustedOrigins: readonly string[];
}

const crossSite = () =>
  new Response(
    JSON.stringify({
      _tag: "Forbidden",
      message: "This request did not come from a trusted origin.",
    }),
    { status: 403, headers: { "content-type": "application/json" } }
  );

const routePublic = (publicApi: WebHandler, request: Request) => {
  const miss = publicRouteMiss(request);

  if (miss !== undefined) {
    return Promise.resolve(miss);
  }

  return publicApi
    .handler(request)
    .then((response) =>
      withAuthenticateChallenge(response, publicOrigin(request))
    );
};

const routeInternal = (
  internalApi: WebHandler,
  request: Request,
  trustedOrigins: readonly string[]
) => {
  const { pathname } = new URL(request.url);

  if (!isInternalRoute(pathname)) {
    return Promise.resolve(unknownRoute(pathname));
  }

  if (!isSameOrigin(request, trustedOrigins)) {
    return Promise.resolve(crossSite());
  }

  return internalApi.handler(request);
};

export const routeRequest =
  ({ auth, internalApi, publicApi, trustedOrigins }: RouteTargets) =>
  (request: Request) =>
    withServerTiming(() =>
      withServerErrorLog(request, () => {
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
          return routePublic(publicApi, request);
        }

        return routeInternal(internalApi, request, trustedOrigins);
      })
    );
