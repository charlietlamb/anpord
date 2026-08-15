/**
 * Constrains a `?redirect=` value to a path on this origin. A protocol-relative
 * value like `//example.com` is a valid URL to the browser, so rejecting it
 * explicitly is what stops the parameter becoming an open redirect.
 */
export function safeRedirect(value: string | undefined): string {
  if (!value) {
    return "/";
  }
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
