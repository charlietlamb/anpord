export type CallV1 = <Body = unknown>(
  endpoint: string,
  payload: unknown
) => Promise<Body>;

export const v1Client =
  (baseUrl: string, apiKey: string): CallV1 =>
  async <Body>(endpoint: string, payload: unknown) => {
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
