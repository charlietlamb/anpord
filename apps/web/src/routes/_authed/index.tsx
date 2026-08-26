import { createFileRoute, redirect } from "@tanstack/react-router";
import { Landing } from "@/components/landing/landing";

/**
 * The site root, which means two different things.
 *
 * Signed in, there is no overview worth showing -- the page said "Your
 * workspace is ready" and nothing else -- so it sends the reader to the work.
 *
 * Signed out, this is the front door. It redirected there too, which sent
 * anyone arriving cold to a page they could not read: a crawler following
 * `/` reached the dashboard shell and saw a few hundred characters of it,
 * rather than the landing page that describes the product.
 */
export const Route = createFileRoute("/_authed/")({
  beforeLoad: ({ context }) => {
    if (context.authenticated) {
      throw redirect({ to: "/evals" });
    }
  },
  component: Landing,
});
