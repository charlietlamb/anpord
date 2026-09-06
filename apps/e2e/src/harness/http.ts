export interface ApiResponse<Body = unknown> {
  readonly body: Body;
  readonly status: number;
}

/* The body is parsed leniently: a failure may answer with nothing, and a scenario asserting on the status should not die on the parse. */
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

/* Setup rather than assertion: a fixture that cannot be built should fail here, not in a later unrelated check. */
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
