const SERVER_ERROR = 500;

const describe = (cause: unknown) =>
  cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);

/**
 * The platform encodes a defect as a bare 500 and discards the cause, so a
 * failed write leaves no trace anywhere. Both APIs are routed through here,
 * which makes this the one place that sees every response either produces.
 */
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
