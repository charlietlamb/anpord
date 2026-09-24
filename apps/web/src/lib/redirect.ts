export function safeRedirect(value: string | undefined): string {
  if (!value) {
    return "/";
  }
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
