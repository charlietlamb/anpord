import { PublicApi } from "@anpord/schema/public/api";
import { API_REFERENCE_URL } from "@anpord/schema/public/origins";
import { HttpApi } from "@effect/platform";

const PREFLIGHT = "OPTIONS";

const readPublicRoutes = () => {
  const routes = new Map<string, Set<string>>();

  HttpApi.reflect(PublicApi, {
    onEndpoint: ({ endpoint }) => {
      const methods = routes.get(endpoint.path) ?? new Set<string>();
      methods.add(endpoint.method);
      routes.set(endpoint.path, methods);
    },
    onGroup: () => undefined,
  });

  return routes;
};

const PUBLIC_ROUTES: ReadonlyMap<
  string,
  ReadonlySet<string>
> = readPublicRoutes();

const errorResponse = (
  status: number,
  body: { readonly _tag: string; readonly message: string },
  headers: Record<string, string> = {}
) =>
  new Response(JSON.stringify(body), {
    headers: {
      "access-control-allow-origin": "*",
      "content-type": "application/json",
      ...headers,
    },
    status,
  });

export const unknownRoute = (pathname: string) =>
  errorResponse(404, {
    _tag: "NotFound",
    message: `There is no route ${pathname}. See the API reference at ${API_REFERENCE_URL}`,
  });

export const publicRouteMiss = (request: Request): Response | undefined => {
  const { pathname } = new URL(request.url);
  const methods = PUBLIC_ROUTES.get(pathname);

  if (methods === undefined) {
    return unknownRoute(pathname);
  }

  if (request.method === PREFLIGHT || methods.has(request.method)) {
    return;
  }

  const allowed = [...methods].join(", ");

  return errorResponse(
    405,
    {
      _tag: "MethodNotAllowed",
      message: `Use ${allowed} for ${pathname}.`,
    },
    { allow: allowed }
  );
};
