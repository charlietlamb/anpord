/* `//example.com` is a valid URL to the browser, so it must be rejected to avoid an open redirect. */
export function safeRedirect(value: string | undefined): string {
  if (!value) {
    return "/";
  }
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
