import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The workspace root, which is wherever the work is.
 *
 * There is no overview to show: the page said "Your workspace is ready" and
 * nothing else, and the sidebar no longer offers it. A landing route that
 * renders a sentence is a stop on the way to somewhere, so it sends the reader
 * to the somewhere instead.
 */
export const Route = createFileRoute("/_authed/")({
  beforeLoad: () => {
    throw redirect({ to: "/evals" });
  },
});
