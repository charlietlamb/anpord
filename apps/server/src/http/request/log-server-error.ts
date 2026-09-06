const SERVER_ERROR = 500;

const describe = (cause: unknown) =>
  cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);

/* The platform discards the cause behind a bare 500; both APIs route through here, so this is the only place that sees them. */
export const withServerErrorLog = async (
  request: Request,
  respond: () => Promise<Response>
): Promise<Response> => {
  const { pathname } = new URL(request.url);

  try {
    const response = await respond();

    if (response.status >= SERVER_ERROR) {
      console.error(`${request.method} ${pathname} -> ${response.status}`);
    }

    return response;
  } catch (cause) {
    console.error(`${request.method} ${pathname} threw`, describe(cause));
    throw cause;
  }
};
