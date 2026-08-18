export interface ApiResponse<Body = unknown> {
  readonly body: Body;
  readonly status: number;
}

/**
 * Every public endpoint is a POST carrying JSON and a bearer key, so a caller
 * names the endpoint and the payload and nothing else. The body is parsed
 * leniently because a failure is allowed to answer with nothing, and a
 * scenario asserting on the status should not die on the parse.
 */
export const callApi = async <Body = unknown>(
  baseUrl: string,
  apiKey: string,
  endpoint: string,
  payload: unknown
): Promise<ApiResponse<Body>> => {
  const response = await fetch(`${baseUrl}/v1/${endpoint}`, {
    body: JSON.stringify(payload),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  const text = await response.text();

  return {
    body: (text.length > 0 ? JSON.parse(text) : null) as Body,
    status: response.status,
  };
};

/** Setup rather than assertion: a scenario that cannot build its fixture
 * should say so there, not fail later in a check about something else. */
export const callApiOrThrow = async <Body = unknown>(
  baseUrl: string,
  apiKey: string,
  endpoint: string,
  payload: unknown
): Promise<Body> => {
  const { body, status } = await callApi<Body>(
    baseUrl,
    apiKey,
    endpoint,
    payload
  );

  if (status !== 200) {
    throw new Error(`${endpoint} answered ${status}: ${JSON.stringify(body)}`);
  }

  return body;
};
