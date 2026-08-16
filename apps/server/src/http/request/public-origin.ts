export const publicOrigin = (request: Request) => {
  const url = new URL(request.url);
  const forwardedProtocol = request.headers.get("x-forwarded-proto");

  if (forwardedProtocol) {
    url.protocol = `${forwardedProtocol.split(",")[0].trim()}:`;
  }

  return url.origin;
};
