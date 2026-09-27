export const callV1 = async <Body>(
  baseUrl: string,
  apiKey: string,
  endpoint: string,
  payload: unknown
): Promise<Body> => {
  const response = await fetch(`${baseUrl}/v1/${endpoint}`, {
    body: JSON.stringify(payload),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    method: "POST",
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${endpoint} answered ${response.status}: ${text}`);
  }
  return (text.length > 0 ? JSON.parse(text) : null) as Body;
};
